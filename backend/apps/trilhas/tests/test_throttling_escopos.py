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
from rest_framework.test import APIClient
from rest_framework.throttling import (
    AnonRateThrottle,
    ScopedRateThrottle,
    SimpleRateThrottle,
)

from apps.trilhas.tests.helpers import criar_aula, criar_exercicio, criar_trilha
from apps.trilhas.views import ExercicioDetailView, TrilhaDetailView, TrilhaListView
from apps.contas.tests.helpers import criar_autor

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


class BaldeDaAutoriaTest(TestCase):
    """O escopo `autoria` entrega o gabarito: o limite tem que valer de fato.

    E tem que ser isolado, senão navegar no catálogo afrouxa o limite daqui.
    """

    TAXAS = {"autoria": "2/min", "catalogo": "5/min"}

    @classmethod
    def setUpTestData(cls):
        trilha = criar_trilha("logica")
        aula = criar_aula(trilha, "variaveis")
        criar_exercicio(aula, "media")

    def setUp(self):
        patch = mock.patch.dict(SimpleRateThrottle.THROTTLE_RATES, self.TAXAS)
        patch.start()
        self.addCleanup(patch.stop)
        cache.clear()
        self.addCleanup(cache.clear)

        self.cliente = APIClient()
        self.cliente.force_authenticate(user=criar_autor())
        self.url = reverse(
            "autoria:solucao-autor",
            kwargs={"trilha_slug": "logica", "exercicio_slug": "media"},
        )

    def test_o_limite_da_autoria_fecha_no_terceiro_pedido(self):
        codigos = [self.cliente.get(self.url).status_code for _ in range(3)]

        self.assertEqual(codigos, [200, 200, 429])

    def test_estourar_a_autoria_nao_fecha_o_catalogo(self):
        for _ in range(3):
            self.cliente.get(self.url)

        trilhas = reverse("trilhas:trilha-lista")
        self.assertEqual(self.client.get(trilhas).status_code, 200)

    def test_navegar_no_catalogo_nao_gasta_o_balde_da_autoria(self):
        trilhas = reverse("trilhas:trilha-lista")
        for _ in range(6):
            self.client.get(trilhas)

        self.assertEqual(self.cliente.get(self.url).status_code, 200)

    def test_anonimo_nao_gasta_o_balde_de_quem_tem_permissao(self):
        # O 401 nem chega ao throttle, então não há como um anônimo
        # queimar o orçamento alheio.
        for _ in range(5):
            APIClient().get(self.url)

        self.assertEqual(self.cliente.get(self.url).status_code, 200)
