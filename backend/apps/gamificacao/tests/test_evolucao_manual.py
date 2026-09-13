"""Evoluir é escolha do aluno, e sobe exatamente um estágio por vez.

Duas regras de produto moram aqui. A primeira: cruzar o nível não evolui nada
sozinho, só abre a porta. A segunda: nunca pular estágio, nem para quem chega
ao nível final ainda em filhote — a forma intermediária existe para ser vista,
e pular tiraria do aluno uma evolução que ele ganhou.
"""

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.contas.tests.helpers import criar_aluno
from apps.gamificacao.models import Stage, UserCreature
from apps.gamificacao.services import select_starter_creature
from apps.progressao.models import ProgressoCriatura
from apps.progressao.services import criatura_ativa, evoluir_criatura, obter_progresso


def rota(slug: str) -> str:
    return reverse("gamificacao:evoluir-criatura", args=[slug])


class BaseEvolucao(TestCase):
    def setUp(self):
        self.user = criar_aluno()
        select_starter_creature(user=self.user, creature_slug="shellby")

    def _posse(self) -> UserCreature:
        return UserCreature.objects.get(user=self.user, creature_id="shellby")

    def _no_nivel(self, numero: int) -> None:
        """Coloca a conta no nível pedido, sem passar por exercício nenhum."""
        progresso = obter_progresso(criatura_ativa(self.user))
        ProgressoCriatura.objects.filter(pk=progresso.pk).update(nivel_id=numero)


class EvolucaoServicoTest(BaseEvolucao):
    def test_nivel_insuficiente_recusa(self):
        self._no_nivel(9)

        with self.assertRaises(ValidationError):
            evoluir_criatura(user=self.user, posse=self._posse())

        self.assertEqual(self._posse().current_stage, Stage.HATCHLING)

    def test_no_limiar_evolui_um_estagio(self):
        self._no_nivel(10)

        posse, partiu_de, evoluiu = evoluir_criatura(
            user=self.user, posse=self._posse()
        )

        self.assertTrue(evoluiu)
        self.assertEqual(partiu_de, Stage.HATCHLING)
        self.assertEqual(posse.current_stage, Stage.JUVENILE)
        self.assertIsNotNone(posse.evolved_at)

    def test_nivel_alto_nao_pula_estagio(self):
        # A regra central: nível 25 com criatura em filhote sobe para JOVEM, e
        # não direto para ADULTO. O aluno precisa apertar de novo.
        self._no_nivel(25)

        posse, _, _ = evoluir_criatura(user=self.user, posse=self._posse())
        self.assertEqual(posse.current_stage, Stage.JUVENILE)

        posse, partiu_de, _ = evoluir_criatura(user=self.user, posse=self._posse())
        self.assertEqual(partiu_de, Stage.JUVENILE)
        self.assertEqual(posse.current_stage, Stage.ADULT)

    def test_o_segundo_passo_tambem_cobra_o_nivel(self):
        # Nível 10 chega para o estágio 2 e não para o 3.
        self._no_nivel(10)
        evoluir_criatura(user=self.user, posse=self._posse())

        with self.assertRaises(ValidationError):
            evoluir_criatura(user=self.user, posse=self._posse())

        self.assertEqual(self._posse().current_stage, Stage.JUVENILE)

    def test_forma_final_nao_evolui_mais(self):
        self._no_nivel(25)
        evoluir_criatura(user=self.user, posse=self._posse())
        evoluir_criatura(user=self.user, posse=self._posse())

        with self.assertRaises(ValidationError):
            evoluir_criatura(user=self.user, posse=self._posse())

    def test_pedido_que_perde_a_corrida_nao_regride(self):
        # Dois cliques no mesmo instante: o segundo encontra a criatura já na
        # forma nova. Ele não pode gravar por cima com o estágio que leu antes.
        self._no_nivel(25)
        atrasado = self._posse()

        evoluir_criatura(user=self.user, posse=self._posse())  # vira JUVENILE

        posse, partiu_de, evoluiu = evoluir_criatura(user=self.user, posse=atrasado)

        self.assertFalse(evoluiu)
        self.assertEqual(partiu_de, Stage.HATCHLING)
        self.assertEqual(posse.current_stage, Stage.JUVENILE)

    def test_reserva_nova_nao_pega_carona_no_nivel_da_principal(self):
        # O XP é POR CRIATURA: `ProgressoCriatura` é um-para-um com a posse e
        # só a ativa recebe crédito. Uma criatura recém-comprada está no nível
        # 1 mesmo com a principal no 25, e não pode evoluir de graça.
        from apps.gamificacao.services import adquirir_criatura

        reserva = adquirir_criatura(user=self.user, creature_slug="blaze")
        self._no_nivel(25)  # o nível da ATIVA, que é a shellby

        with self.assertRaises(ValidationError):
            evoluir_criatura(user=self.user, posse=reserva)

        reserva.refresh_from_db()
        self.assertEqual(reserva.current_stage, Stage.HATCHLING)

    def test_reserva_evolui_com_o_proprio_nivel(self):
        from apps.gamificacao.services import adquirir_criatura

        reserva = adquirir_criatura(user=self.user, creature_slug="blaze")
        progresso = obter_progresso(reserva)
        ProgressoCriatura.objects.filter(pk=progresso.pk).update(nivel_id=10)

        posse, _, evoluiu = evoluir_criatura(user=self.user, posse=reserva)

        self.assertTrue(evoluiu)
        self.assertEqual(posse.current_stage, Stage.JUVENILE)


