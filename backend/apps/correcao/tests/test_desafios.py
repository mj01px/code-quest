from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.contas.tests.helpers import criar_aluno
from apps.gamificacao.services import select_starter_creature
from apps.progressao.models import EventoXP
from apps.trilhas.management.commands.seed_desafios import DESAFIOS, TRILHA_DOS_DESAFIOS
from apps.trilhas.models import Dificuldade, Exercicio

from .helpers import ExecutorLocal


class CorrecaoDesafiosTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_desafios", stdout=StringIO())
        call_command("seed_correcao", stdout=StringIO())
        cls.user = criar_aluno()
        select_starter_creature(user=cls.user, creature_slug="shellby")

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.executor = ExecutorLocal()
        patcher = patch(
            "apps.correcao.services.obter_cliente", return_value=self.executor
        )
        patcher.start()
        self.addCleanup(patcher.stop)

    def rota(self, nome, slug):
        return reverse(
            nome,
            kwargs={"trilha_slug": TRILHA_DOS_DESAFIOS, "exercicio_slug": slug},
        )

    def test_executar_solucoes_mostra_so_casos_visiveis_e_nao_credita_xp(self):
        for dados in DESAFIOS:
            with self.subTest(desafio=dados["slug"]):
                resposta = self.client.post(
                    self.rota("correcao:executar", dados["slug"]),
                    {"codigo": dados["solucao_autor"]},
                    format="json",
                )

                self.assertEqual(resposta.status_code, 200)
                self.assertTrue(resposta.data["aprovado"])
                self.assertEqual(resposta.data["total"], 2)
                self.assertTrue(all(c["visivel"] for c in resposta.data["casos"]))
        self.assertFalse(EventoXP.objects.filter(user=self.user).exists())

    def test_enviar_solucoes_credita_xp_e_esconde_casos_ocultos(self):
        for dados in DESAFIOS:
            with self.subTest(desafio=dados["slug"]):
                resposta = self.client.post(
                    self.rota("progressao:concluir-exercicio", dados["slug"]),
                    {"codigo": dados["solucao_autor"]},
                    format="json",
                )

                self.assertEqual(resposta.status_code, 200)
                self.assertTrue(resposta.data["aprovado"])
                self.assertEqual(
                    resposta.data["xp_ganho"],
                    50 if dados["dificuldade"] == Dificuldade.INICIANTE else 100,
                )
                ocultos = [
                    c for c in resposta.data["correcao"]["casos"] if not c["visivel"]
                ]
                self.assertTrue(ocultos)
                for caso in ocultos:
                    self.assertEqual(set(caso), {"ordem", "visivel", "passou"})
        self.assertEqual(EventoXP.objects.filter(user=self.user).count(), 5)

    def test_passar_nos_visiveis_nao_aprova_envio_que_erra_ocultos(self):
        codigo = (
            "def fizzbuzz(n):\n"
            '    return ["Fizz" if i % 3 == 0 else "Buzz" if i % 5 == 0 '
            "else str(i) for i in range(1, n + 1)]\n"
        )
        executada = self.client.post(
            self.rota("correcao:executar", "fizzbuzz"),
            {"codigo": codigo},
            format="json",
        )
        enviada = self.client.post(
            self.rota("progressao:concluir-exercicio", "fizzbuzz"),
            {"codigo": codigo},
            format="json",
        )

        self.assertTrue(executada.data["aprovado"])
        self.assertEqual(enviada.status_code, 200)
        self.assertFalse(enviada.data["aprovado"])
        self.assertFalse(EventoXP.objects.filter(user=self.user).exists())

    def test_max_continua_proibido_depois_de_reaplicar_seeds(self):
        call_command("seed_desafios", stdout=StringIO())
        call_command("seed_correcao", stdout=StringIO())
        especificacao = Exercicio.objects.get(
            trilha__slug=TRILHA_DOS_DESAFIOS, slug="maior-sem-max"
        ).especificacao_codigo
        self.assertEqual(
            especificacao.requisitos,
            [{"regra": "proibir", "construcao": "chamada", "nome": "max"}],
        )

        for nome in ("correcao:executar", "progressao:concluir-exercicio"):
            with self.subTest(rota=nome):
                resposta = self.client.post(
                    self.rota(nome, "maior-sem-max"),
                    {"codigo": "def maior(numeros):\n    return max(numeros)\n"},
                    format="json",
                )
                self.assertEqual(resposta.status_code, 400)
        self.assertEqual(self.executor.chamadas, 0)
        self.assertFalse(EventoXP.objects.filter(user=self.user).exists())
