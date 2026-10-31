from contextlib import redirect_stdout
from io import StringIO

from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.contas.tests.helpers import criar_aluno
from apps.gamificacao.services import select_starter_creature
from apps.progressao.models import EventoXP
from apps.trilhas.models import Exercicio, Tipo


class DemonstracaoPfcTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        with redirect_stdout(StringIO()):
            call_command("seed_trilhas")
            call_command("seed_correcao")
            call_command("seed_demo_pfc")
        cls.user = criar_aluno()
        select_starter_creature(user=cls.user, creature_slug="shellby")

    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def rota(self, trilha, exercicio):
        return reverse(
            "progressao:concluir-exercicio",
            kwargs={"trilha_slug": trilha, "exercicio_slug": exercicio},
        )

    def test_publica_nove_exercicios_e_corrige_todo_codigo(self):
        publicados = Exercicio.objects.publicados()
        self.assertEqual(publicados.count(), 9)
        self.assertEqual(publicados.filter(tipo=Tipo.CODIGO).count(), 2)
        self.assertEqual(publicados.filter(tipo=Tipo.ALTERNATIVA).count(), 5)
        self.assertEqual(publicados.filter(tipo=Tipo.FLASHCARD).count(), 2)
        self.assertFalse(
            publicados.filter(
                tipo=Tipo.CODIGO, especificacao_codigo__isnull=True
            ).exists()
        )

    def test_alternativas_publicas_nao_revelam_gabarito(self):
        resposta = self.client.get(
            reverse(
                "trilhas:exercicio-detalhe",
                kwargs={
                    "trilha_slug": "python",
                    "exercicio_slug": "string-imutavel-escolha",
                },
            )
        )
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(len(resposta.data["alternativas"]), 4)
        self.assertNotIn("solucao_autor", resposta.data)
        self.assertNotIn("correta", str(resposta.data))

    def test_alternativa_errada_nao_credita_e_certa_mostra_explicacao(self):
        exercicio = Exercicio.objects.get(
            trilha__slug="python", slug="string-imutavel-escolha"
        )
        errada = exercicio.alternativas.get(correta=False, ordem=1)
        correta = exercicio.alternativas.get(correta=True)
        url = self.rota("python", exercicio.slug)

        reprovada = self.client.post(url, {"alternativa_id": errada.pk}, format="json")
        self.assertEqual(reprovada.status_code, 200)
        self.assertFalse(reprovada.data["aprovado"])
        self.assertIn("Strings são imutáveis", reprovada.data["explicacao"])
        self.assertEqual(reprovada.data["alternativa_correta_id"], correta.pk)
        self.assertFalse(EventoXP.objects.exists())

        aprovada = self.client.post(url, {"alternativa_id": correta.pk}, format="json")
        self.assertEqual(aprovada.status_code, 200)
        self.assertTrue(aprovada.data["aprovado"])
        self.assertEqual(aprovada.data["xp_ganho"], 50)
        self.assertIn("Strings são imutáveis", aprovada.data["explicacao"])
        self.assertNotIn("alternativa_correta_id", aprovada.data)
        self.assertEqual(EventoXP.objects.count(), 1)

    def test_alternativa_sem_escolha_ou_de_outro_exercicio_nao_credita(self):
        url = self.rota("python", "string-imutavel-escolha")
        outra = Exercicio.objects.get(
            trilha__slug="logica-de-programacao", slug="valor-da-variavel-escolha"
        ).alternativas.first()

        vazia = self.client.post(url, {}, format="json")
        de_outro = self.client.post(url, {"alternativa_id": outra.pk}, format="json")

        self.assertEqual(vazia.status_code, 400)
        self.assertEqual(de_outro.status_code, 400)
        self.assertFalse(EventoXP.objects.exists())

    def test_flashcard_so_credita_ao_revelar(self):
        url = self.rota("logica-de-programacao", "variavel-flashcard")
        antes = self.client.post(url, {}, format="json")
        self.assertEqual(antes.status_code, 400)
        self.assertFalse(EventoXP.objects.exists())

        revelada = self.client.post(url, {"revelar": True}, format="json")
        self.assertEqual(revelada.status_code, 200)
        self.assertIn("Uma variável", revelada.data["resposta"])
        self.assertEqual(revelada.data["xp_ganho"], 50)

        repetida = self.client.post(url, {"revelar": True}, format="json")
        self.assertTrue(repetida.data["ja_concluido"])
        self.assertEqual(repetida.data["xp_ganho"], 0)
        self.assertEqual(EventoXP.objects.count(), 1)

    def test_codigo_sem_envio_nao_credita(self):
        resposta = self.client.post(
            self.rota("python", "iniciais-do-nome"), {}, format="json"
        )
        self.assertEqual(resposta.status_code, 400)
        self.assertFalse(EventoXP.objects.exists())