class EvolucaoApiTest(APITestCase):
    def setUp(self):
        self.user = criar_aluno()
        select_starter_creature(user=self.user, creature_slug="shellby")
        self.client.force_authenticate(self.user)

    def _no_nivel(self, numero: int) -> None:
        progresso = obter_progresso(criatura_ativa(self.user))
        ProgressoCriatura.objects.filter(pk=progresso.pk).update(nivel_id=numero)

    def test_sem_sessao_nao_passa(self):
        self.client.force_authenticate(None)

        resposta = self.client.post(rota("shellby"))

        self.assertIn(
            resposta.status_code,
            {status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN},
        )

    def test_devolve_os_dois_estagios_da_transicao(self):
        # A animação precisa dos dois sprites: de onde saiu e onde chegou.
        self._no_nivel(10)

        resposta = self.client.post(rota("shellby"))

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertTrue(resposta.data["evoluiu"])
        self.assertEqual(resposta.data["estagio_anterior"], Stage.HATCHLING)
        self.assertEqual(resposta.data["criatura"]["estagio_atual"], Stage.JUVENILE)

    def test_nivel_insuficiente_devolve_400(self):
        resposta = self.client.post(rota("shellby"))

        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)

    def test_criatura_que_o_aluno_nao_tem_devolve_404(self):
        resposta = self.client.post(rota("slyth"))

        self.assertEqual(resposta.status_code, status.HTTP_404_NOT_FOUND)

    def test_a_criatura_de_outro_aluno_devolve_404(self):
        outro = criar_aluno("outro")
        select_starter_creature(user=outro, creature_slug="blaze")

        resposta = self.client.post(rota("blaze"))

        self.assertEqual(resposta.status_code, status.HTTP_404_NOT_FOUND)

    def test_a_listagem_anuncia_o_que_falta_para_evoluir(self):
        resposta = self.client.get(reverse("gamificacao:minhas-criaturas"))

        posse = resposta.data[0]
        self.assertEqual(posse["proximo_estagio"], Stage.JUVENILE)
        self.assertEqual(posse["nivel_para_evoluir"], 10)
        self.assertFalse(posse["pode_evoluir"])

    def test_a_listagem_libera_o_botao_no_limiar(self):
        self._no_nivel(10)

        resposta = self.client.get(reverse("gamificacao:minhas-criaturas"))

        self.assertTrue(resposta.data[0]["pode_evoluir"])

    def test_a_listagem_nao_libera_o_botao_da_reserva_nova(self):
        # O bug: comprar uma criatura com a principal adiantada acendia o botão
        # de evoluir da recém-chegada, que tem zero de XP.
        from apps.gamificacao.services import adquirir_criatura

        adquirir_criatura(user=self.user, creature_slug="blaze")
        self._no_nivel(25)

        resposta = self.client.get(reverse("gamificacao:minhas-criaturas"))
        por_slug = {p["criatura"]["slug"]: p for p in resposta.data}

        self.assertTrue(por_slug["shellby"]["pode_evoluir"])
        self.assertFalse(por_slug["blaze"]["pode_evoluir"])
        self.assertEqual(por_slug["blaze"]["nivel"], 1)

    def test_evoluir_a_reserva_nova_e_recusado(self):
        from apps.gamificacao.services import adquirir_criatura

        adquirir_criatura(user=self.user, creature_slug="blaze")
        self._no_nivel(25)

        resposta = self.client.post(rota("blaze"))

        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)

    def test_na_forma_final_nao_ha_proximo_estagio(self):
        self._no_nivel(25)
        self.client.post(rota("shellby"))
        self.client.post(rota("shellby"))

        resposta = self.client.get(reverse("gamificacao:minhas-criaturas"))

        posse = resposta.data[0]
        self.assertIsNone(posse["proximo_estagio"])
        self.assertIsNone(posse["nivel_para_evoluir"])
        self.assertFalse(posse["pode_evoluir"])
