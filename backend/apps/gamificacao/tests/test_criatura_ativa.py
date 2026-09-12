from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.gamificacao.models import Creature, Stage, UserCreature
from apps.gamificacao.services import definir_criatura_ativa, select_starter_creature
from apps.progressao.models import ProgressoCriatura

from apps.contas.tests.helpers import criar_aluno


def _outra_disponivel(exceto: str) -> str:
    return (
        Creature.objects.filter(is_available=True)
        .exclude(pk=exceto)
        .order_by("display_order", "slug")
        .first()
        .pk
    )


class InicialNasceAtivaTest(APITestCase):
    def setUp(self):
        self.usuario = criar_aluno("dono")

    def test_a_inicial_ja_vem_ativa(self):
        posse = select_starter_creature(user=self.usuario, creature_slug="blaze")

        self.assertTrue(posse.is_active)
        self.assertTrue(posse.is_starter)

    def test_quem_tem_uma_criatura_tem_uma_ativa(self):
        select_starter_creature(user=self.usuario, creature_slug="blaze")

        self.assertEqual(
            UserCreature.objects.filter(user=self.usuario, is_active=True).count(), 1
        )


class TrocarAtivaTest(APITestCase):
    def setUp(self):
        self.usuario = criar_aluno("dono")
        self.inicial = select_starter_creature(user=self.usuario, creature_slug="blaze")
        self.outra_slug = _outra_disponivel("blaze")
        self.outra = UserCreature.objects.create(
            user=self.usuario, creature_id=self.outra_slug
        )

    def test_troca_a_ativa(self):
        definir_criatura_ativa(user=self.usuario, creature_slug=self.outra_slug)

        self.inicial.refresh_from_db()
        self.outra.refresh_from_db()
        self.assertFalse(self.inicial.is_active)
        self.assertTrue(self.outra.is_active)

    def test_continua_existindo_exatamente_uma_ativa(self):
        definir_criatura_ativa(user=self.usuario, creature_slug=self.outra_slug)

        self.assertEqual(
            UserCreature.objects.filter(user=self.usuario, is_active=True).count(), 1
        )

    def test_a_inicial_continua_sendo_a_inicial(self):
        definir_criatura_ativa(user=self.usuario, creature_slug=self.outra_slug)

        self.inicial.refresh_from_db()
        self.assertTrue(self.inicial.is_starter)

    def test_ativar_a_que_ja_esta_ativa_nao_faz_nada(self):
        posse = definir_criatura_ativa(user=self.usuario, creature_slug="blaze")

        self.assertTrue(posse.is_active)
        self.assertEqual(
            UserCreature.objects.filter(user=self.usuario, is_active=True).count(), 1
        )

    def test_nao_da_para_ativar_criatura_que_nao_possui(self):
        alheia = (
            Creature.objects.exclude(
                pk__in=UserCreature.objects.filter(user=self.usuario).values("creature")
            )
            .first()
            .pk
        )

        with self.assertRaises(ValidationError):
            definir_criatura_ativa(user=self.usuario, creature_slug=alheia)

    def test_o_banco_recusa_duas_ativas(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            UserCreature.objects.filter(pk=self.outra.pk).update(is_active=True)
            UserCreature.objects.create(
                user=self.usuario,
                creature_id=_outra_disponivel(self.outra_slug),
                is_active=True,
            )


class CriaturaAtivaApiTest(APITestCase):
    def setUp(self):
        self.url = reverse("gamificacao:criatura-ativa")
        self.usuario = criar_aluno("dono")
        self.client.force_authenticate(self.usuario)

    def _com_duas(self):
        select_starter_creature(user=self.usuario, creature_slug="blaze")
        outra = _outra_disponivel("blaze")
        UserCreature.objects.create(user=self.usuario, creature_id=outra)
        return outra

    def test_exige_autenticacao(self):
        self.client.force_authenticate(None)
        self.assertEqual(
            self.client.get(self.url).status_code, status.HTTP_401_UNAUTHORIZED
        )

    def test_sem_criatura_nenhuma_devolve_vazio(self):
        r = self.client.get(self.url)

        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)

    def test_devolve_a_ativa(self):
        select_starter_creature(user=self.usuario, creature_slug="blaze")

        r = self.client.get(self.url)

        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["criatura"]["slug"], "blaze")
        self.assertTrue(r.data["ativa"])

    def test_troca_pela_api(self):
        outra = self._com_duas()

        r = self.client.put(self.url, {"criatura": outra}, format="json")

        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["criatura"]["slug"], outra)
        self.assertTrue(r.data["ativa"])

    def test_criatura_que_nao_possui_e_recusada(self):
        select_starter_creature(user=self.usuario, creature_slug="blaze")

        r = self.client.put(
            self.url, {"criatura": _outra_disponivel("blaze")}, format="json"
        )

        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            r.data["error"]["details"][0]["code"], "criatura_nao_possuida"
        )

    def test_criatura_inexistente_e_recusada(self):
        select_starter_creature(user=self.usuario, creature_slug="blaze")

        r = self.client.put(self.url, {"criatura": "nao-existe"}, format="json")

        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nao_mexe_na_criatura_de_outro_usuario(self):
        self._com_duas()
        vizinho = criar_aluno("vizinho")
        dele = select_starter_creature(user=vizinho, creature_slug="shellby")

        self.client.put(self.url, {"criatura": "blaze"}, format="json")

        dele.refresh_from_db()
        self.assertTrue(dele.is_active)

    def test_a_listagem_marca_qual_esta_ativa(self):
        outra = self._com_duas()
        self.client.put(self.url, {"criatura": outra}, format="json")

        r = self.client.get(reverse("gamificacao:minhas-criaturas"))

        ativas = [c["criatura"]["slug"] for c in r.data if c["ativa"]]
        self.assertEqual(ativas, [outra])

    def test_a_ativa_vem_primeiro_na_listagem(self):
        outra = self._com_duas()
        self.client.put(self.url, {"criatura": outra}, format="json")

        r = self.client.get(reverse("gamificacao:minhas-criaturas"))

        self.assertEqual(r.data[0]["criatura"]["slug"], outra)


