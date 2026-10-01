"""Validação de nome e descrição. A lista real ainda não existe, uso "bobo" no lugar."""

from unittest import mock

from django.core.exceptions import ValidationError
from django.test import SimpleTestCase

from apps.clas import palavras_proibidas
from apps.clas.models import Bandeira, Cla
from apps.clas.validators import (
    normalizar_nome,
    validar_nome,
    validar_sem_palavras_proibidas,
)


def _codigo(validador, valor) -> str | None:
    try:
        validador(valor)
    except ValidationError as erro:
        return erro.code
    return None


class NomeTest(SimpleTestCase):
    def test_aceitos(self):
        for nome in ("Os Bugados", "Clã do Café", "Time 42", "abc", "x" * 24):
            with self.subTest(nome=nome):
                self.assertIsNone(_codigo(validar_nome, nome))

    def test_tamanho(self):
        for nome in ("ab", "x" * 25):
            with self.subTest(nome=nome):
                self.assertEqual(_codigo(validar_nome, nome), "nome_tamanho")

    def test_caracteres_invalidos(self):
        for nome in ("Os_Bugados", "Clã!", "a×b", "emoji 🐉", "汉字汉字"):
            with self.subTest(nome=nome):
                self.assertEqual(_codigo(validar_nome, nome), "nome_invalido")

    def test_espacos_sobrando(self):
        for nome in (" Os Bugados", "Os Bugados ", "Os  Bugados"):
            with self.subTest(nome=nome):
                self.assertEqual(_codigo(validar_nome, nome), "nome_espacos")

    def test_normalizar_nome(self):
        self.assertEqual(normalizar_nome("  Os   Bugados \t"), "Os Bugados")

    def test_validador_esta_ligado_ao_modelo(self):
        cla = Cla(nome="ab", bandeira=Bandeira.GUILDA_1)
        with self.assertRaises(ValidationError) as contexto:
            cla.clean_fields()
        self.assertIn("nome", contexto.exception.error_dict)


@mock.patch.object(palavras_proibidas, "PALAVRAS_PROIBIDAS", frozenset({"bobo"}))
class PalavrasProibidasTest(SimpleTestCase):
    def test_barra_variacoes(self):
        for texto in (
            "bobo",
            "Clã BOBO",
            "Os Bóbô",
            "b0b0 da colina",
            "b o b o",
            "b.o.b.o",
            "o-bobo-",
        ):
            with self.subTest(texto=texto):
                self.assertEqual(
                    _codigo(validar_sem_palavras_proibidas, texto), "termo_proibido"
                )

    def test_nao_barra_palavra_que_so_contem_o_termo(self):
        for texto in ("Bobolândia", "Os Boboes", "Clã do Café"):
            with self.subTest(texto=texto):
                self.assertIsNone(_codigo(validar_sem_palavras_proibidas, texto))

    def test_nome_tambem_passa_pelo_filtro(self):
        self.assertEqual(_codigo(validar_nome, "Clã Bobo"), "termo_proibido")

    def test_descricao_tambem_passa_pelo_filtro(self):
        cla = Cla(nome="Os Bugados", bandeira=Bandeira.GUILDA_1, descricao="b0b0")
        with self.assertRaises(ValidationError) as contexto:
            cla.clean_fields()
        self.assertIn("descricao", contexto.exception.error_dict)


class ListaVaziaTest(SimpleTestCase):
    def test_sem_lista_nada_e_barrado(self):
        self.assertEqual(palavras_proibidas.PALAVRAS_PROIBIDAS, frozenset())
        self.assertIsNone(_codigo(validar_sem_palavras_proibidas, "qualquer coisa"))
