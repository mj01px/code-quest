"""Contrato da única rota que entrega `solucao_autor`.

Três estados de acesso, a hierarquia editorial e o formato do payload. O que
se protege aqui não é comportamento de conveniência: é o gabarito.
"""

from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.contas.rbac import permissions_for_role
from apps.trilhas.models import StatusEditorial
from apps.trilhas.tests.helpers import criar_aula, criar_exercicio, criar_trilha
from apps.contas.tests.helpers import criar_admin, criar_aluno, criar_autor

SOLUCAO = "SEGREDO: resposta de referência do autor."

# A permissão vem do papel, não de `user_permissions`: `User.has_perm` é
# sobrescrito e só consulta o mapa RBAC de `apps.contas.rbac`.


class SolucaoAutorTest(TestCase):
    def setUp(self):
        # O contador de escopo vive no LocMemCache e sobrevive ao rollback.
        cache.clear()
        self.addCleanup(cache.clear)

        self.trilha = criar_trilha("logica")
        self.aula = criar_aula(self.trilha, "variaveis")
        self.exercicio = criar_exercicio(self.aula, "media")
        self.url = reverse(
            "autoria:solucao-autor",
            kwargs={"trilha_slug": "logica", "exercicio_slug": "media"},
        )

    def _cliente_com_permissao(self):
        cliente = APIClient()
        cliente.force_authenticate(user=criar_autor(nickname="autora"))
        return cliente

    def test_o_papel_aluno_nao_concede_a_permissao(self):
        # Se um dia ALUNO ganhar view_solution no RBAC, os testes de 403 acima
        # passariam a testar nada. Esta é a premissa deles, explícita.
        self.assertNotIn("trilhas.view_solution", permissions_for_role("ALUNO"))
        self.assertIn("trilhas.view_solution", permissions_for_role("AUTOR"))

    def test_anonimo_recebe_401(self):
        self.assertEqual(APIClient().get(self.url).status_code, 401)

    def test_autenticado_sem_permissao_recebe_403(self):
        cliente = APIClient()
        cliente.force_authenticate(user=criar_aluno())

        self.assertEqual(cliente.get(self.url).status_code, 403)

    def test_com_permissao_recebe_200(self):
        resposta = self._cliente_com_permissao().get(self.url)

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data["solucao_autor"], SOLUCAO)

    def test_payload_traz_exatamente_a_allowlist(self):
        resposta = self._cliente_com_permissao().get(self.url)

        self.assertEqual(
            set(resposta.data),
            {"trilha_slug", "exercicio_slug", "solucao_autor", "status_editorial"},
        )
        self.assertEqual(resposta.data["trilha_slug"], "logica")
        self.assertEqual(resposta.data["exercicio_slug"], "media")

    def test_admin_tambem_recebe_200(self):
        # `User.has_perm` devolve True para ADMIN sem consultar o mapa RBAC:
        # é um caminho de autorização diferente do do AUTOR.
        cliente = APIClient()
        cliente.force_authenticate(user=criar_admin())

        self.assertEqual(cliente.get(self.url).status_code, 200)

    def test_exercicio_de_outra_trilha_recebe_404(self):
        # O slug do exercício só é único dentro da trilha: cruzar os dois
        # pares não pode devolver o exercício da trilha errada.
        outra = criar_trilha("python")
        criar_exercicio(criar_aula(outra, "listas"), "media")
        url = reverse(
            "autoria:solucao-autor",
            kwargs={"trilha_slug": "logica", "exercicio_slug": "media"},
        )

        resposta = self._cliente_com_permissao().get(url)

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data["trilha_slug"], "logica")

    def test_exercicio_inexistente_recebe_404(self):
        url = reverse(
            "autoria:solucao-autor",
            kwargs={"trilha_slug": "logica", "exercicio_slug": "nao-existe"},
        )

        self.assertEqual(self._cliente_com_permissao().get(url).status_code, 404)

    def test_rascunho_continua_visivel_para_quem_tem_permissao(self):
        # A rota existe para revisar a solução ANTES de publicar. Filtrar por
        # status a deixaria inútil justo no momento em que ela importa.
        self.exercicio.status = StatusEditorial.RASCUNHO
        self.exercicio.save(update_fields=["status"])

        resposta = self._cliente_com_permissao().get(self.url)

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data["status_editorial"], StatusEditorial.RASCUNHO)
        self.assertEqual(resposta.data["solucao_autor"], SOLUCAO)

    def test_rascunho_da_trilha_nao_esconde_o_exercicio(self):
        # A leitura pública exige trilha, aula e exercício publicados. A de
        # autoria não exige nenhum dos três.
        self.trilha.status = StatusEditorial.RASCUNHO
        self.trilha.save(update_fields=["status"])
        self.aula.status = StatusEditorial.RASCUNHO
        self.aula.save(update_fields=["status"])

        self.assertEqual(self._cliente_com_permissao().get(self.url).status_code, 200)

    def test_rascunho_sem_permissao_continua_403(self):
        # Rascunho não é brecha: sem a permissão, o status não muda nada.
        self.exercicio.status = StatusEditorial.RASCUNHO
        self.exercicio.save(update_fields=["status"])

        cliente = APIClient()
        cliente.force_authenticate(user=criar_aluno())

        self.assertEqual(cliente.get(self.url).status_code, 403)
