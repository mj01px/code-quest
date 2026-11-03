"""RF37: perfil público, aberto a partir do ranking e da lista de membros do clã."""

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.conquistas.models import Conquista, ConquistaDesbloqueada
from apps.contas.tests.helpers import criar_aluno
from apps.gamificacao.services import select_starter_creature


def _rota(nickname):
    return reverse("ranking:perfil", kwargs={"nickname": nickname})


class PerfilPublicoTest(TestCase):
    def setUp(self):
        self.cliente = APIClient()
        self.cliente.force_authenticate(user=criar_aluno("visitante"))
        self.ana = criar_aluno("ana")

    def test_mostra_criatura_nivel_xp_e_so_as_conquistas_obtidas(self):
        select_starter_creature(user=self.ana, creature_slug="shellby")
        obtida, pendente = Conquista.objects.filter(ativa=True)[:2]
        ConquistaDesbloqueada.objects.create(user=self.ana, conquista=obtida)

        resposta = self.cliente.get(_rota("ANA"))  # nickname sem caixa

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data["nickname"], "ana")
        self.assertEqual(resposta.data["nivel"], 1)
        self.assertEqual(resposta.data["xp_total"], 0)
        self.assertIsNotNone(resposta.data["criatura"])
        self.assertEqual(
            [c["slug"] for c in resposta.data["conquistas"]], [obtida.slug]
        )
        self.assertNotIn("email", resposta.data)

    def test_sem_criatura_nivel_e_nulo(self):
        resposta = self.cliente.get(_rota("ana"))

        self.assertEqual(resposta.status_code, 200)
        self.assertIsNone(resposta.data["nivel"])
        self.assertIsNone(resposta.data["criatura"])

    def test_inexistente_inativo_e_anonimizado_dao_404(self):
        inativo = criar_aluno("inativo", is_active=False)
        anonimo = criar_aluno("anonimo")
        anonimo.anonimizar()

        self.assertEqual(self.cliente.get(_rota("ninguem")).status_code, 404)
        self.assertEqual(self.cliente.get(_rota(inativo.nickname)).status_code, 404)
        self.assertEqual(self.cliente.get(_rota(anonimo.nickname)).status_code, 404)

    def test_exige_login(self):
        self.assertEqual(APIClient().get(_rota("ana")).status_code, 401)
