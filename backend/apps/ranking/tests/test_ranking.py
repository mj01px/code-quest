"""Ranking mensal: placar a partir do EventoXP, pódio e conquistas de pódio."""

from datetime import date, datetime, timedelta
from unittest import mock
from zoneinfo import ZoneInfo

from django.core.cache import cache
from django.core.management import call_command
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.conquistas.tests.helpers import desbloqueadas
from apps.contas.tests.helpers import criar_aluno
from apps.progressao.models import EventoXP, Origem
from apps.ranking.models import PodioMensal
from apps.ranking.services import (
    fechar_mes,
    mes_anterior,
    mes_seguinte,
    placar,
    ranking_mensal,
)

SP = ZoneInfo("America/Sao_Paulo")
MES = date(2026, 9, 1)
MES_SEGUINTE = date(2026, 10, 1)


def momento(dia, hora=12, minuto=0):
    return datetime(dia.year, dia.month, dia.day, hora, minuto, tzinfo=SP)


def ganhar(user, xp, quando, origem=Origem.AJUSTE):
    # AJUSTE não exige exercício nem cai na trava de um XP por exercício
    evento = EventoXP.objects.create(user=user, xp=xp, origem=origem)
    EventoXP.objects.filter(pk=evento.pk).update(criado_em=quando)
    return evento


def no_dia(dia):
    return mock.patch(
        "apps.ranking.services.timezone.localdate", return_value=dia
    )


class CalendarioTest(TestCase):
    def test_mes_seguinte_e_anterior(self):
        self.assertEqual(mes_seguinte(date(2026, 1, 1)), date(2026, 2, 1))
        self.assertEqual(mes_seguinte(date(2026, 12, 1)), date(2027, 1, 1))
        self.assertEqual(mes_anterior(date(2026, 1, 1)), date(2025, 12, 1))
        self.assertEqual(mes_anterior(date(2026, 3, 1)), date(2026, 2, 1))


class PlacarTest(TestCase):
    def setUp(self):
        self.ana = criar_aluno("ana")
        self.bia = criar_aluno("bia")
        self.caio = criar_aluno("caio")

    def test_soma_so_o_xp_do_mes(self):
        ganhar(self.ana, 50, momento(MES - timedelta(days=1)))
        ganhar(self.ana, 30, momento(MES))
        ganhar(self.ana, 20, momento(MES + timedelta(days=20)))

        self.assertEqual([(linha.nickname, linha.xp) for linha in placar(MES)], [("ana", 50)])

    def test_virada_no_fuso_de_sao_paulo(self):
        ultimo_dia = MES_SEGUINTE - timedelta(days=1)
        ganhar(self.ana, 10, momento(ultimo_dia, 23, 59))
        ganhar(self.bia, 10, momento(MES_SEGUINTE, 0, 0))

        self.assertEqual([linha.nickname for linha in placar(MES)], ["ana"])
        self.assertEqual([linha.nickname for linha in placar(MES_SEGUINTE)], ["bia"])

    def test_ajuste_e_exercicio_contam(self):
        ganhar(self.ana, 10, momento(MES), origem=Origem.AJUSTE)
        ganhar(self.ana, 15, momento(MES, 13), origem=Origem.EXERCICIO)

        self.assertEqual(placar(MES)[0].xp, 25)

    def test_ordem_por_xp_e_empate_para_quem_chegou_antes(self):
        ganhar(self.ana, 40, momento(MES, 15))
        ganhar(self.bia, 40, momento(MES, 10))
        ganhar(self.caio, 90, momento(MES, 18))

        linhas = placar(MES)
        self.assertEqual([linha.nickname for linha in linhas], ["caio", "bia", "ana"])
        self.assertEqual([linha.posicao for linha in linhas], [1, 2, 3])

    def test_suspenso_e_anonimizado_ficam_de_fora(self):
        self.bia.is_active = False
        self.bia.save(update_fields=["is_active"])
        self.caio.anonymized_at = timezone.now()
        self.caio.save(update_fields=["anonymized_at"])
        for aluno in (self.ana, self.bia, self.caio):
            ganhar(aluno, 10, momento(MES))

        self.assertEqual([linha.nickname for linha in placar(MES)], ["ana"])

    def test_mes_sem_xp_fica_vazio(self):
        self.assertEqual(placar(MES), [])