class AtivarNaoHerdaProgressoTest(TestCase):
    """Ativar uma criatura não copia o progresso da anterior.

    `ProgressoCriatura` é OneToOne com `UserCreature`: cada criatura tem o seu
    `xp_total` e o seu `nivel`. Logo o estágio de cada uma segue o nível DELA.
    Uma criatura recém-ativada em nível 1 é HATCHLING mesmo que a anterior já
    fosse ADULTA — e `definir_criatura_ativa` não sincroniza estágio de
    propósito. Sincronizar contra o nível da outra é que seria o defeito.

    O teste trava a não-herança, não a decisão de produto de manter progressos
    separados: se um dia o XP passar a ser compartilhado, a cópia terá que ser
    explícita, e não efeito colateral da ativação.
    """

    def setUp(self):
        self.usuario = criar_aluno("dono")
        self.antiga = select_starter_creature(
            user=self.usuario, creature_slug="shellby"
        )
        self.nova = UserCreature.objects.create(
            user=self.usuario, creature_id=_outra_disponivel("shellby")
        )

        # Antiga adiantada; nova recém-adquirida, no começo da própria curva.
        UserCreature.objects.filter(pk=self.antiga.pk).update(
            current_stage=Stage.JUVENILE, evolved_at=timezone.now()
        )
        ProgressoCriatura.objects.create(
            user_creature=self.antiga, xp_total=4500, nivel_id=10
        )
        ProgressoCriatura.objects.create(
            user_creature=self.nova, xp_total=0, nivel_id=1
        )

    def test_ativar_criatura_nao_contamina_progresso_da_outra(self):
        antes_antiga = UserCreature.objects.get(pk=self.antiga.pk)

        definir_criatura_ativa(
            user=self.usuario, creature_slug=self.nova.creature_id
        )

        nova = UserCreature.objects.get(pk=self.nova.pk)
        antiga = UserCreature.objects.get(pk=self.antiga.pk)

        self.assertTrue(nova.is_active)
        self.assertFalse(antiga.is_active)

        # A nova não herda estágio nem XP da anterior.
        self.assertEqual(nova.current_stage, Stage.HATCHLING)
        self.assertIsNone(nova.evolved_at)
        self.assertEqual(nova.progresso.xp_total, 0)
        self.assertEqual(nova.progresso.nivel_id, 1)

        # E a anterior não regride nem perde o carimbo ao sair de cena.
        self.assertEqual(antiga.current_stage, Stage.JUVENILE)
        self.assertEqual(antiga.evolved_at, antes_antiga.evolved_at)
        self.assertEqual(antiga.progresso.xp_total, 4500)
        self.assertEqual(antiga.progresso.nivel_id, 10)
