"""Os baldes de limite por escopo não se contaminam entre apps.

O catálogo de trilhas é público e navegável: uma visita gera dezenas de
requisições. Se essas requisições gastassem o balde `anon`, que é o mesmo das
outras rotas públicas do projeto, navegar nas trilhas derrubaria o catálogo de
criaturas com 429. É por isso que as views de trilhas declaram
`throttle_classes` próprio em vez de somar o escopo às classes padrão.
"""

from unittest import mock

from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from rest_framework.throttling import (
    AnonRateThrottle,
    ScopedRateThrottle,
    SimpleRateThrottle,
)

from apps.trilhas.tests.helpers import criar_aula, criar_exercicio, criar_trilha
from apps.trilhas.views import ExercicioDetailView, TrilhaDetailView, TrilhaListView

# O DRF lê a taxa no momento em que instancia o throttle, uma vez por
# requisição, então trocar o dicionário alcança as duas classes.
TAXAS_DE_TESTE = {"catalogo": "5/min", "anon": "3/min"}


class BaldesSeparadosTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.trilha = criar_trilha("logica")
        cls.aula = criar_aula(cls.trilha, "variaveis")
        criar_exercicio(cls.aula, "media")

    def setUp(self):
        patch = mock.patch.dict(SimpleRateThrottle.THROTTLE_RATES, TAXAS_DE_TESTE)
        patch.start()
        self.addCleanup(patch.stop)
        cache.clear()

    def test_o_catalogo_de_trilhas_nao_gasta_o_balde_anon(self):
        trilhas = reverse("trilhas:trilha-lista")
        for _ in range(4):
            self.assertEqual(self.client.get(trilhas).status_code, 200)

        criaturas = reverse("gamificacao:catalogo")
        self.assertEqual(self.client.get(criaturas).status_code, 200)

    def test_as_rotas_do_mauro_seguem_limitadas_pelo_balde_anon(self):
        criaturas = reverse("gamificacao:catalogo")
        for _ in range(3):
            self.assertEqual(self.client.get(criaturas).status_code, 200)
        self.assertEqual(self.client.get(criaturas).status_code, 429)

    def test_estourar_o_balde_anon_nao_fecha_o_catalogo_de_trilhas(self):
        criaturas = reverse("gamificacao:catalogo")
        for _ in range(4):
            self.client.get(criaturas)

        trilhas = reverse("trilhas:trilha-lista")
        self.assertEqual(self.client.get(trilhas).status_code, 200)


class ClassesDeclaradasTest(TestCase):
    VIEWS = (TrilhaListView, TrilhaDetailView, ExercicioDetailView)

    def test_as_views_de_trilhas_usam_somente_o_escopo(self):
        for view in self.VIEWS:
            classes = [type(t) for t in view().get_throttles()]
            self.assertEqual(classes, [ScopedRateThrottle], view.__name__)

    def test_as_views_de_trilhas_nao_herdam_o_throttle_anonimo(self):
        for view in self.VIEWS:
            classes = [type(t) for t in view().get_throttles()]
            self.assertNotIn(AnonRateThrottle, classes, view.__name__)
