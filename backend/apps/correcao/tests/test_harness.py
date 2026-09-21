from django.test import SimpleTestCase

from apps.correcao import harness
from apps.correcao.models import CasoDeTeste


class MontarProgramaTest(SimpleTestCase):
    def test_nome_de_funcao_invalido_nao_entra_no_programa(self):
        with self.assertRaises(ValueError):
            harness.montar_programa(codigo="x = 1", funcao="dobro(); import os")

    def test_codigo_do_aluno_vem_antes_do_harness(self):
        programa = harness.montar_programa(
            codigo="def dobro(n):\n    return n * 2", funcao="dobro"
        )
        self.assertTrue(programa.startswith("def dobro(n):"))
        self.assertIn('globals().get("dobro")', programa)


class SepararSaidaTest(SimpleTestCase):
    def test_print_do_aluno_fica_fora_do_resultado(self):
        stdout = f'oi\n{harness.MARCADOR}[{{"ok": true, "valor": 4}}]\n'
        impresso, resultados = harness.separar_saida(stdout)
        self.assertEqual(impresso, "oi")
        self.assertEqual(resultados, [{"ok": True, "valor": 4}])

    def test_sem_marcador_nao_tem_resultado(self):
        impresso, resultados = harness.separar_saida("só isso\n")
        self.assertEqual(impresso, "só isso\n")
        self.assertIsNone(resultados)

    def test_marcador_com_json_quebrado_nao_tem_resultado(self):
        _, resultados = harness.separar_saida(f"{harness.MARCADOR}[{{quebrado")
        self.assertIsNone(resultados)


class IguaisTest(SimpleTestCase):
    def test_float_com_diferenca_de_arredondamento_passa(self):
        self.assertTrue(harness.iguais(0.1 + 0.2, 0.3))

    def test_inteiro_e_float_de_mesmo_valor_passam(self):
        self.assertTrue(harness.iguais(7, 7.0))

    def test_bool_nao_se_passa_por_numero(self):
        self.assertFalse(harness.iguais(True, 1))
        self.assertFalse(harness.iguais(0, False))

    def test_dicionario_compara_chave_a_chave_sem_ordem(self):
        self.assertTrue(harness.iguais({"b": 1, "a": 2.0}, {"a": 2, "b": 1}))
        self.assertFalse(harness.iguais({"a": 1}, {"a": 1, "b": 2}))

    def test_lista_compara_em_ordem(self):
        self.assertFalse(harness.iguais([1, 2], [2, 1]))
        self.assertFalse(harness.iguais([1, 2], [1, 2, 3]))


class CasoPassouTest(SimpleTestCase):
    def test_caso_de_excecao_exige_a_excecao_certa(self):
        caso = CasoDeTeste(argumentos=[-1], erro_esperado="ValueError")
        self.assertTrue(harness.caso_passou(caso, {"ok": False, "erro": "ValueError"}))
        self.assertFalse(harness.caso_passou(caso, {"ok": False, "erro": "TypeError"}))
        self.assertFalse(harness.caso_passou(caso, {"ok": True, "valor": None}))

    def test_resultado_fora_do_formato_reprova(self):
        caso = CasoDeTeste(argumentos=[2], esperado=4)
        self.assertFalse(harness.caso_passou(caso, "4"))
        self.assertFalse(harness.caso_passou(caso, {"valor": 4}))