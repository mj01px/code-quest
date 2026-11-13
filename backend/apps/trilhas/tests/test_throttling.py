"""Limite de requisições dos endpoints públicos do catálogo."""

from unittest import mock

from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.throttling import SimpleRateThrottle

from apps.trilhas.throttling import _redes_isentas
from apps.trilhas.views import ExercicioDetailView, TrilhaDetailView, TrilhaListView

from .helpers import criar_aula, criar_exercicio, criar_trilha

# O DRF prende THROTTLE_RATES na classe no momento do import, então
# override_settings não alcança a taxa. Trocar o dicionário alcança.
TAXA_DE_TESTE = {"catalogo": "3/min"}


class LimitePorIpTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.trilha = criar_trilha("logica")
        cls.aula = criar_aula(cls.trilha, "variaveis")
        criar_exercicio(cls.aula, "media")

    def setUp(self):
        patch = mock.patch.dict(SimpleRateThrottle.THROTTLE_RATES, TAXA_DE_TESTE)
        patch.start()
        self.addCleanup(patch.stop)
        cache.clear()

    def test_libera_ate_o_limite_e_recusa_a_seguinte(self):
        url = reverse("trilhas:trilha-lista")
        for _ in range(3):
            self.assertEqual(self.client.get(url).status_code, 200)
        self.assertEqual(self.client.get(url).status_code, 429)

    def test_detalhe_da_trilha_tambem_e_limitado(self):
        url = reverse("trilhas:trilha-detalhe", args=["logica"])
        for _ in range(3):
            self.assertEqual(self.client.get(url).status_code, 200)
        self.assertEqual(self.client.get(url).status_code, 429)

    def test_detalhe_do_exercicio_tambem_e_limitado(self):
        url = reverse("trilhas:exercicio-detalhe", args=["logica", "media"])
        for _ in range(3):
            self.assertEqual(self.client.get(url).status_code, 200)
        self.assertEqual(self.client.get(url).status_code, 429)

    def test_as_tres_rotas_dividem_a_mesma_cota(self):
        self.client.get(reverse("trilhas:trilha-lista"))
        self.client.get(reverse("trilhas:trilha-detalhe", args=["logica"]))
        self.client.get(reverse("trilhas:exercicio-detalhe", args=["logica", "media"]))
        resposta = self.client.get(reverse("trilhas:trilha-lista"))
        self.assertEqual(resposta.status_code, 429)

    def test_x_forwarded_for_forjado_nao_zera_a_cota(self):
        # NUM_PROXIES=1: vale o último item, o que o proxy acrescenta. O que o
        # cliente forja vem antes e não troca o balde.
        url = reverse("trilhas:trilha-lista")
        for numero in range(3):
            xff = f"9.9.9.{numero}, 203.0.113.7"
            self.client.get(url, headers={"x-forwarded-for": xff})
        resposta = self.client.get(
            url, headers={"x-forwarded-for": "1.2.3.4, 203.0.113.7"}
        )
        self.assertEqual(resposta.status_code, 429)

    def test_alunos_atras_do_proxy_nao_dividem_o_balde(self):
        # Com NUM_PROXIES=0 todo pedido via Next tinha o mesmo REMOTE_ADDR.
        url = reverse("trilhas:trilha-lista")
        for _ in range(3):
            self.client.get(url, headers={"x-forwarded-for": "203.0.113.7"})
        resposta = self.client.get(url, headers={"x-forwarded-for": "203.0.113.8"})
        self.assertEqual(resposta.status_code, 200)

    def test_a_resposta_recusada_diz_quando_tentar_de_novo(self):
        url = reverse("trilhas:trilha-lista")
        for _ in range(3):
            self.client.get(url)
        self.assertIn("Retry-After", self.client.get(url).headers)


class EscopoTest(TestCase):
    def test_as_views_publicas_declaram_o_escopo(self):
        for view in (TrilhaListView, TrilhaDetailView, ExercicioDetailView):
            self.assertEqual(view.throttle_scope, "catalogo")

    def test_a_taxa_do_escopo_esta_configurada(self):
        self.assertIn("catalogo", SimpleRateThrottle.THROTTLE_RATES)


class RedeIsentaTest(TestCase):
    """A rede interna do docker-compose (o Next renderizando) nao conta no limite."""

    @classmethod
    def setUpTestData(cls):
        criar_trilha("logica")

    def setUp(self):
        patch = mock.patch.dict(SimpleRateThrottle.THROTTLE_RATES, TAXA_DE_TESTE)
        patch.start()
        self.addCleanup(patch.stop)
        cache.clear()
        _redes_isentas.cache_clear()
        self.addCleanup(_redes_isentas.cache_clear)
        self.url = reverse("trilhas:trilha-lista")

    @override_settings(THROTTLE_REDES_ISENTAS=["172.28.0.0/24"])
    def test_pedido_da_rede_interna_passa_do_limite(self):
        for _ in range(5):
            resposta = self.client.get(self.url, REMOTE_ADDR="172.28.0.5")
            self.assertEqual(resposta.status_code, 200)

    @override_settings(THROTTLE_REDES_ISENTAS=["172.28.0.0/24"])
    def test_ip_do_aluno_no_x_forwarded_for_continua_limitado(self):
        # Via Nginx o pedido sai do Next (rede interna), mas o IP que conta e o
        # do aluno, no X-Forwarded-For: esse nao e isento.
        cabecalhos = {"REMOTE_ADDR": "172.28.0.5", "HTTP_X_FORWARDED_FOR": "200.1.2.3"}
        for _ in range(3):
            self.assertEqual(self.client.get(self.url, **cabecalhos).status_code, 200)
        self.assertEqual(self.client.get(self.url, **cabecalhos).status_code, 429)

    def test_sem_rede_configurada_ninguem_e_isento(self):
        for _ in range(3):
            self.client.get(self.url, REMOTE_ADDR="172.28.0.5")
        resposta = self.client.get(self.url, REMOTE_ADDR="172.28.0.5")
        self.assertEqual(resposta.status_code, 429)
