"""A criatura inicial é escolhida uma vez só, e isso é garantido no banco.

A checagem em Python dá a mensagem de erro boa, mas sozinha ela não segura duas
requisições de cadastro simultâneas: as duas passariam pela verificação antes
de qualquer uma gravar. Por isso existe também um índice único parcial, e é ele
que este arquivo testa diretamente, contornando a camada de serviço.

Os códigos de erro são testados um a um porque é por eles que a interface
distingue "essa criatura não existe" de "essa criatura ainda não está
disponível". E há uma pegadinha da API do Django envolvida: em
`ValidationError({"campo": "msg"}, code="x")` o código é descartado em
silêncio, então ele precisa ir no erro interno. Se alguém reintroduzir a forma
errada, estes testes quebram.
"""

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import ProtectedError
from django.test import TestCase

from apps.contas.tests.helpers import criar_aluno
from apps.gamificacao.models import Creature, Stage, UserCreature
from apps.gamificacao.services import select_starter_creature


class EscolhaBemSucedidaTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = criar_aluno()
        cls.posse = select_starter_creature(user=cls.user, creature_slug="shellby")

    def test_marca_como_inicial(self):
        self.assertTrue(self.posse.is_starter)

    def test_nasce_filhote(self):
        self.assertEqual(self.posse.current_stage, Stage.HATCHLING)

    def test_aparece_no_related_name_do_usuario(self):
        self.assertEqual(self.user.creatures.count(), 1)
        self.assertEqual(self.user.creatures.first().creature_id, "shellby")

    def test_ainda_nao_evoluiu(self):
        self.assertIsNone(self.posse.evolved_at)


class RecusasTest(TestCase):
    def setUp(self):
        self.user = criar_aluno()

    def _codigo(self, slug):
        with self.assertRaises(ValidationError) as ctx:
            select_starter_creature(user=self.user, creature_slug=slug)
        return ctx.exception.error_dict["creature"][0].code

    def test_slug_inexistente(self):
        self.assertEqual(self._codigo("nao_existe"), "criatura_inexistente")

    def test_criatura_indisponivel(self):
        self.assertEqual(self._codigo("raposa"), "criatura_indisponivel")

    def test_segunda_escolha(self):
        select_starter_creature(user=self.user, creature_slug="shellby")
        self.assertEqual(self._codigo("blaze"), "inicial_ja_escolhida")

    def test_recusa_nao_deixa_registro_no_banco(self):
        for slug in ("nao_existe", "raposa"):
            with self.subTest(slug=slug):
                self._codigo(slug)
        self.assertFalse(UserCreature.objects.filter(user=self.user).exists())


class GarantiasNoBancoTest(TestCase):
    """Contorna o serviço de propósito, para provar que o banco também segura."""

    def setUp(self):
        self.user = criar_aluno()
        UserCreature.objects.create(
            user=self.user, creature_id="shellby", is_starter=True
        )

    def test_indice_parcial_barra_duas_iniciais(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            UserCreature.objects.create(
                user=self.user, creature_id="blaze", is_starter=True
            )

    def test_permite_segunda_criatura_desde_que_nao_seja_inicial(self):
        # O aluno coleta as demais criaturas conforme entra em cada domínio.
        # O que é único é a inicial, não a posse.
        UserCreature.objects.create(user=self.user, creature_id="blaze")
        self.assertEqual(self.user.creatures.count(), 2)

    def test_barra_a_mesma_criatura_duas_vezes(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            UserCreature.objects.create(user=self.user, creature_id="shellby")

    def test_criatura_em_uso_nao_pode_ser_apagada(self):
        # PROTECT: apagar do catálogo não pode levar junto, em silêncio, o
        # histórico de quem a escolheu. Para tirar de circulação existe o
        # is_available.
        with self.assertRaises(ProtectedError), transaction.atomic():
            Creature.objects.get(pk="shellby").delete()
