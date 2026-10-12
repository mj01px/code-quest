from datetime import timedelta
from unittest import mock

from django.test import TestCase
from django.utils import timezone

from apps.clas.models import Cargo, Cla, MembroDoCla
from apps.clas.tests.helpers import montar_cla
from apps.contas.lgpd import anonimizar_conta
from apps.contas.tests.helpers import criar_aluno


class ExclusaoDeContaTest(TestCase):
    def setUp(self):
        self.lider = criar_aluno("lider")
        self.cla = montar_cla(self.lider)

    def _entrar(self, nickname, cargo=Cargo.MEMBRO, dias_atras=0):
        return MembroDoCla.objects.create(
            cla=self.cla,
            user=criar_aluno(nickname),
            cargo=cargo,
            entrou_em=timezone.now() - timedelta(days=dias_atras),
        )

    def _lider_atual(self):
        return self.cla.membros.get(cargo=Cargo.LIDER)

    def test_membro_excluido_sai_e_libera_a_vaga(self):
        membro = self._entrar("membro")

        anonimizar_conta(membro.user)

        self.assertFalse(MembroDoCla.objects.filter(pk=membro.pk).exists())
        self.assertEqual(self.cla.membros.count(), 1)
        self.assertEqual(self._lider_atual().user, self.lider)

    def test_lider_passa_pro_colider_mais_antigo(self):
        # o mais antigo entra depois no banco, pra ordem não vir da inserção
        self._entrar("colider_novo", Cargo.COLIDER, dias_atras=1)
        antigo = self._entrar("colider_antigo", Cargo.COLIDER, dias_atras=30)
        self._entrar("membro_veterano", dias_atras=90)

        anonimizar_conta(self.lider)

        self.assertEqual(self._lider_atual().pk, antigo.pk)
        self.assertEqual(self.cla.membros.count(), 3)

    def test_sem_colider_passa_pra_um_membro(self):
        membros = {self._entrar(f"membro{i}").pk for i in range(3)}

        anonimizar_conta(self.lider)

        self.assertIn(self._lider_atual().pk, membros)
        self.assertEqual(self.cla.membros.filter(cargo=Cargo.LIDER).count(), 1)

    def test_lider_sozinho_apaga_o_cla(self):
        anonimizar_conta(self.lider)
        self.assertFalse(Cla.objects.filter(pk=self.cla.pk).exists())

    def test_quem_nao_tem_cla_nao_quebra(self):
        user = criar_aluno("solto")
        self.assertTrue(anonimizar_conta(user))

    def test_falha_no_cla_desfaz_a_exclusao(self):
        with (
            mock.patch(
                "apps.clas.signals.remover_conta_excluida",
                side_effect=RuntimeError("falhou"),
            ),
            self.assertRaises(RuntimeError),
        ):
            anonimizar_conta(self.lider)

        self.lider.refresh_from_db()
        self.assertIsNone(self.lider.anonymized_at)
        self.assertEqual(self._lider_atual().user, self.lider)
