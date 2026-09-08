"""Limite de requisições dos endpoints públicos do catálogo."""

from unittest import mock

from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from rest_framework.throttling import SimpleRateThrottle

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
        url = reverse("trilhas:trilha-lista")
        for numero in range(3):
            self.client.get(url, headers={"x-forwarded-for": f"9.9.9.{numero}"})
        resposta = self.client.get(url, headers={"x-forwarded-for": "1.2.3.4"})
        self.assertEqual(resposta.status_code, 429)

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
