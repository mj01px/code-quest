"""Contratos dos serializers públicos do catálogo.

A varredura de `solucao_autor` saiu daqui: virou
`tests/test_serializers_transversal.py`, que cobre o projeto inteiro e
também pega `SerializerMethodField` e `source=` disfarçados.
"""

from django.test import TestCase

from apps.trilhas import serializers as modulo
from apps.trilhas.models import Dificuldade, Tipo

from .helpers import criar_aula, criar_exercicio, criar_trilha


class ExercicioResumoSerializerTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        trilha = criar_trilha("logica")
        aula = criar_aula(trilha, "variaveis")
        cls.exercicio = criar_exercicio(
            aula, "media", dificuldade=Dificuldade.INTERMEDIARIO, tipo=Tipo.TEORICO
        )

    def test_expoe_apenas_a_allowlist(self):
        dados = modulo.ExercicioResumoSerializer(self.exercicio).data
        self.assertEqual(
            set(dados),
            {
                "id",
                "titulo",
                "slug",
                "tipo",
                "tipo_label",
                "dificuldade",
                "dificuldade_label",
                "ordem",
            },
        )

    def test_traz_o_rotulo_legivel_da_dificuldade_e_do_tipo(self):
        # O frontend mostra "Intermediário", não "INTERMEDIARIO"; traduzir aqui
        # evita duplicar a tabela de choices em TypeScript.
        dados = modulo.ExercicioResumoSerializer(self.exercicio).data
        self.assertEqual(dados["dificuldade"], "INTERMEDIARIO")
        self.assertEqual(dados["dificuldade_label"], "Intermediário")
        self.assertEqual(dados["tipo_label"], "Teórico")


class AulaSerializerTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.trilha = criar_trilha("logica")
        cls.primeira = criar_aula(cls.trilha, "variaveis", ordem=1)
        cls.segunda = criar_aula(
            cls.trilha, "condicionais", ordem=2, pre_requisito=cls.primeira
        )
        criar_exercicio(cls.primeira, "media")

    def test_expoe_apenas_a_allowlist(self):
        dados = modulo.AulaSerializer(self.primeira).data
        self.assertEqual(
            set(dados),
            {
                "id",
                "titulo",
                "slug",
                "conteudo",
                "ordem",
                "pre_requisito",
                "exercicios",
            },
        )

    def test_pre_requisito_sai_como_slug(self):
        dados = modulo.AulaSerializer(self.segunda).data
        self.assertEqual(dados["pre_requisito"], "variaveis")

    def test_aula_sem_pre_requisito_devolve_nulo(self):
        dados = modulo.AulaSerializer(self.primeira).data
        self.assertIsNone(dados["pre_requisito"])

    def test_exercicios_vem_aninhados(self):
        dados = modulo.AulaSerializer(self.primeira).data
        self.assertEqual([e["slug"] for e in dados["exercicios"]], ["media"])


class TrilhaSerializerTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.trilha = criar_trilha("logica", nome="Lógica")
        criar_aula(cls.trilha, "variaveis")

    def test_lista_expoe_apenas_a_allowlist(self):
        self.trilha.total_aulas = 1
        self.trilha.total_exercicios = 3
        dados = modulo.TrilhaListaSerializer(self.trilha).data
        self.assertEqual(
            set(dados),
            {
                "id",
                "nome",
                "slug",
                "descricao",
                "ordem",
                "total_aulas",
                "total_exercicios",
            },
        )

    def test_detalhe_expoe_apenas_a_allowlist(self):
        dados = modulo.TrilhaDetalheSerializer(self.trilha).data
        self.assertEqual(
            set(dados),
            {
                "id",
                "nome",
                "slug",
                "descricao",
                "resumo",
                "sobre",
                "ordem",
                "aulas",
            },
        )

    def test_a_lista_nao_carrega_os_textos_longos(self):
        # O card mostra uma linha só. Mandar `resumo` e `sobre` na listagem
        # engordaria a resposta do catálogo inteiro por nada.
        dados = modulo.TrilhaListaSerializer(self.trilha).data
        self.assertNotIn("resumo", dados)
        self.assertNotIn("sobre", dados)


class ExercicioDetalheSerializerTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        trilha = criar_trilha("logica", nome="Lógica")
        aula = criar_aula(trilha, "variaveis")
        cls.exercicio = criar_exercicio(aula, "media")

    def test_expoe_apenas_a_allowlist(self):
        dados = modulo.ExercicioDetalheSerializer(self.exercicio).data
        self.assertEqual(
            set(dados),
            {
                "id",
                "titulo",
                "slug",
                "enunciado",
                "tipo",
                "tipo_label",
                "dificuldade",
                "dificuldade_label",
                "ordem",
                "aula_titulo",
                "aula_slug",
                "trilha_nome",
                "trilha_slug",
            },
        )

    def test_carrega_o_contexto_da_trilha_para_a_migalha_de_pao(self):
        dados = modulo.ExercicioDetalheSerializer(self.exercicio).data
        self.assertEqual(dados["trilha_slug"], "logica")
        self.assertEqual(dados["trilha_nome"], "Lógica")
        self.assertEqual(dados["aula_slug"], "variaveis")
