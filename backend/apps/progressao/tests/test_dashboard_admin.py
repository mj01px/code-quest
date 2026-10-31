"""Métricas de BI do dashboard admin: médias por usuário e taxa de aprovação."""

from django.test import TestCase

from apps.conquistas.tests.helpers import submeter
from apps.contas.tests.helpers import criar_aluno
from apps.correcao.models import Veredito
from apps.gamificacao.services import select_starter_creature
from apps.progressao.services import creditar_exercicio, montar_dashboard_admin

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
