from django.test import SimpleTestCase

from apps.correcao.analise_ast import requisitos_invalidos, verificar

NUMERAR = 'def numerar(itens):\n    return [f"{i}. {x}" for i, x in enumerate(itens, 1)]\n'


def _barrado(codigo, requisitos=(), funcao="numerar"):
    return verificar(codigo=codigo, funcao=funcao, requisitos=list(requisitos))


class SintaxeEFuncaoTest(SimpleTestCase):
    def test_codigo_valido_sem_requisitos_passa(self):
        self.assertIsNone(_barrado(NUMERAR))

    def test_erro_de_sintaxe_informa_a_linha(self):
        barrado = _barrado("def numerar(itens)\n    pass\n")
        self.assertEqual(barrado.code, "erro_de_sintaxe")
        self.assertEqual(barrado.linha, 1)

    def test_byte_nulo_nao_quebra_a_analise(self):
        self.assertEqual(_barrado("x = '\0'").code, "erro_de_sintaxe")

    def test_funcao_com_outro_nome_e_barrada(self):
        self.assertEqual(_barrado("def contar(itens):\n    return 0\n").code, "funcao_ausente")

    def test_funcao_dentro_de_outra_nao_conta(self):
        codigo = "def fora():\n    def numerar(itens):\n        return []\n"
        self.assertEqual(_barrado(codigo).code, "funcao_ausente")


class RequisitosTest(SimpleTestCase):
    def test_exigir_construcao_ausente_barra(self):
        barrado = _barrado(NUMERAR, [{"regra": "exigir", "construcao": "for"}])
        self.assertEqual(barrado.code, "requisito_exigido")

    def test_for_de_compreensao_nao_conta_como_laco_for(self):
        requisito = [{"regra": "exigir", "construcao": "for"}]
        self.assertIsNotNone(_barrado(NUMERAR, requisito))

    def test_exigir_construcao_presente_passa(self):
        requisitos = [
            {"regra": "exigir", "construcao": "compreensao"},
            {"regra": "exigir", "construcao": "fstring"},
        ]
        self.assertIsNone(_barrado(NUMERAR, requisitos))

    def test_exigir_chamada_confere_o_nome(self):
        self.assertIsNone(
            _barrado(NUMERAR, [{"regra": "exigir", "construcao": "chamada", "nome": "enumerate"}])
        )
        barrado = _barrado(NUMERAR, [{"regra": "exigir", "construcao": "chamada", "nome": "zip"}])
        self.assertEqual(barrado.code, "requisito_exigido")
        self.assertIn("zip", barrado.mensagem)

    def test_chamada_de_metodo_tambem_conta(self):
        codigo = "def numerar(itens):\n    return ' '.join(itens).split()\n"
        requisito = [{"regra": "exigir", "construcao": "chamada", "nome": "split"}]
        self.assertIsNone(_barrado(codigo, requisito))

    def test_proibir_informa_a_linha_da_primeira_ocorrencia(self):
        codigo = "def numerar(itens):\n    x = 1\n    try:\n        return []\n    except Exception:\n        return []\n"
        barrado = _barrado(codigo, [{"regra": "proibir", "construcao": "try"}])
        self.assertEqual(barrado.code, "requisito_proibido")
        self.assertEqual(barrado.linha, 3)

    def test_proibir_import(self):
        codigo = "import os\n" + NUMERAR
        barrado = _barrado(codigo, [{"regra": "proibir", "construcao": "import"}])
        self.assertEqual(barrado.code, "requisito_proibido")


class RequisitosInvalidosTest(SimpleTestCase):
    def test_formato_certo_nao_tem_problema(self):
        self.assertEqual(
            requisitos_invalidos(
                [
                    {"regra": "exigir", "construcao": "for"},
                    {"regra": "proibir", "construcao": "chamada", "nome": "eval"},
                ]
            ),
            [],
        )

    def test_formato_errado_lista_cada_problema(self):
        problemas = requisitos_invalidos(
            [
                {"regra": "talvez", "construcao": "for"},
                {"regra": "exigir", "construcao": "goto"},
                {"regra": "exigir", "construcao": "chamada"},
                "for",
            ]
        )
        self.assertEqual(len(problemas), 4)

    def test_precisa_ser_lista(self):
        self.assertTrue(requisitos_invalidos({"regra": "exigir"}))