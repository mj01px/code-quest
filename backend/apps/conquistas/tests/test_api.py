from io import StringIO

from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.conquistas.models import ConquistaDesbloqueada
from apps.conquistas.services import NOME_OCULTO, avaliar
from apps.contas.tests.helpers import criar_aluno
from apps.progressao.models import EventoXP
from apps.progressao.tests.test_credito_xp import criar_exercicio

from .helpers import desbloqueadas, submeter


class ApiConquistasTest(TestCase):
    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)
        self.user = criar_aluno()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _listar(self):
        resposta = self.client.get(reverse("conquistas:minhas-conquistas"))
        self.assertEqual(resposta.status_code, 200)
        return resposta.data

    def _por_slug(self, dados):
        return {item["slug"]: item for item in dados if item["slug"]}

    def test_exige_autenticacao(self):
        anonimo = APIClient()
        self.assertEqual(
            anonimo.get(reverse("conquistas:minhas-conquistas")).status_code, 401
        )
        self.assertEqual(
            anonimo.post(reverse("conquistas:marcar-vistas")).status_code, 401
        )

    def test_lista_o_catalogo_inteiro_na_ordem(self):
        dados = self._listar()
        self.assertEqual(len(dados), 10)
        self.assertEqual(dados[0]["slug"], "ovo-chocado")
        self.assertTrue(all(not item["desbloqueada"] for item in dados))

    def test_oculta_bloqueada_nao_revela_nada(self):
        ocultas = [item for item in self._listar() if item["oculta"]]

        self.assertEqual(len(ocultas), 2)
        for item in ocultas:
            self.assertIsNone(item["slug"])
            self.assertEqual(item["nome"], NOME_OCULTO)
            self.assertIsNone(item["progresso"])
            self.assertIsNone(item["meta"])

    def test_oculta_desbloqueada_e_revelada(self):
        submeter(self.user, criar_exercicio())
        avaliar(self.user)

        item = self._por_slug(self._listar())["de-primeira"]
        self.assertEqual(item["nome"], "De Primeira!")
        self.assertTrue(item["desbloqueada"])
        self.assertIsNotNone(item["desbloqueada_em"])

    def test_progresso_parcial_das_metas(self):
        for i in range(3):
            EventoXP.objects.create(
                user=self.user, exercicio=criar_exercicio(slug=f"ex-{i}"), xp=50
            )

        item = self._por_slug(self._listar())["aquecendo-os-motores"]
        self.assertFalse(item["desbloqueada"])
        self.assertEqual(item["progresso"], 3)
        self.assertEqual(item["meta"], 5)

    def test_raridade_conta_alunos_ativos(self):
        outro = criar_aluno("outro")
        EventoXP.objects.create(user=outro, exercicio=criar_exercicio(), xp=50)
        avaliar(outro)

        dados = self._por_slug(self._listar())
        self.assertEqual(dados["hello-world"]["raridade"], 50.0)
        self.assertEqual(dados["ovo-chocado"]["raridade"], 0.0)

    def test_marcar_vistas(self):
        EventoXP.objects.create(user=self.user, exercicio=criar_exercicio(), xp=50)
        avaliar(self.user)
        self.assertFalse(self._por_slug(self._listar())["hello-world"]["vista"])

        resposta = self.client.post(reverse("conquistas:marcar-vistas"))

        self.assertEqual(resposta.status_code, 204)
        self.assertTrue(self._por_slug(self._listar())["hello-world"]["vista"])

    def test_marcar_vistas_nao_toca_outros_alunos(self):
        outro = criar_aluno("outro")
        EventoXP.objects.create(user=outro, exercicio=criar_exercicio(), xp=50)
        avaliar(outro)

        self.client.post(reverse("conquistas:marcar-vistas"))

        self.assertTrue(
            ConquistaDesbloqueada.objects.filter(
                user=outro, vista_em__isnull=True
            ).exists()
        )

    def test_comando_reavalia_retroativamente(self):
        EventoXP.objects.create(user=self.user, exercicio=criar_exercicio(), xp=50)
        saida = StringIO()

        call_command("reavaliar_conquistas", stdout=saida)

        self.assertIn("1 conquista(s)", saida.getvalue())
        self.assertEqual(desbloqueadas(self.user), {"hello-world"})
