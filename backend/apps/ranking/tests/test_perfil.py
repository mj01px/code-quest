"""RF37: perfil público, aberto a partir do ranking e da lista de membros do clã."""

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.clas.models import Cla, TipoDeCla
from apps.clas.tests.helpers import montar_cla
from apps.conquistas.models import Conquista, ConquistaDesbloqueada
from apps.contas.tests.helpers import criar_aluno
from apps.gamificacao.services import select_starter_creature


def _rota(nickname):
    return reverse("ranking:perfil", kwargs={"nickname": nickname})


class PerfilPublicoTest(TestCase):
    def setUp(self):
        self.cliente = APIClient()
        self.cliente.force_authenticate(user=criar_aluno("visitante"))
        self.ana = criar_aluno("ana")

    def test_mostra_criatura_nivel_xp_e_so_as_conquistas_obtidas(self):
        select_starter_creature(user=self.ana, creature_slug="shellby")
        obtida, pendente = Conquista.objects.filter(ativa=True)[:2]
        ConquistaDesbloqueada.objects.create(user=self.ana, conquista=obtida)

        resposta = self.cliente.get(_rota("ANA"))  # nickname sem caixa

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data["nickname"], "ana")
        self.assertEqual(resposta.data["nivel"], 1)
        self.assertEqual(resposta.data["xp_total"], 0)
        self.assertIsNotNone(resposta.data["criatura"])
        self.assertEqual(
            [c["slug"] for c in resposta.data["conquistas"]], [obtida.slug]
        )
        self.assertNotIn("email", resposta.data)

    def test_sem_criatura_nivel_e_nulo(self):
        resposta = self.cliente.get(_rota("ana"))

        self.assertEqual(resposta.status_code, 200)
        self.assertIsNone(resposta.data["nivel"])
        self.assertIsNone(resposta.data["criatura"])

    def test_inexistente_inativo_e_anonimizado_dao_404(self):
        inativo = criar_aluno("inativo", is_active=False)
        anonimo = criar_aluno("anonimo")
        anonimo.anonimizar()

        self.assertEqual(self.cliente.get(_rota("ninguem")).status_code, 404)
        self.assertEqual(self.cliente.get(_rota(inativo.nickname)).status_code, 404)
        self.assertEqual(self.cliente.get(_rota(anonimo.nickname)).status_code, 404)

    def test_exige_login(self):
        self.assertEqual(APIClient().get(_rota("ana")).status_code, 401)


class PerfilCompletoTest(TestCase):
    def setUp(self):
        from apps.progressao.models import EtapaConcluida, TipoDeEtapa
        from apps.trilhas.tests.helpers import criar_aula, criar_trilha

        self.cliente = APIClient()
        self.cliente.force_authenticate(user=criar_aluno("visitante"))
        self.ana = criar_aluno("ana")
        select_starter_creature(user=self.ana, creature_slug="shellby")
        trilha = criar_trilha("logica")
        aula = criar_aula(trilha, "variaveis")
        criar_aula(trilha, "condicionais", ordem=2)
        EtapaConcluida.objects.create(user=self.ana, aula=aula, tipo=TipoDeEtapa.LEITURA)

    def test_traz_os_dados_da_vitrine(self):
        resposta = self.cliente.get(_rota("ana"))

        dados = resposta.data
        self.assertEqual(resposta.status_code, 200)
        self.assertIn("titulo_do_nivel", dados)
        self.assertIsNotNone(dados["membro_desde"])
        self.assertIsNone(dados["cla"])
        self.assertEqual(dados["sequencia_atual"], 0)
        self.assertEqual(
            dados["total_conquistas"],
            len(dados["conquistas"]) + len(dados["conquistas_bloqueadas"]),
        )
        self.assertEqual(
            dados["trilhas"], [{"slug": "logica", "nome": "Logica", "percentual": 50}]
        )

    def test_consultas_nao_crescem_com_as_trilhas(self):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext

        from apps.progressao.models import EtapaConcluida, TipoDeEtapa
        from apps.trilhas.tests.helpers import criar_aula, criar_trilha

        with CaptureQueriesContext(connection) as uma:
            self.cliente.get(_rota("ana"))
        for slug in ("python", "sql", "web"):
            aula = criar_aula(criar_trilha(slug), f"intro-{slug}")
            EtapaConcluida.objects.create(
                user=self.ana, aula=aula, tipo=TipoDeEtapa.LEITURA
            )
        with CaptureQueriesContext(connection) as quatro:
            dados = self.cliente.get(_rota("ana")).data

        self.assertEqual(len(dados["trilhas"]), 4)
        self.assertEqual(len(quatro), len(uma))

    def test_conquista_secreta_nao_revela_o_nome(self):
        secreta = Conquista.objects.filter(ativa=True).first()
        Conquista.objects.filter(pk=secreta.pk).update(oculta=True)

        resposta = self.cliente.get(_rota("ana"))

        bloqueada = next(c for c in resposta.data["conquistas_bloqueadas"] if c["oculta"])
        self.assertEqual(bloqueada["nome"], "???")
        self.assertEqual(bloqueada["icone"], "")
        # Nem o slug: ele já diz qual é a conquista (ex.: "de-primeira").
        self.assertIsNone(bloqueada["slug"])
        self.assertNotIn(secreta.nome, str(resposta.data))
        self.assertNotIn(f"'{secreta.slug}'", str(resposta.data))

    def test_cla_publico_aparece_e_privado_nao(self):
        cla = montar_cla(self.ana, nome="Cafe Forte")

        self.assertEqual(self.cliente.get(_rota("ana")).data["cla"], "Cafe Forte")

        Cla.objects.filter(pk=cla.pk).update(tipo=TipoDeCla.PRIVADO)
        dados = self.cliente.get(_rota("ana")).data
        self.assertIsNone(dados["cla"])
        self.assertNotIn("Cafe Forte", str(dados))
