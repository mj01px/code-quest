from io import StringIO
from textwrap import dedent, indent
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.contas.tests.helpers import criar_aluno
from apps.gamificacao.services import select_starter_creature
from apps.progressao.models import EventoXP
from apps.trilhas.management.commands.seed_desafios import TRILHA_DOS_DESAFIOS

from .helpers import ExecutorLocal

VOGAIS = "aeiouáéíóúâêôãõàü"


def _programa(corpo: str, inicio: str = "") -> str:
    corpo = indent(dedent(corpo).strip(), "    ")
    return f"{inicio}\ndef contar_vogais(texto):\n{corpo}\n"


CERTAS = {
    "acumulador com for": f"""
        total = 0
        for letra in texto.lower():
            if letra in {VOGAIS!r}:
                total += 1
        return total
    """,
    "while por índice": f"""
        texto = texto.lower()
        indice = total = 0
        while indice < len(texto):
            total += texto[indice] in {VOGAIS!r}
            indice += 1
        return total
    """,
    "soma com gerador": f"""
        return sum(1 for letra in texto.lower() if letra in {VOGAIS!r})
    """,
    "compreensão de lista": f"""
        encontradas = [letra for letra in texto.lower() if letra in {VOGAIS!r}]
        return len(encontradas)
    """,
    "filter com conjunto": f"""
        vogais = set({VOGAIS!r})
        return len(tuple(filter(vogais.__contains__, texto.lower())))
    """,
    "contagem por vogal": f"""
        texto = texto.lower()
        return sum(texto.count(vogal) for vogal in {VOGAIS!r})
    """,
    "expressão regular": f"""
        import re

        return len(re.findall("[{VOGAIS}]", texto, re.IGNORECASE))
    """,
    "frequências com Counter": f"""
        from collections import Counter

        frequencias = Counter(texto.lower())
        return sum(frequencias[vogal] for vogal in {VOGAIS!r})
    """,
    "redução com reduce": f"""
        from functools import reduce

        return reduce(lambda total, letra: total + (letra in {VOGAIS!r}), texto.lower(), 0)
    """,
    "recursão por divisão": f"""
        texto = texto.lower()

        def contar(inicio, fim):
            if inicio == fim:
                return 0
            if fim - inicio == 1:
                return int(texto[inicio] in {VOGAIS!r})
            meio = (inicio + fim) // 2
            return contar(inicio, meio) + contar(meio, fim)

        return contar(0, len(texto))
    """,
    "remoção por translate": f"""
        texto = texto.lower()
        sem_vogais = texto.translate(str.maketrans("", "", {VOGAIS!r}))
        return len(texto) - len(sem_vogais)
    """,
    "tabela de pesos": f"""
        from collections import defaultdict

        pesos = defaultdict(int, dict.fromkeys({VOGAIS!r}, 1))
        return sum(map(pesos.__getitem__, texto.lower()))
    """,
    "normalização Unicode": """
        import unicodedata

        texto = unicodedata.normalize("NFD", texto.lower())
        return sum(letra in "aeiou" for letra in texto)
    """,
    "pilha de caracteres": f"""
        pilha = list(texto.lower())
        total = 0
        while pilha:
            total += pilha.pop() in {VOGAIS!r}
        return total
    """,
    "máscara de bits": f"""
        mascara = sum(1 << ord(vogal) for vogal in {VOGAIS!r})
        return sum((mascara >> ord(letra)) & 1 for letra in texto.lower())
    """,
    "map e contagem de booleanos": f"""
        marcacoes = list(map({VOGAIS!r}.__contains__, texto.lower()))
        return marcacoes.count(True)
    """,
    "partições de texto": f"""
        texto = texto.lower()
        total = 0
        for vogal in {VOGAIS!r}:
            restante = texto
            while True:
                _, separador, restante = restante.partition(vogal)
                if not separador:
                    break
                total += 1
        return total
    """,
    "grupos de vogais consecutivas": f"""
        from itertools import groupby

        grupos = groupby(texto.lower(), {VOGAIS!r}.__contains__)
        return sum(len(tuple(grupo)) for e_vogal, grupo in grupos if e_vogal)
    """,
    "busca binária": f"""
        from bisect import bisect_left

        vogais = sorted({VOGAIS!r})
        total = 0
        for letra in texto.lower():
            indice = bisect_left(vogais, letra)
            if indice < len(vogais) and vogais[indice] == letra:
                total += 1
        return total
    """,
    "somas acumuladas": f"""
        from collections import deque
        from itertools import accumulate

        marcacoes = map({VOGAIS!r}.__contains__, texto.lower())
        acumulados = accumulate(marcacoes, initial=0)
        return deque(acumulados, maxlen=1)[0]
    """,
}

