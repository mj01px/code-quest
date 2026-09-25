"""Prova que as capacidades de criatura passam pelo RBAC: remover o código do
nível de acesso bloqueia a ação (403), mesmo com o usuário logado.
"""

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.contas.models import NivelDeAcesso, Permissao
from apps.contas.tests.helpers import criar_aluno
from apps.gamificacao.services import select_starter_creature


class RbacCriaturaTest(APITestCase):
    def setUp(self):
        self.user = criar_aluno("rbac_criatura")
        self.client.force_authenticate(self.user)

    def _remover(self, *codenames):
        """Põe o usuário num nível que tem tudo, menos os códigos dados."""
        nivel = NivelDeAcesso.objects.create(
            nome="nivel_sem_" + "_".join(c.split(".")[-1] for c in codenames)
        )
        nivel.permissoes.set(Permissao.objects.exclude(codename__in=codenames))
        self.user.nivel_de_acesso = nivel
        self.user.save(update_fields=["nivel_de_acesso"])
        self.user.invalidar_cache_permissoes()

    def test_ver_minhas_criaturas_exige_criaturas_view(self):
        url = reverse("gamificacao:minhas-criaturas")
        self.assertEqual(self.client.get(url).status_code, status.HTTP_200_OK)

        self._remover("criaturas.view")
        self.assertEqual(
            self.client.get(url).status_code, status.HTTP_403_FORBIDDEN
        )

    def test_adquirir_exige_criaturas_acquire(self):
        url = reverse("gamificacao:adquirir-criatura")
        self._remover("criaturas.acquire")
        r = self.client.post(url, {"criatura": "slyth"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_evoluir_exige_criaturas_evolve(self):
        select_starter_creature(user=self.user, creature_slug="shellby")
        self._remover("criaturas.evolve")
        url = reverse(
            "gamificacao:evoluir-criatura", kwargs={"creature_slug": "shellby"}
        )
        self.assertEqual(
            self.client.post(url).status_code, status.HTTP_403_FORBIDDEN
        )
