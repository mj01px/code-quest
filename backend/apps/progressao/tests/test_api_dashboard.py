"""Dashboards do aluno e do admin: big numbers e XP por dia nos últimos 7 dias."""

from datetime import timedelta

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.auditoria.models import AcaoAuditoria, RegistroDeAuditoria
from apps.conquistas.tests.helpers import submeter
from apps.contas.models import NivelDeAcesso, User
from apps.contas.tests.helpers import criar_admin, criar_aluno
from apps.correcao.models import Submissao, Veredito
from apps.progressao.models import EventoXP, Origem, TrilhaIniciada
from apps.progressao.serializers import LogRecenteSerializer
from apps.progressao.services import montar_dashboard, montar_dashboard_admin
from apps.trilhas.models import StatusEditorial, Trilha

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


class DashboardAdminTest(TestCase):
    def setUp(self):
        self.aluno = criar_aluno()
        self.admin = criar_admin()
        self.url = reverse("progressao:admin-dashboard")

    def test_so_admin_entra(self):
        self.assertEqual(APIClient().get(self.url).status_code, 401)

        client = APIClient()
        client.force_authenticate(user=self.aluno)
        self.assertEqual(client.get(self.url).status_code, 403)

        client.force_authenticate(user=self.admin)
        self.assertEqual(client.get(self.url).status_code, 200)

    def test_soma_a_plataforma_inteira(self):
        exercicio = criar_exercicio()
        Trilha.objects.create(
            slug="rascunho", nome="R", descricao="x", status=StatusEditorial.RASCUNHO
        )
        Trilha.objects.create(
            slug="revisao", nome="V", descricao="x", status=StatusEditorial.REVISAO
        )
        submeter(self.aluno, exercicio)
        submeter(self.admin, exercicio, veredito=Veredito.RESPOSTA_ERRADA)
        antiga = submeter(self.aluno, exercicio, veredito=Veredito.TEMPO_ESGOTADO)
        Submissao.objects.filter(pk=antiga.pk).update(
            criado_em=timezone.now() - timedelta(days=2)
        )
        User.objects.filter(pk=self.aluno.pk).update(
            created_at=timezone.now() - timedelta(days=3)
        )
        RegistroDeAuditoria.objects.create(acao=AcaoAuditoria.LOGIN_OK, actor=self.aluno)
        RegistroDeAuditoria.objects.create(acao=AcaoAuditoria.LOGIN_FALHA)
        RegistroDeAuditoria.objects.create(
            acao=AcaoAuditoria.ACESSO_AUDITORIA, actor=self.admin
        )

        dados = montar_dashboard_admin()

        self.assertEqual(dados["total_usuarios"], 2)
        self.assertEqual(dados["trilhas_publicadas"], 1)
        self.assertEqual(dados["fila_revisao"], 1)
        self.assertEqual(dados["submissoes_judge"], 3)
        self.assertEqual(
            [d["quantidade"] for d in dados["novos_usuarios_semana"]],
            [0, 0, 0, 1, 0, 0, 1],
        )
        self.assertEqual(
            [(d["aprovadas"], d["rejeitadas"]) for d in dados["submissoes_semana"]],
            [(0, 0)] * 4 + [(0, 1), (0, 0), (1, 1)],
        )

        logs = dados["logs_recentes"]
        self.assertLessEqual(len(logs), 10)
        # ACESSO_AUDITORIA fica fora; o mais recente vem primeiro
        self.assertEqual(
            [log.acao for log in logs[:2]],
            [AcaoAuditoria.LOGIN_FALHA, AcaoAuditoria.LOGIN_OK],
        )
        # select_related: serializar o nome do autor não consulta o banco
        with self.assertNumQueries(0):
            linhas = LogRecenteSerializer(logs, many=True).data
        self.assertEqual(
            [linha["usuario"] for linha in linhas[:2]], ["Anônimo", "aluno"]
        )

    def test_logs_fora_da_retencao_nao_aparecem(self):
        velho = RegistroDeAuditoria.objects.create(acao=AcaoAuditoria.LOGOUT)
        RegistroDeAuditoria.objects.filter(pk=velho.pk).update(
            created_at=timezone.now() - timedelta(days=181)
        )

        with self.settings(AUDITORIA_RETENCAO_DIAS=180):
            logs = montar_dashboard_admin()["logs_recentes"]

        self.assertNotIn(velho.pk, [log.pk for log in logs])

    def test_consulta_fica_registrada_como_acesso_a_auditoria(self):
        client = APIClient()
        client.force_authenticate(user=self.admin)
        client.get(self.url)

        self.assertTrue(
            RegistroDeAuditoria.objects.filter(
                acao=AcaoAuditoria.ACESSO_AUDITORIA, actor=self.admin
            ).exists()
        )

    def test_admin_sem_auditoria_view_nao_ve_logs(self):
        sem_auditoria = NivelDeAcesso.objects.create(nome="painel_sem_logs", acesso_admin=True)
        User.objects.filter(pk=self.admin.pk).update(nivel_de_acesso=sem_auditoria)
        admin = User.objects.get(pk=self.admin.pk)
        RegistroDeAuditoria.objects.create(acao=AcaoAuditoria.LOGIN_OK, actor=self.aluno)
        client = APIClient()
        client.force_authenticate(user=admin)

        r = client.get(self.url)

        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["logs_recentes"], [])
        self.assertFalse(
            RegistroDeAuditoria.objects.filter(acao=AcaoAuditoria.ACESSO_AUDITORIA).exists()
        )