ERRADAS = {
    "tamanho do texto": "return len(texto)",
    "conta consoantes": f"""
        return sum(letra.isalpha() and letra not in {VOGAIS!r} for letra in texto.lower())
    """,
    "ignora vogais acentuadas": 'return sum(letra in "aeiou" for letra in texto.lower())',
    "ignora maiúsculas": f"return sum(letra in {VOGAIS!r} for letra in texto)",
    "elimina repetições": f"return len(set(texto.lower()) & set({VOGAIS!r}))",
}

IMPRESSOES = {
    "imprime um valor fixo": _programa("print(5)"),
    "imprime valores memorizados por entrada": _programa("""
        respostas = {"Programação": 5, "Python": 1, "": 0, "ÁÉÍÓÚ": 5,
                     "àâêôãõü": 7, "bcd 123!": 0}
        print(respostas[texto])
    """),
    "imprime todos os valores em linhas": _programa(
        "pass", 'print(5, 1, 0, 5, 7, 0, sep="\\n")'
    ),
    "imprime resultados forjados antes do corretor": _programa(
        "pass",
        """
import json

valores = [5, 1, 0, 5, 7, 0]
print("@@RESULTADO@@" + json.dumps([{"ok": True, "valor": valor} for valor in valores]))
""",
    ),
    "imprime resultados forjados no encerramento": _programa(
        "pass",
        """
import atexit
import json

valores = [5, 1, 0, 5, 7, 0]
mensagem = "@@RESULTADO@@" + json.dumps([{"ok": True, "valor": valor} for valor in valores])
atexit.register(print, mensagem)
""",
    ),
}


class VariantesContarVogaisTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_desafios", stdout=StringIO())
        call_command("seed_correcao", stdout=StringIO())

    def setUp(self):
        self.client = APIClient()
        self.executor = ExecutorLocal()
        patcher = patch(
            "apps.correcao.services.obter_cliente", return_value=self.executor
        )
        patcher.start()
        self.addCleanup(patcher.stop)

    def _enviar(self, codigo):
        user = criar_aluno(nickname=f"aluno_variante_{self.executor.chamadas + 1}")
        select_starter_creature(user=user, creature_slug="shellby")
        self.client.force_authenticate(user)
        resposta = self.client.post(
            reverse(
                "progressao:concluir-exercicio",
                kwargs={
                    "trilha_slug": TRILHA_DOS_DESAFIOS,
                    "exercicio_slug": "contar-vogais",
                },
            ),
            {"codigo": codigo},
            format="json",
        )
        self.assertEqual(resposta.status_code, 200, resposta.data)
        self.assertEqual(resposta.data["correcao"]["total"], 6)
        xp = sum(EventoXP.objects.filter(user=user).values_list("xp", flat=True))
        return resposta.data, xp

    def _verificar_reprovacao(self, codigo):
        resultado, xp = self._enviar(codigo)
        self.assertEqual((resultado["aprovado"], xp), (False, 0))

    def test_aprova_vinte_solucoes_diferentes(self):
        for nome, corpo in CERTAS.items():
            with self.subTest(solucao=nome):
                resultado, xp = self._enviar(_programa(corpo))
                self.assertTrue(resultado["aprovado"], resultado["correcao"])
                self.assertEqual(resultado["correcao"]["aprovados"], 6)
                self.assertEqual(xp, 50)
        self.assertEqual(self.executor.chamadas, 20)

    def test_reprova_cinco_solucoes_erradas(self):
        for nome, corpo in ERRADAS.items():
            with self.subTest(solucao=nome):
                self._verificar_reprovacao(_programa(corpo))
        self.assertEqual(self.executor.chamadas, 5)

    def test_reprova_cinco_tentativas_de_imprimir_a_resposta(self):
        for nome, codigo in IMPRESSOES.items():
            with self.subTest(tentativa=nome):
                self._verificar_reprovacao(codigo)
        self.assertEqual(self.executor.chamadas, 5)
