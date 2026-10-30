"""A conclusão de múltipla escolha e flashcard nunca devolve `solucao_autor`.

A rota monta a resposta à mão, fora dos serializers, então a varredura
transversal não a enxerga: este teste é a guarda dela. O texto devolvido ao
aluno vem de `explicacao`.
"""

from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.contas.tests.helpers import criar_aluno
from apps.gamificacao.services import select_starter_creature
from apps.trilhas.models import AlternativaExercicio, Tipo
from apps.trilhas.tests.helpers import criar_aula, criar_exercicio, criar_trilha

SEGREDO = "SEGREDO: resposta de referência do autor."
EXPLICACAO = "Explicação pública que o aluno pode ler."


class ExplicacaoPublicaTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        aula = criar_aula(criar_trilha("logica"), "vars")
        cls.escolha = criar_exercicio(
            aula,
            "escolha",
            tipo=Tipo.ALTERNATIVA,
            solucao_autor=SEGREDO,
            explicacao=EXPLICACAO,
        )
        cls.errada = AlternativaExercicio.objects.create(
            exercicio=cls.escolha, texto="Errada", ordem=1
        )
        cls.certa = AlternativaExercicio.objects.create(
            exercicio=cls.escolha, texto="Certa", ordem=2, correta=True
        )
        cls.cartao = criar_exercicio(
            aula,
            "cartao",
            ordem=2,
            tipo=Tipo.FLASHCARD,
            solucao_autor=SEGREDO,
            explicacao=EXPLICACAO,
        )
        cls.aluno = criar_aluno()
        select_starter_creature(user=cls.aluno, creature_slug="shellby")

    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)
        self.client = APIClient()
        self.client.force_authenticate(user=self.aluno)

    def concluir(self, exercicio, corpo):
        url = reverse(
            "progressao:concluir-exercicio",
            kwargs={"trilha_slug": "logica", "exercicio_slug": exercicio.slug},
        )
        resposta = self.client.post(url, corpo, format="json")
        self.assertEqual(resposta.status_code, 200)
        self.assertNotIn(SEGREDO, str(resposta.data))
        return resposta.data

    def test_alternativa_errada_devolve_a_explicacao_e_nao_a_solucao(self):
        dados = self.concluir(self.escolha, {"alternativa_id": self.errada.pk})

        self.assertFalse(dados["aprovado"])
        self.assertEqual(dados["explicacao"], EXPLICACAO)

    def test_alternativa_certa_devolve_a_explicacao_e_nao_a_solucao(self):
        dados = self.concluir(self.escolha, {"alternativa_id": self.certa.pk})

        self.assertTrue(dados["aprovado"])
        self.assertEqual(dados["explicacao"], EXPLICACAO)

    def test_flashcard_revelado_devolve_a_explicacao_e_nao_a_solucao(self):
        dados = self.concluir(self.cartao, {"revelar": True})

        self.assertEqual(dados["resposta"], EXPLICACAO)
