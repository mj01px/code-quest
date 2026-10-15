"""Validação de nome e descrição. Os testes de regra usam "bobo" no lugar da lista real."""

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

    def test_letra_repetida_e_plural(self):
        for texto in ("boboooo", "bbobbo", "os bobos"):
            with self.subTest(texto=texto):
                self.assertEqual(
                    _codigo(validar_sem_palavras_proibidas, texto), "termo_proibido"
                )

    def test_nome_tambem_passa_pelo_filtro(self):
        self.assertEqual(_codigo(validar_nome, "Clã Bobo"), "termo_proibido")

    def test_descricao_tambem_passa_pelo_filtro(self):
        cla = Cla(nome="Os Bugados", bandeira=Bandeira.GUILDA_1, descricao="b0b0")
        with self.assertRaises(ValidationError) as contexto:
            cla.clean_fields()
        self.assertIn("descricao", contexto.exception.error_dict)


@mock.patch.object(
    palavras_proibidas, "PALAVRAS_PROIBIDAS", frozenset({"filho da bobo", "bobo"})
)
class FrasesTest(SimpleTestCase):
    def test_barra_a_frase_em_qualquer_forma(self):
        for texto in (
            "filho da bobo",
            "Clã Filho da Bobo",
            "filhodabobo",
            "filho.da.bobo",
            "f1lh0 d4 b0b0",
        ):
            with self.subTest(texto=texto):
                self.assertEqual(
                    _codigo(validar_sem_palavras_proibidas, texto), "termo_proibido"
                )

    def test_pedaco_da_frase_sozinho_passa(self):
        self.assertIsNone(_codigo(validar_sem_palavras_proibidas, "Filho do Sol"))


class ListaRealTest(SimpleTestCase):
    def test_lista_carregada(self):
        self.assertGreaterEqual(len(palavras_proibidas.PALAVRAS_PROIBIDAS), 80)

    def test_barra_variacoes_da_lista(self):
        for texto in (
            "P0RR4",
            "p.u.t.a",
            "FDP Team",
            "filho da puta",
            "filhodaputa",
            "vai tomar no cu",
            "foda-se",
            "MERDAAAA",
            "cla filho da putaaaaaaaa",
            "seu merda",
            "Sapatões",
            "Os Cuzões",
            "b1ch4",
            "Clã Nazista",
            "supremacia branca",
            "Macacos do Código",
            "Piranhas",
            "Mongóis",
            "m4c4c0",
        ):
            with self.subTest(texto=texto):
                self.assertEqual(
                    _codigo(validar_sem_palavras_proibidas, texto), "termo_proibido"
                )

    def test_nomes_comuns_passam(self):
        for texto in (
            "Os Bugados",
            "Clã do Café",
            "Computaria",
            "Pauliceia",
            "Cururu",
            "Cuscuz",
            "Bichanos",
            "Veadeiros",
            "Lixeiras",
            "Escorpiões",
            "Dragões",
            "Time 2024",
            # risada, não a sigla
            "kkkkkkk",
            # sentido comum, ficaram fora da lista de propósito
            "Pica-Pau",
            "Os Veados",
            "Legião do Inferno",
            "Pau Brasil",
            "Os Otários",
        ):
            with self.subTest(texto=texto):
                self.assertIsNone(_codigo(validar_sem_palavras_proibidas, texto))
