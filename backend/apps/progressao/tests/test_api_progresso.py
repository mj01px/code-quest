"""As rotas de progressão pela borda: autenticação, throttle e formato.

O que o serviço já garante não se repete aqui. O que se testa é o que só
aparece via HTTP: quem não está logado não passa, o XP não entra pelo corpo da
requisição, e a barra do front recebe os valores relativos que ela espera.
"""

from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.gamificacao.services import select_starter_creature
from apps.progressao.models import EventoXP
from tests.helpers import criar_aluno

from .test_credito_xp import criar_exercicio


class ApiProgressoTest(TestCase):
    def setUp(self):
        # O contador do escopo `conclusao` vive no LocMemCache e sobrevive ao
        # rollback do TestCase. A fixture do conftest só existe sob pytest, e
        # esta suíte também roda por `manage.py test`.
        cache.clear()
        self.addCleanup(cache.clear)
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

    def test_concluir_exige_autenticacao(self):
        exercicio = criar_exercicio()
        anonimo = APIClient()

        resposta = anonimo.post(
            reverse(
                "progressao:concluir-exercicio",
                kwargs={
                    "trilha_slug": exercicio.trilha.slug,
                    "exercicio_slug": exercicio.slug,
                },
            )
        )

        self.assertEqual(resposta.status_code, 401)
        self.assertEqual(EventoXP.objects.count(), 0)

    def test_exercicio_inexistente_devolve_404(self):
        select_starter_creature(user=self.user, creature_slug="shellby")
        # Slug vindo do próprio exercício: com a trilha hardcoded, trocar o
        # helper faria o 404 passar a vir da trilha ausente e o teste ficaria
        # verde sem testar nada.
        exercicio = criar_exercicio()

        resposta = self.client.post(
            reverse(
                "progressao:concluir-exercicio",
                kwargs={
                    "trilha_slug": exercicio.trilha.slug,
                    "exercicio_slug": "nao-existe",
                },
            )
        )

        self.assertEqual(resposta.status_code, 404)

    def test_sem_criatura_ativa_devolve_400_e_nao_credita(self):
        resposta = self._concluir(criar_exercicio())

        self.assertEqual(resposta.status_code, 400)
        self.assertEqual(
            resposta.data["error"]["details"][0]["code"], "sem_criatura_ativa"
        )
        self.assertEqual(EventoXP.objects.count(), 0)

    def test_primeira_conclusao_marca_ja_concluido_como_falso(self):
        # O front usa esta bandeira para decidir se anuncia XP; ela precisa vir
        # falsa no crédito novo, senão o ganho some da tela.
        select_starter_creature(user=self.user, creature_slug="shellby")

        resposta = self._concluir(criar_exercicio())

        self.assertEqual(resposta.status_code, 200)
        # `assertIs` e não `assertFalse`: este campo é o discriminante da união
        # no TypeScript, onde false e null são coisas diferentes.
        self.assertIs(resposta.data["ja_concluido"], False)
        self.assertEqual(resposta.data["xp_ganho"], 50)
        self.assertEqual(resposta.data["progresso"]["xp_total"], 50)

    def test_resposta_da_conclusao_tem_o_shape_que_o_front_tipou(self):
        # A união discriminada do front é escrita sobre estas chaves. Renomear
        # campo aqui passaria verde sem isto e quebraria a tela em runtime.
        select_starter_creature(user=self.user, creature_slug="shellby")

        resposta = self._concluir(criar_exercicio())

        self.assertEqual(
            set(resposta.data),
            {"xp_ganho", "ja_concluido", "subiu_de_nivel", "evoluiu", "progresso"},
        )
