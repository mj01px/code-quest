"""A criatura evolui com o nível, e nunca regride.

`apply_level_to_creatures` é o gancho que a gamificação vai chamar de dentro da
transação que credita XP, e o que ela devolve é a lista das criaturas que
evoluíram. Essa lista é o gatilho da animação de "sua criatura evoluiu", então
ela precisa vir vazia quando nada mudou: devolver a criatura toda vez faria a
interface tocar a animação a cada exercício resolvido.

A não regressão é decisão de produto, não descuido. Se um ajuste de regra
rebaixar o nível de alguém, a criatura que já evoluiu não volta a ser filhote:
tirar do aluno uma conquista já concedida é pior do que a inconsistência.
"""

from django.test import TestCase

from apps.gamificacao.models import Stage, UserCreature
from apps.gamificacao.services import apply_level_to_creatures, select_starter_creature

from apps.contas.tests.helpers import criar_aluno


class EvolucaoTest(TestCase):
    def setUp(self):
        self.user = criar_aluno()
        select_starter_creature(user=self.user, creature_slug="shellby")

    def _posse(self) -> UserCreature:
        return UserCreature.objects.get(user=self.user, creature_id="shellby")

    def test_nivel_abaixo_do_limiar_nao_evolui(self):
        self.assertEqual(apply_level_to_creatures(user=self.user, level=5), [])
        self.assertEqual(self._posse().current_stage, Stage.HATCHLING)

    def test_atingir_o_limiar_evolui_e_devolve_a_criatura(self):
        evoluidas = apply_level_to_creatures(user=self.user, level=12)
        self.assertEqual(len(evoluidas), 1)
        self.assertEqual(self._posse().current_stage, Stage.JUVENILE)

    def test_evolucao_grava_o_momento(self):
        apply_level_to_creatures(user=self.user, level=12)
        self.assertIsNotNone(self._posse().evolved_at)

    def test_repetir_o_mesmo_nivel_nao_dispara_de_novo(self):
        apply_level_to_creatures(user=self.user, level=12)
        self.assertEqual(apply_level_to_creatures(user=self.user, level=12), [])

    def test_queda_de_nivel_nao_rebaixa_o_estagio(self):
        apply_level_to_creatures(user=self.user, level=12)
        self.assertEqual(apply_level_to_creatures(user=self.user, level=3), [])
        self.assertEqual(self._posse().current_stage, Stage.JUVENILE)

    def test_salto_direto_para_adulto(self):
        evoluidas = apply_level_to_creatures(user=self.user, level=30)
        self.assertEqual(len(evoluidas), 1)
        self.assertEqual(self._posse().current_stage, Stage.ADULT)

    def test_usuario_sem_criatura_nao_quebra(self):
        outro = criar_aluno("sempet")
        self.assertEqual(apply_level_to_creatures(user=outro, level=50), [])


class MultiplasCriaturasTest(TestCase):
    """O aluno coleta criaturas conforme entra em cada domínio."""

    def setUp(self):
        self.user = criar_aluno()
        select_starter_creature(user=self.user, creature_slug="shellby")
        UserCreature.objects.create(user=self.user, creature_id="blaze")

    def test_evolui_todas_as_criaturas_do_usuario_de_uma_vez(self):
        evoluidas = apply_level_to_creatures(user=self.user, level=10)
        self.assertEqual(len(evoluidas), 2)
        estagios = set(
            UserCreature.objects.filter(user=self.user).values_list(
                "current_stage", flat=True
            )
        )
        self.assertEqual(estagios, {Stage.JUVENILE})

    def test_nao_afeta_criatura_de_outro_usuario(self):
        outro = criar_aluno("vizinho")
        select_starter_creature(user=outro, creature_slug="slyth")
        apply_level_to_creatures(user=self.user, level=30)
        posse_alheia = UserCreature.objects.get(user=outro)
        self.assertEqual(posse_alheia.current_stage, Stage.HATCHLING)
