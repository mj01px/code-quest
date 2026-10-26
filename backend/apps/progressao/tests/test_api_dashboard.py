"""Dashboard do aluno: big numbers e XP agrupado por dia nos últimos 7 dias."""

from datetime import timedelta

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.contas.tests.helpers import criar_aluno
from apps.progressao.models import EventoXP, Origem, TrilhaIniciada
from apps.progressao.services import montar_dashboard

from .test_credito_xp import criar_exercicio


class DashboardTest(TestCase):
    def setUp(self):
        self.user = criar_aluno()

    def evento(self, xp, dias_atras=0, exercicio=None, user=None):
        evento = EventoXP.objects.create(
            user=user or self.user,
            xp=xp,
            exercicio=exercicio,
            origem=Origem.EXERCICIO if exercicio else Origem.AJUSTE,
        )
        # criado_em é auto_now_add: só um update consegue voltar no tempo
        EventoXP.objects.filter(pk=evento.pk).update(
            criado_em=timezone.now() - timedelta(days=dias_atras)
        )

    def test_sem_historico_zera_tudo_e_traz_sete_dias(self):
        dados = montar_dashboard(user=self.user)

        self.assertEqual(dados["xp_total"], 0)
        self.assertEqual(dados["exercicios_concluidos"], 0)
        self.assertEqual(dados["sequencia_atual"], 0)
        self.assertEqual(dados["trilhas_iniciadas"], 0)
        self.assertEqual(len(dados["atividade_semanal"]), 7)
        self.assertTrue(all(d["xp"] == 0 for d in dados["atividade_semanal"]))
        self.assertEqual(dados["atividade_semanal"][-1]["data"], timezone.localdate())

    def test_agrega_xp_por_dia_dentro_da_janela(self):
        self.evento(50, exercicio=criar_exercicio(slug="a"))
        self.evento(100, exercicio=criar_exercicio(slug="b"))
        self.evento(200, dias_atras=2)
        self.evento(999, dias_atras=8)
        self.evento(70, user=criar_aluno("outro"))

        dados = montar_dashboard(user=self.user)
        por_dia = [d["xp"] for d in dados["atividade_semanal"]]

        self.assertEqual(por_dia, [0, 0, 0, 0, 200, 0, 150])
        self.assertEqual(dados["xp_total"], 50 + 100 + 200 + 999)
        # AJUSTE dá XP mas não é exercício concluído
        self.assertEqual(dados["exercicios_concluidos"], 2)

    def test_conta_trilhas_iniciadas(self):
        exercicio = criar_exercicio()
        TrilhaIniciada.objects.create(user=self.user, trilha=exercicio.aula.trilha)

        self.assertEqual(montar_dashboard(user=self.user)["trilhas_iniciadas"], 1)

    def test_api_exige_login_e_devolve_o_contrato(self):
        url = reverse("progressao:meu-dashboard")
        self.assertEqual(APIClient().get(url).status_code, 401)

        client = APIClient()
        client.force_authenticate(user=self.user)
        resposta = client.get(url)

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(
            set(resposta.data),
            {
                "xp_total",
                "exercicios_concluidos",
                "sequencia_atual",
                "trilhas_iniciadas",
                "atividade_semanal",
            },
        )
        self.assertEqual(set(resposta.data["atividade_semanal"][0]), {"dia", "data", "xp"})
