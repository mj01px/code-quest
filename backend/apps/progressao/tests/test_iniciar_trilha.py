"""Entrar numa trilha é um estado próprio, separado de ter progresso nela.

"Não iniciada" e "iniciada com 0%" são a mesma coisa se olharmos só para as
conclusões: as duas têm zero `EventoXP`. É por isso que existe `TrilhaIniciada`
e é isso que estes testes protegem, junto com as duas regras que a tela
depende: repetir o clique não é erro, e resolver uma fase já conta como entrar.
"""

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.contas.tests.helpers import criar_aluno
from apps.gamificacao.services import select_starter_creature
from apps.progressao.models import TrilhaIniciada
from apps.progressao.services import (
    creditar_exercicio,
    iniciar_trilha,
    trilhas_iniciadas,
)
from apps.trilhas.models import StatusEditorial, Trilha

from .test_credito_xp import criar_exercicio


def rota(slug: str) -> str:
    return reverse("progressao:iniciar-trilha", args=[slug])


class IniciarTrilhaServicoTest(TestCase):
    def setUp(self):
        self.user = criar_aluno()
        self.exercicio = criar_exercicio()
        self.trilha = self.exercicio.trilha

    def test_primeira_vez_cria_a_marca(self):
        self.assertTrue(iniciar_trilha(user=self.user, trilha=self.trilha))
        self.assertTrue(
            TrilhaIniciada.objects.filter(user=self.user, trilha=self.trilha).exists()
        )

    def test_repetir_nao_duplica_nem_levanta(self):
        iniciar_trilha(user=self.user, trilha=self.trilha)
        self.assertFalse(iniciar_trilha(user=self.user, trilha=self.trilha))
        self.assertEqual(TrilhaIniciada.objects.filter(user=self.user).count(), 1)

    def test_trilha_em_rascunho_nao_pode_ser_iniciada(self):
        rascunho = Trilha.objects.create(
            slug="oculta",
            nome="Oculta",
            descricao="...",
            ordem=99,
            status=StatusEditorial.RASCUNHO,
        )
        with self.assertRaises(Exception):
            iniciar_trilha(user=self.user, trilha=rascunho)

    def test_a_marca_e_por_usuario(self):
        outro = criar_aluno("outro")
        iniciar_trilha(user=self.user, trilha=self.trilha)

        self.assertEqual(trilhas_iniciadas(user=outro), [])


class TrilhasIniciadasTest(TestCase):
    def setUp(self):
        self.user = criar_aluno()
        self.exercicio = criar_exercicio()
        self.trilha = self.exercicio.trilha

    def test_sem_nada_a_lista_e_vazia(self):
        self.assertEqual(trilhas_iniciadas(user=self.user), [])

    def test_concluir_uma_fase_conta_como_iniciar(self):
        # Quem vai direto ao exercício, sem passar pelo botão, também está na
        # trilha. Sem isto a lista mostraria "não iniciada" para quem já tem XP.
        select_starter_creature(user=self.user, creature_slug="shellby")
        creditar_exercicio(user=self.user, exercicio=self.exercicio)

        self.assertEqual(trilhas_iniciadas(user=self.user), [self.trilha.slug])

    def test_iniciar_e_concluir_nao_duplica_o_slug(self):
        select_starter_creature(user=self.user, creature_slug="shellby")
        iniciar_trilha(user=self.user, trilha=self.trilha)
        creditar_exercicio(user=self.user, exercicio=self.exercicio)

        self.assertEqual(trilhas_iniciadas(user=self.user), [self.trilha.slug])


class IniciarTrilhaApiTest(APITestCase):
    def setUp(self):
        self.user = criar_aluno()
        self.exercicio = criar_exercicio()
        self.trilha = self.exercicio.trilha
        self.client.force_authenticate(self.user)

    def test_sem_sessao_nao_passa(self):
        self.client.force_authenticate(None)

        resposta = self.client.post(rota(self.trilha.slug))

        self.assertIn(
            resposta.status_code,
            {status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN},
        )

    def test_primeira_chamada_devolve_201(self):
        resposta = self.client.post(rota(self.trilha.slug))

        self.assertEqual(resposta.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resposta.data["trilha"], self.trilha.slug)
        self.assertIn("iniciada_em", resposta.data)

    def test_segunda_chamada_devolve_200_com_o_mesmo_corpo(self):
        # O botão pode ser clicado duas vezes, e a segunda não é falha: devolver
        # 409 faria a tela tratar como erro um estado que está correto.
        primeira = self.client.post(rota(self.trilha.slug))
        segunda = self.client.post(rota(self.trilha.slug))

        self.assertEqual(segunda.status_code, status.HTTP_200_OK)
        self.assertEqual(segunda.data["trilha"], primeira.data["trilha"])
        self.assertEqual(TrilhaIniciada.objects.count(), 1)

    def test_trilha_inexistente_devolve_404(self):
        resposta = self.client.post(rota("nao-existe"))

        self.assertEqual(resposta.status_code, status.HTTP_404_NOT_FOUND)

    def test_trilha_em_rascunho_devolve_404(self):
        # Rascunho não existe para o aluno: 404, e não 403, para a rota não
        # confirmar que a trilha existe em algum lugar.
        Trilha.objects.create(
            slug="oculta",
            nome="Oculta",
            descricao="...",
            ordem=99,
            status=StatusEditorial.RASCUNHO,
        )

        resposta = self.client.post(rota("oculta"))

        self.assertEqual(resposta.status_code, status.HTTP_404_NOT_FOUND)


class MinhasTrilhasIniciadasApiTest(APITestCase):
    def setUp(self):
        self.user = criar_aluno()
        self.exercicio = criar_exercicio()
        self.trilha = self.exercicio.trilha
        self.client.force_authenticate(self.user)

    def test_sem_sessao_nao_passa(self):
        self.client.force_authenticate(None)

        resposta = self.client.get(reverse("progressao:minhas-trilhas-iniciadas"))

        self.assertIn(
            resposta.status_code,
            {status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN},
        )

    def test_lista_o_que_foi_iniciado(self):
        self.client.post(rota(self.trilha.slug))

        resposta = self.client.get(reverse("progressao:minhas-trilhas-iniciadas"))

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertEqual(resposta.data, [self.trilha.slug])

    def test_o_que_outro_aluno_iniciou_nao_vaza(self):
        outro = criar_aluno("outro")
        iniciar_trilha(user=outro, trilha=self.trilha)

        resposta = self.client.get(reverse("progressao:minhas-trilhas-iniciadas"))

        self.assertEqual(resposta.data, [])
