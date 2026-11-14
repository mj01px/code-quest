"""Exercício teórico conclui ao responder e devolve a resposta de referência."""

from django.urls import reverse
from rest_framework.test import APITestCase

from apps.contas.tests.helpers import criar_aluno
from apps.gamificacao.services import select_starter_creature
from apps.trilhas.models import Tipo

from .test_credito_xp import criar_exercicio


class RespostaDeReferenciaTest(APITestCase):
    def setUp(self):
        self.user = criar_aluno()
        select_starter_creature(user=self.user, creature_slug="shellby")
        self.client.force_authenticate(user=self.user)

    def concluir(self, exercicio):
        return self.client.post(
            reverse(
                "progressao:concluir-exercicio",
                kwargs={"trilha_slug": "python", "exercicio_slug": exercicio.slug},
            ),
            format="json",
        )

    def test_teorico_devolve_a_explicacao_e_credita(self):
        exercicio = criar_exercicio(slug="teorico", tipo=Tipo.TEORICO)
        exercicio.explicacao = "É float, porque / sempre devolve float."
        exercicio.save()

        resposta = self.concluir(exercicio)

        self.assertEqual(resposta.status_code, 200)
        self.assertTrue(resposta.data["aprovado"])
        self.assertFalse(resposta.data["ja_concluido"])
        self.assertEqual(
            resposta.data["explicacao"], "É float, porque / sempre devolve float."
        )

    def test_codigo_sem_correcao_automatica_nao_devolve_explicacao(self):
        exercicio = criar_exercicio(slug="sql")
        exercicio.explicacao = "CREATE TABLE aluno (...);"
        exercicio.save()

        resposta = self.concluir(exercicio)

        self.assertEqual(resposta.status_code, 400)
        self.assertNotIn("explicacao", resposta.data)
        self.assertNotContains(resposta, exercicio.explicacao, status_code=400)
