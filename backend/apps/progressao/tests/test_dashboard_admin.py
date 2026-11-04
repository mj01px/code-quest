"""Métricas de BI do dashboard admin: médias por usuário e taxa de aprovação."""

from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from apps.conquistas.tests.helpers import submeter
from apps.contas.tests.helpers import criar_aluno
from apps.correcao.models import Veredito
from apps.gamificacao.services import select_starter_creature
from apps.progressao.models import Sequencia
from apps.progressao.services import creditar_exercicio, montar_dashboard_admin
from apps.trilhas.models import StatusEditorial

from .test_credito_xp import criar_exercicio


class MetricasBiTest(TestCase):
    def test_sem_dados_tudo_zero(self):
        dados = montar_dashboard_admin()

        self.assertEqual(dados["media_xp_por_usuario"], 0)
        self.assertEqual(dados["media_submissoes_por_usuario"], 0)
        self.assertEqual(dados["taxa_aprovacao_submissoes"], 0)

    def test_medias_e_taxa(self):
        a = criar_aluno()
        criar_aluno("beta")
        select_starter_creature(user=a, creature_slug="shellby")
        ex = criar_exercicio()
        creditar_exercicio(user=a, exercicio=ex)  # 50 XP, 2 usuários
        submeter(a, ex, Veredito.APROVADO, hash="1")
        submeter(a, ex, Veredito.APROVADO, hash="2")
        submeter(a, ex, Veredito.APROVADO, hash="3")
        submeter(a, ex, Veredito.RESPOSTA_ERRADA, hash="4")

        dados = montar_dashboard_admin()

        self.assertEqual(dados["media_xp_por_usuario"], 25)
        self.assertEqual(dados["media_submissoes_por_usuario"], 2)
        self.assertEqual(dados["taxa_aprovacao_submissoes"], 75)


class PainelDoPeriodoTest(TestCase):
    def test_periodo_invalido_cai_no_padrao(self):
        dados = montar_dashboard_admin("ano")

        self.assertEqual(dados["periodo"], "7d")
        self.assertEqual(len(dados["ativos_por_dia"]), 7)

    def test_periodo_de_30_dias_tem_30_pontos(self):
        dados = montar_dashboard_admin("30d")

        self.assertEqual(len(dados["ativos_por_dia"]), 30)
        self.assertEqual(len(dados["submissoes_por_dia"]), 30)

    def test_ativos_e_submissoes_do_periodo(self):
        a = criar_aluno()
        criar_aluno("beta")
        select_starter_creature(user=a, creature_slug="shellby")
        ex = criar_exercicio()
        submeter(a, ex, Veredito.APROVADO, hash="1")
        submeter(a, ex, Veredito.RESPOSTA_ERRADA, hash="2")

        dados = montar_dashboard_admin("hoje")

        self.assertEqual(dados["ativos"], {"total": 1, "percentual": 50})
        self.assertEqual(dados["submissoes"], {"total": 2, "percentual_aprovadas": 50})
        self.assertEqual(dados["usuarios"], {"total": 2, "novos": 2})
        self.assertEqual(dados["ativos_por_dia"][-1]["alunos"], 1)

    def test_funil_conta_quem_fez_o_primeiro_exercicio(self):
        a = criar_aluno()
        select_starter_creature(user=a, creature_slug="shellby")
        ex = criar_exercicio()
        ex.trilha.status = StatusEditorial.PUBLICADO
        ex.trilha.save(update_fields=["status"])
        creditar_exercicio(user=a, exercicio=ex)

        funil = montar_dashboard_admin()["funis"]

        etapas = {e["chave"]: e["alunos"] for e in funil[0]["etapas"]}
        self.assertEqual(etapas["iniciaram"], 1)

    def test_sequencia_perdida_conta_como_zero(self):
        a = criar_aluno()
        b = criar_aluno("beta")
        hoje = timezone.localdate()
        Sequencia.objects.create(user=a, atual=8, recorde=8, ultimo_dia=hoje)
        Sequencia.objects.create(
            user=b, atual=4, recorde=4, ultimo_dia=hoje - timedelta(days=3)
        )

        faixas = {
            f["faixa"]: f["alunos"] for f in montar_dashboard_admin()["sequencias"]
        }

        self.assertEqual(faixas["7+ dias"], 1)
        self.assertEqual(faixas["3–6 dias"], 0)
        self.assertEqual(faixas["0 dias"], 1)
