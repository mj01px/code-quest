"""As rotas de progressão pela borda: autenticação, throttle e formato.

O que o serviço já garante não se repete aqui. O que se testa é o que só
aparece via HTTP: quem não está logado não passa, o XP não entra pelo corpo da
requisição, e a barra do front recebe os valores relativos que ela espera.
"""

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.gamificacao.services import select_starter_creature
from apps.contas.tests.helpers import SENHA_PADRAO, criar_aluno

from .test_credito_xp import criar_exercicio


class ApiProgressoTest(TestCase):
    def setUp(self):
        self.user = criar_aluno()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _concluir(self, exercicio):
        return self.client.post(
            reverse(
                "progressao:concluir-exercicio",
                kwargs={
                    "trilha_slug": exercicio.trilha.slug,
                    "exercicio_slug": exercicio.slug,
                },
            )
        )

    def test_progresso_exige_autenticacao(self):
        anonimo = APIClient()
        resposta = anonimo.get(reverse("progressao:meu-progresso"))
        self.assertEqual(resposta.status_code, 401)

    def test_sem_criatura_ativa_devolve_204(self):
        resposta = self.client.get(reverse("progressao:meu-progresso"))
        self.assertEqual(resposta.status_code, 204)

    def test_progresso_traz_valores_relativos_para_a_barra(self):
        select_starter_creature(user=self.user, creature_slug="shellby")
        self._concluir(criar_exercicio())

        resposta = self.client.get(reverse("progressao:meu-progresso"))
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data["xp_total"], 50)
        self.assertEqual(resposta.data["nivel"]["numero"], 1)
        self.assertEqual(resposta.data["xp_no_nivel"], 50)
        self.assertEqual(resposta.data["xp_para_o_proximo"], 100)

    def test_xp_no_corpo_da_requisicao_e_ignorado(self):
        select_starter_creature(user=self.user, creature_slug="shellby")
        exercicio = criar_exercicio()

        resposta = self.client.post(
            reverse(
                "progressao:concluir-exercicio",
                kwargs={
                    "trilha_slug": exercicio.trilha.slug,
                    "exercicio_slug": exercicio.slug,
                },
            ),
            {"xp": 999999, "xp_ganho": 999999, "nivel": 30},
            format="json",
        )

        self.assertEqual(resposta.data["xp_ganho"], 50)
        self.assertEqual(resposta.data["progresso"]["xp_total"], 50)

    def test_exercicio_em_rascunho_devolve_404(self):
        select_starter_creature(user=self.user, creature_slug="shellby")
        resposta = self._concluir(criar_exercicio(publicado=False))
        self.assertEqual(resposta.status_code, 404)

    def test_repetir_devolve_ja_concluido_e_nao_soma(self):
        select_starter_creature(user=self.user, creature_slug="shellby")
        exercicio = criar_exercicio()

        self._concluir(exercicio)
        segunda = self._concluir(exercicio)

        self.assertTrue(segunda.data["ja_concluido"])
        self.assertEqual(segunda.data["xp_ganho"], 0)
        self.assertEqual(segunda.data["progresso"]["xp_total"], 50)