"""Dois cenários de integração de "iniciar trilha" que `test_iniciar_trilha.py`
não fecha: o corpo do erro 4xx e a persistência recuperada campo a campo.

O primeiro passa por rota, view, serviço e banco reais; o segundo grava e lê
direto no PostgreSQL de teste. Cada teste monta a própria trilha, sem depender
de dados pré-cadastrados.
"""

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.contas.tests.helpers import criar_aluno
from apps.progressao.models import TrilhaIniciada
from apps.trilhas.models import StatusEditorial, Trilha


def rota_iniciar(slug: str) -> str:
    return reverse("progressao:iniciar-trilha", args=[slug])


class IniciarTrilhaIntegracaoTest(APITestCase):
    def setUp(self):
        self.aluno = criar_aluno()
        self.trilha = Trilha.objects.create(
            slug="python-basico",
            nome="Python Básico",
            descricao="Primeiros passos.",
            ordem=1,
            status=StatusEditorial.PUBLICADO,
        )
        self.client.force_authenticate(self.aluno)

    def test_post_em_trilha_em_rascunho_devolve_404_com_envelope_de_erro(self):
        Trilha.objects.create(
            slug="rascunho",
            nome="Rascunho",
            descricao="Ainda não publicada.",
            ordem=2,
            status=StatusEditorial.RASCUNHO,
        )

        resposta = self.client.post(rota_iniciar("rascunho"))

        self.assertEqual(resposta.status_code, status.HTTP_404_NOT_FOUND)
        erro = resposta.data["error"]
        self.assertEqual(set(erro), {"code", "message", "details"})
        self.assertEqual(erro["code"], "not_found")
        self.assertTrue(erro["message"])
        self.assertEqual(erro["details"], [])
        self.assertFalse(TrilhaIniciada.objects.filter(user=self.aluno).exists())

    def test_marca_salva_pelo_orm_volta_igual_do_banco(self):
        salva = TrilhaIniciada.objects.create(user=self.aluno, trilha=self.trilha)

        recuperada = TrilhaIniciada.objects.get(pk=salva.pk)

        self.assertEqual(recuperada.user_id, self.aluno.pk)
        self.assertEqual(recuperada.trilha_id, self.trilha.pk)
        self.assertEqual(recuperada.iniciada_em, salva.iniciada_em)
