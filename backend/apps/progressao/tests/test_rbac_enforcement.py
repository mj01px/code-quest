"""Prova que iniciar trilha e concluir exercício passam pelo RBAC: remover o
código do nível bloqueia a ação (403).
"""

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.contas.models import NivelDeAcesso, Permissao
from apps.contas.tests.helpers import criar_aluno

from .test_credito_xp import criar_exercicio


class RbacProgressaoTest(APITestCase):
    def setUp(self):
        self.user = criar_aluno("rbac_prog")
        self.client.force_authenticate(self.user)
        self.exercicio = criar_exercicio(slug="ex-rbac")
        self.trilha = self.exercicio.trilha

    def _remover(self, *codenames):
        nivel = NivelDeAcesso.objects.create(
            nome="nivel_sem_" + "_".join(c.split(".")[-1] for c in codenames)
        )
        nivel.permissoes.set(Permissao.objects.exclude(codename__in=codenames))
        self.user.nivel_de_acesso = nivel
        self.user.save(update_fields=["nivel_de_acesso"])
        self.user.invalidar_cache_permissoes()

    def test_iniciar_trilha_exige_enroll(self):
        url = reverse("progressao:iniciar-trilha", args=[self.trilha.slug])
        self.assertIn(
            self.client.post(url).status_code,
            (status.HTTP_200_OK, status.HTTP_201_CREATED),
        )

        self._remover("trilhas.enroll")
        self.assertEqual(
            self.client.post(url).status_code, status.HTTP_403_FORBIDDEN
        )

    def test_concluir_exercicio_exige_complete(self):
        self._remover("exercicios.complete")
        url = reverse(
            "progressao:concluir-exercicio",
            kwargs={
                "trilha_slug": self.trilha.slug,
                "exercicio_slug": self.exercicio.slug,
            },
        )
        self.assertEqual(
            self.client.post(url).status_code, status.HTTP_403_FORBIDDEN
        )