class PodioTest(TestCase):
    def setUp(self):
        self.alunos = [criar_aluno(f"aluno{i}") for i in range(4)]
        for indice, aluno in enumerate(self.alunos):
            ganhar(aluno, 100 - indice * 10, momento(MES))

    def test_grava_os_tres_primeiros(self):
        with no_dia(MES_SEGUINTE):
            fechar_mes(MES)

        podio = PodioMensal.objects.filter(mes=MES).order_by("posicao")
        self.assertEqual(
            [(p.posicao, p.user.nickname, p.xp) for p in podio],
            [(1, "aluno0", 100), (2, "aluno1", 90), (3, "aluno2", 80)],
        )

    def test_fechar_de_novo_nao_duplica(self):
        with no_dia(MES_SEGUINTE):
            fechar_mes(MES)
            self.assertEqual(fechar_mes(MES), [])

        self.assertEqual(PodioMensal.objects.filter(mes=MES).count(), 3)

    def test_mes_em_andamento_nao_fecha(self):
        with no_dia(MES_SEGUINTE - timedelta(days=1)):
            self.assertEqual(fechar_mes(MES), [])

        self.assertFalse(PodioMensal.objects.exists())

    def test_conflito_de_fechamento_e_ignorado(self):
        with no_dia(MES_SEGUINTE):
            with mock.patch(
                "apps.ranking.services.PodioMensal.objects.filter"
            ) as filtro:
                # simula a outra requisição gravando entre a checagem e o insert
                filtro.return_value.exists.return_value = False
                PodioMensal.objects.create(
                    mes=MES, posicao=1, user=self.alunos[3], xp=1
                )
                self.assertEqual(fechar_mes(MES), [])

        self.assertEqual(PodioMensal.objects.filter(mes=MES).count(), 1)

    def test_comando_fecha_meses_passados(self):
        with no_dia(date(2026, 11, 5)):
            call_command("fechar_podios", meses=2, stdout=mock.Mock())

        self.assertEqual(PodioMensal.objects.filter(mes=MES).count(), 3)

    def test_podio_desbloqueia_conquistas(self):
        with self.captureOnCommitCallbacks(execute=True):
            with no_dia(MES_SEGUINTE):
                fechar_mes(MES)

        self.assertTrue(
            {"podio-do-mes", "campeao-do-mes"} <= desbloqueadas(self.alunos[0])
        )
        self.assertIn("podio-do-mes", desbloqueadas(self.alunos[2]))
        self.assertNotIn("campeao-do-mes", desbloqueadas(self.alunos[2]))
        self.assertNotIn("podio-do-mes", desbloqueadas(self.alunos[3]))


class RankingMensalTest(TestCase):
    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)
        self.eu = criar_aluno("euzinho")
        self.lider = criar_aluno("lider")
        self.vice = criar_aluno("vice")

    def test_minha_posicao_e_quanto_falta(self):
        ganhar(self.lider, 100, momento(MES, 9))
        ganhar(self.vice, 60, momento(MES, 10))
        ganhar(self.eu, 45, momento(MES, 11))

        with no_dia(MES + timedelta(days=10)):
            dados = ranking_mensal(self.eu)

        self.assertEqual(dados["voce"]["posicao"], 3)
        self.assertEqual(dados["voce"]["xp"], 45)
        self.assertEqual(dados["voce"]["faltam_para_subir"], 16)
        self.assertEqual([linha["voce"] for linha in dados["topo"]], [False, False, True])
        self.assertEqual(dados["mes"]["fim"], date(2026, 9, 30))

    def test_lider_nao_tem_quem_passar(self):
        ganhar(self.eu, 10, momento(MES))

        with no_dia(MES):
            voce = ranking_mensal(self.eu)["voce"]

        self.assertEqual((voce["posicao"], voce["faltam_para_subir"]), (1, None))

    def test_sem_xp_no_mes_fica_sem_posicao(self):
        ganhar(self.lider, 10, momento(MES))

        with no_dia(MES):
            voce = ranking_mensal(self.eu)["voce"]

        self.assertEqual(
            voce,
            {
                "nickname": "euzinho",
                "criatura": None,
                "posicao": None,
                "xp": 0,
                "faltam_para_subir": None,
                "podios": 0,
                "vitorias": 0,
            },
        )

    def test_topo_corta_em_dez(self):
        for i in range(22):
            ganhar(criar_aluno(f"extra{i}"), 50 + i, momento(MES))
        ganhar(self.eu, 1, momento(MES))

        with no_dia(MES):
            dados = ranking_mensal(self.eu)

        self.assertEqual(len(dados["topo"]), 10)
        self.assertEqual(dados["voce"]["posicao"], 23)

    def test_leitura_fecha_o_mes_anterior(self):
        ganhar(self.lider, 30, momento(MES))

        with no_dia(MES_SEGUINTE):
            dados = ranking_mensal(self.lider)

        self.assertEqual(dados["topo"], [])
        self.assertEqual((dados["voce"]["podios"], dados["voce"]["vitorias"]), (1, 1))

    def test_consultas_nao_crescem_com_o_topo(self):
        for i in range(3):
            ganhar(criar_aluno(f"pri{i}"), 10, momento(MES))
        with no_dia(MES), CaptureQueriesContext(connection) as poucos:
            ranking_mensal(self.eu)

        for i in range(10):
            ganhar(criar_aluno(f"seg{i}"), 10, momento(MES))
        with no_dia(MES), CaptureQueriesContext(connection) as muitos:
            ranking_mensal(self.eu)

        self.assertEqual(len(poucos), len(muitos))


class RankingApiTest(TestCase):
    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)
        self.user = criar_aluno()
        self.client = APIClient()

    def test_exige_login(self):
        self.assertEqual(self.client.get(reverse("ranking:mensal")).status_code, 401)

    def test_mensal_devolve_o_formato_do_front(self):
        self.client.force_authenticate(self.user)
        ganhar(self.user, 20, timezone.now())

        resposta = self.client.get(reverse("ranking:mensal"))

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(set(resposta.data), {"mes", "topo", "voce"})
        self.assertEqual(resposta.data["topo"][0]["nickname"], self.user.nickname)
        self.assertEqual(resposta.data["voce"]["posicao"], 1)

