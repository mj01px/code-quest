"""Regras estruturais de Trilha, Aula e Exercício."""

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase

from apps.trilhas.models import Aula, Exercicio, StatusEditorial, Trilha

from .helpers import PUBLICADO, RASCUNHO, criar_aula, criar_exercicio, criar_trilha


class TrilhaTest(TestCase):
    def test_status_nasce_como_rascunho(self):
        trilha = Trilha.objects.create(
            slug="nova", nome="Nova", descricao="...", ordem=1
        )
        self.assertEqual(trilha.status, StatusEditorial.RASCUNHO)
        self.assertFalse(trilha.publicada)

    def test_slug_e_unico(self):
        criar_trilha("logica")
        with self.assertRaises(IntegrityError):
            criar_trilha("logica")

    def test_ordena_por_ordem_depois_nome(self):
        criar_trilha("c", ordem=2, nome="C")
        criar_trilha("a", ordem=1, nome="A")
        criar_trilha("b", ordem=1, nome="B")
        self.assertEqual([t.slug for t in Trilha.objects.all()], ["a", "b", "c"])

    def test_publicados_filtra_pelo_status(self):
        criar_trilha("publicada", status=PUBLICADO)
        criar_trilha("rascunho", status=RASCUNHO)
        self.assertEqual([t.slug for t in Trilha.objects.publicados()], ["publicada"])

    def test_str_e_o_nome(self):
        self.assertEqual(str(criar_trilha("logica", nome="Lógica")), "Lógica")


class AulaTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.trilha = criar_trilha("logica")
        cls.outra = criar_trilha("python", ordem=2)

    def test_slug_e_unico_dentro_da_trilha(self):
        criar_aula(self.trilha, "variaveis")
        with self.assertRaises(IntegrityError):
            criar_aula(self.trilha, "variaveis")

    def test_o_mesmo_slug_pode_existir_em_outra_trilha(self):
        criar_aula(self.trilha, "introducao")
        criar_aula(self.outra, "introducao")
        self.assertEqual(Aula.objects.filter(slug="introducao").count(), 2)

    def test_ordena_por_ordem(self):
        criar_aula(self.trilha, "terceira", ordem=3)
        criar_aula(self.trilha, "primeira", ordem=1)
        criar_aula(self.trilha, "segunda", ordem=2)
        self.assertEqual(
            [a.slug for a in self.trilha.aulas.all()],
            ["primeira", "segunda", "terceira"],
        )

    def test_pre_requisito_da_mesma_trilha_e_valido(self):
        primeira = criar_aula(self.trilha, "primeira", ordem=1)
        segunda = criar_aula(self.trilha, "segunda", ordem=2, pre_requisito=primeira)
        segunda.full_clean()
        self.assertEqual(segunda.pre_requisito, primeira)

    def test_pre_requisito_de_outra_trilha_e_recusado(self):
        alheia = criar_aula(self.outra, "alheia")
        aula = Aula(
            trilha=self.trilha,
            slug="dependente",
            titulo="Dependente",
            conteudo="...",
            ordem=1,
            pre_requisito=alheia,
        )
        with self.assertRaises(ValidationError) as erro:
            aula.clean()
        self.assertIn("pre_requisito", erro.exception.message_dict)

    def test_aula_nao_pode_ser_pre_requisito_de_si_mesma(self):
        aula = criar_aula(self.trilha, "sozinha")
        aula.pre_requisito = aula
        with self.assertRaises(ValidationError) as erro:
            aula.clean()
        self.assertIn("pre_requisito", erro.exception.message_dict)

    def test_apagar_pre_requisito_nao_apaga_a_dependente(self):
        primeira = criar_aula(self.trilha, "primeira", ordem=1)
        segunda = criar_aula(self.trilha, "segunda", ordem=2, pre_requisito=primeira)
        primeira.delete()
        segunda.refresh_from_db()
        self.assertIsNone(segunda.pre_requisito)

    def test_apagar_a_trilha_apaga_as_aulas(self):
        criar_aula(self.trilha, "efemera")
        self.trilha.delete()
        self.assertEqual(Aula.objects.filter(slug="efemera").count(), 0)


class ExercicioTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.trilha = criar_trilha("logica")
        cls.aula = criar_aula(cls.trilha, "variaveis")
        cls.outra_aula = criar_aula(cls.trilha, "condicionais", ordem=2)

    def test_slug_e_unico_dentro_da_aula(self):
        criar_exercicio(self.aula, "media")
        with transaction.atomic(), self.assertRaises(IntegrityError):
            criar_exercicio(self.aula, "media")

    def test_slug_e_unico_na_trilha_inteira(self):
        criar_exercicio(self.aula, "pratica")
        with transaction.atomic(), self.assertRaises(IntegrityError):
            criar_exercicio(self.outra_aula, "pratica")

    def test_o_mesmo_slug_pode_existir_em_outra_trilha(self):
        outra_trilha = criar_trilha("python")
        criar_exercicio(self.aula, "pratica")
        criar_exercicio(criar_aula(outra_trilha, "intro"), "pratica")
        self.assertEqual(Exercicio.objects.filter(slug="pratica").count(), 2)

    def test_trilha_e_derivada_da_aula(self):
        exercicio = criar_exercicio(self.aula, "derivado")
        self.assertEqual(exercicio.trilha_id, self.trilha.pk)

    def test_status_nasce_como_rascunho(self):
        exercicio = Exercicio.objects.create(
            aula=self.aula, slug="novo", titulo="Novo", enunciado="..."
        )
        self.assertEqual(exercicio.status, StatusEditorial.RASCUNHO)
        self.assertFalse(exercicio.publicado)

    def test_ordena_por_ordem(self):
        criar_exercicio(self.aula, "c", ordem=3)
        criar_exercicio(self.aula, "a", ordem=1)
        criar_exercicio(self.aula, "b", ordem=2)
        self.assertEqual([e.slug for e in self.aula.exercicios.all()], ["a", "b", "c"])

    def test_solucao_autor_e_opcional(self):
        exercicio = criar_exercicio(self.aula, "sem-solucao", solucao_autor="")
        exercicio.full_clean()
        self.assertEqual(exercicio.solucao_autor, "")

    def test_apagar_a_aula_apaga_os_exercicios(self):
        criar_exercicio(self.outra_aula, "efemero")
        self.outra_aula.delete()
        self.assertEqual(Exercicio.objects.filter(slug="efemero").count(), 0)
