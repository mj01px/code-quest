"""Constraints dos clãs testadas direto no banco, sem passar pelo service."""

import re
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone

from apps.clas.models import (
    NIVEL_MINIMO_GLOBAL,
    TAG_ALFABETO,
    TAG_TAMANHO,
    Bandeira,
    Cargo,
    Cla,
    ConviteDoCla,
    MembroDoCla,
    TipoDeCla,
    gerar_tag,
)
from apps.contas.tests.helpers import criar_aluno


def criar_cla(**extra) -> Cla:
    extra.setdefault("nome", "Os Bugados")
    extra.setdefault("bandeira", Bandeira.GUILDA_1)
    return Cla.objects.create(**extra)


def criar_convite(cla: Cla, sufixo: str = "a", **extra) -> ConviteDoCla:
    agora = timezone.now()
    extra.setdefault("criado_em", agora)
    extra.setdefault("expira_em", agora + timedelta(days=7))
    return ConviteDoCla.objects.create(cla=cla, token_hash=sufixo * 64, **extra)


class TagTest(TestCase):
    def test_formato(self):
        padrao = re.compile(rf"^[{TAG_ALFABETO}]{{{TAG_TAMANHO}}}$")
        for _ in range(200):
            self.assertRegex(gerar_tag(), padrao)

    def test_sem_caracteres_ambiguos(self):
        for ambiguo in "0O1I":
            self.assertNotIn(ambiguo, TAG_ALFABETO)

    def test_cla_nasce_com_tag(self):
        self.assertEqual(len(criar_cla().tag), TAG_TAMANHO)

    def test_tag_repetida_e_recusada(self):
        primeiro = criar_cla()
        with self.assertRaises(IntegrityError):
            criar_cla(tag=primeiro.tag)

    def test_tag_fora_do_formato_e_recusada(self):
        for invalida in ("ABC", "abcdefgh", "0OOOOOOO", "ABCDEFG!"):
            with self.subTest(tag=invalida), self.assertRaises(IntegrityError):
                with transaction.atomic():
                    criar_cla(tag=invalida)


class ClaTest(TestCase):
    def test_padroes(self):
        cla = criar_cla()
        self.assertEqual(cla.tipo, TipoDeCla.PUBLICO)
        self.assertEqual(cla.nivel_minimo, NIVEL_MINIMO_GLOBAL)
        self.assertEqual(cla.descricao, "")

    def test_nome_pode_repetir(self):
        criar_cla(nome="Os Bugados")
        criar_cla(nome="Os Bugados")
        self.assertEqual(Cla.objects.filter(nome="Os Bugados").count(), 2)

    def test_nivel_minimo_abaixo_do_global_e_recusado(self):
        with self.assertRaises(IntegrityError):
            criar_cla(nivel_minimo=NIVEL_MINIMO_GLOBAL - 1)

    def test_nivel_minimo_acima_do_global_e_aceito(self):
        self.assertEqual(criar_cla(nivel_minimo=12).nivel_minimo, 12)

    def test_bandeira_fora_da_lista_e_recusada(self):
        with self.assertRaises(IntegrityError):
            criar_cla(bandeira="guilda_9")

    def test_tipo_fora_da_lista_e_recusado(self):
        with self.assertRaises(IntegrityError):
            criar_cla(tipo="SECRETO")

    def test_apagar_o_cla_leva_membros_e_convites(self):
        cla = criar_cla()
        MembroDoCla.objects.create(cla=cla, user=criar_aluno(), cargo=Cargo.LIDER)
        criar_convite(cla)

        cla.delete()

        self.assertFalse(MembroDoCla.objects.exists())
        self.assertFalse(ConviteDoCla.objects.exists())


class MembroTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.cla = criar_cla()
        cls.outro_cla = criar_cla(nome="Outro")

    def test_cargo_padrao_e_membro(self):
        membro = MembroDoCla.objects.create(cla=self.cla, user=criar_aluno())
        self.assertEqual(membro.cargo, Cargo.MEMBRO)

    def test_usuario_nao_entra_em_dois_clas(self):
        user = criar_aluno()
        MembroDoCla.objects.create(cla=self.cla, user=user)
        with self.assertRaises(IntegrityError):
            MembroDoCla.objects.create(cla=self.outro_cla, user=user)

    def test_usuario_nao_entra_duas_vezes_no_mesmo_cla(self):
        user = criar_aluno()
        MembroDoCla.objects.create(cla=self.cla, user=user)
        with self.assertRaises(IntegrityError):
            MembroDoCla.objects.create(cla=self.cla, user=user)

    def test_cla_nao_tem_dois_lideres(self):
        MembroDoCla.objects.create(
            cla=self.cla, user=criar_aluno("lider1"), cargo=Cargo.LIDER
        )
        with self.assertRaises(IntegrityError):
            MembroDoCla.objects.create(
                cla=self.cla, user=criar_aluno("lider2"), cargo=Cargo.LIDER
            )

    def test_promover_a_segundo_lider_tambem_e_recusado(self):
        MembroDoCla.objects.create(
            cla=self.cla, user=criar_aluno("lider"), cargo=Cargo.LIDER
        )
        colider = MembroDoCla.objects.create(
            cla=self.cla, user=criar_aluno("colider"), cargo=Cargo.COLIDER
        )
        colider.cargo = Cargo.LIDER
        with self.assertRaises(IntegrityError):
            colider.save()

    def test_clas_diferentes_tem_cada_um_seu_lider(self):
        MembroDoCla.objects.create(
            cla=self.cla, user=criar_aluno("lider1"), cargo=Cargo.LIDER
        )
        MembroDoCla.objects.create(
            cla=self.outro_cla, user=criar_aluno("lider2"), cargo=Cargo.LIDER
        )
        self.assertEqual(MembroDoCla.objects.filter(cargo=Cargo.LIDER).count(), 2)

    def test_colideres_sem_limite_proprio(self):
        for indice in range(3):
            MembroDoCla.objects.create(
                cla=self.cla, user=criar_aluno(f"colider{indice}"), cargo=Cargo.COLIDER
            )
        self.assertEqual(self.cla.membros.filter(cargo=Cargo.COLIDER).count(), 3)

    def test_cargo_fora_da_lista_e_recusado(self):
        with self.assertRaises(IntegrityError):
            MembroDoCla.objects.create(cla=self.cla, user=criar_aluno(), cargo="ANCIAO")


class ConviteTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.cla = criar_cla(tipo=TipoDeCla.PRIVADO)

    def test_um_convite_ativo_por_cla(self):
        criar_convite(self.cla, "a")
        with self.assertRaises(IntegrityError):
            criar_convite(self.cla, "b")

    def test_revogado_libera_um_novo(self):
        criar_convite(self.cla, "a", revogado_em=timezone.now())
        novo = criar_convite(self.cla, "b")
        self.assertTrue(novo.esta_ativo)

    def test_hash_repetido_e_recusado_mesmo_entre_clas(self):
        criar_convite(self.cla, "a", revogado_em=timezone.now())
        with self.assertRaises(IntegrityError):
            criar_convite(criar_cla(nome="Outro"), "a")

    def test_expiracao_antes_da_criacao_e_recusada(self):
        agora = timezone.now()
        with self.assertRaises(IntegrityError):
            criar_convite(self.cla, criado_em=agora, expira_em=agora)

    def test_esta_ativo(self):
        agora = timezone.now()
        casos = {
            "valido": (dict(), True),
            "revogado": (dict(revogado_em=agora), False),
            "expirado": (
                dict(
                    criado_em=agora - timedelta(days=8),
                    expira_em=agora - timedelta(days=1),
                ),
                False,
            ),
        }
        for indice, (nome, (campos, esperado)) in enumerate(casos.items()):
            with self.subTest(caso=nome):
                convite = criar_convite(
                    criar_cla(nome=f"Cla {nome}"), str(indice), **campos
                )
                self.assertIs(convite.esta_ativo, esperado)
