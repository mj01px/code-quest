from typing import Any, NotRequired, TypedDict

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.correcao.models import EspecificacaoDeCodigo, Linguagem
from apps.trilhas.models import (
    Aula,
    Dificuldade,
    Exercicio,
    StatusEditorial,
    Tipo,
    Trilha,
)

TRILHA_DOS_DESAFIOS = "desafios-do-dia"
AULA_DOS_DESAFIOS = "desafios"


class DesafioSeed(TypedDict):
    slug: str
    titulo: str
    dificuldade: str
    enunciado: str
    contexto: str
    exemplo: str
    funcao: str
    codigo_inicial: str
    solucao_autor: str
    requisitos: NotRequired[list[dict[str, str]]]


DESAFIOS: list[DesafioSeed] = [
    {
        "slug": "palindromo",
        "titulo": "É palíndromo?",
        "dificuldade": Dificuldade.INICIANTE,
        "enunciado": (
            "Escreva `palindromo(texto)` que devolva `True` quando o texto se lê "
            "igual de trás para frente e `False` caso contrário.\n\n"
            "Ignore espaços e a diferença entre maiúsculas e minúsculas.\n\n"
            'Exemplo: `palindromo("Ame a ema")` devolve `True`.'
        ),
        "contexto": (
            "Para comparar sem se preocupar com maiúsculas, passe tudo para "
            "minúsculas com `lower()`. Para tirar os espaços, `replace(' ', '')`. "
            "E o fatiamento `texto[::-1]` devolve o texto invertido."
        ),
        "exemplo": (
            'palavra = "Radar"\n'
            "print(palavra.lower())        # radar\n"
            'print("a b c".replace(" ", "")) # abc\n'
            'print("abc"[::-1])           # cba'
        ),
        "funcao": "palindromo",
        "codigo_inicial": "def palindromo(texto):\n    ...\n",
        "solucao_autor": (
            "def palindromo(texto):\n"
            '    limpo = texto.lower().replace(" ", "")\n'
            "    return limpo == limpo[::-1]\n"
        ),
    },
    {
        "slug": "fizzbuzz",
        "titulo": "FizzBuzz",
        "dificuldade": Dificuldade.INICIANTE,
        "enunciado": (
            "Escreva `fizzbuzz(n)` que devolva uma lista com os números de 1 a `n` "
            "como texto, trocando:\n\n"
            '- múltiplos de 3 por `"Fizz"`;\n'
            '- múltiplos de 5 por `"Buzz"`;\n'
            '- múltiplos de 3 e de 5 por `"FizzBuzz"`.\n\n'
            'Exemplo: `fizzbuzz(5)` devolve `["1", "2", "Fizz", "4", "Buzz"]`.'
        ),
        "contexto": (
            "O operador `%` devolve o resto da divisão: se `n % 3 == 0`, `n` é "
            "múltiplo de 3. Teste primeiro o caso mais específico (3 e 5 ao mesmo "
            "tempo), senão ele nunca é alcançado."
        ),
        "exemplo": (
            "print(9 % 3)    # 0, é múltiplo\n"
            "print(10 % 3)   # 1, não é\n"
            "print(str(7))   # '7'"
        ),
        "funcao": "fizzbuzz",
        "codigo_inicial": "def fizzbuzz(n):\n    ...\n",
        "solucao_autor": (
            "def fizzbuzz(n):\n"
            "    saida = []\n"
            "    for numero in range(1, n + 1):\n"
            "        if numero % 15 == 0:\n"
            '            saida.append("FizzBuzz")\n'
            "        elif numero % 3 == 0:\n"
            '            saida.append("Fizz")\n'
            "        elif numero % 5 == 0:\n"
            '            saida.append("Buzz")\n'
            "        else:\n"
            "            saida.append(str(numero))\n"
            "    return saida\n"
        ),
    },
    {
        "slug": "contar-vogais",
        "titulo": "Contar vogais",
        "dificuldade": Dificuldade.INICIANTE,
        "enunciado": (
            "Escreva `contar_vogais(texto)` que devolva quantas vogais o texto tem, "
            "contando maiúsculas e minúsculas e também as vogais acentuadas.\n\n"
            'Exemplo: `contar_vogais("Programação")` devolve `5`.'
        ),
        "contexto": (
            "Dá para percorrer um texto letra por letra com `for`. O operador `in` "
            "diz se um caractere está dentro de outro texto, então uma string com "
            "todas as vogais serve de lista de consulta."
        ),
        "exemplo": (
            'vogais = "aeiou"\n'
            'print("e" in vogais)   # True\n'
            'for letra in "oi":\n'
            "    print(letra)       # o, depois i"
        ),
        "funcao": "contar_vogais",
        "codigo_inicial": "def contar_vogais(texto):\n    ...\n",
        "solucao_autor": (
            "def contar_vogais(texto):\n"
            '    vogais = "aeiouáéíóúâêôãõàü"\n'
            "    return sum(1 for letra in texto.lower() if letra in vogais)\n"
        ),
    },
    {
        "slug": "maior-sem-max",
        "titulo": "O maior sem max()",
        "dificuldade": Dificuldade.INTERMEDIARIO,
        "enunciado": (
            "Escreva `maior(numeros)` que devolva o maior número de uma lista "
            "**sem usar** a função `max()`.\n\n"
            "A lista sempre tem pelo menos um número.\n\n"
            "Exemplo: `maior([3, 9, 2])` devolve `9`."
        ),
        "contexto": (
            "Guarde o primeiro item como o maior até agora e percorra o resto: "
            "sempre que achar um número maior, troque. No fim, a variável guarda "
            "o maior de todos."
        ),
        "exemplo": (
            "notas = [7, 4, 8]\n"
            "primeira = notas[0]   # 7\n"
            "for nota in notas[1:]:\n"
            "    print(nota)       # 4, depois 8"
        ),
        "funcao": "maior",
        "codigo_inicial": "def maior(numeros):\n    ...\n",
        "solucao_autor": (
            "def maior(numeros):\n"
            "    resultado = numeros[0]\n"
            "    for numero in numeros[1:]:\n"
            "        if numero > resultado:\n"
            "            resultado = numero\n"
            "    return resultado\n"
        ),
        "requisitos": [{"regra": "proibir", "construcao": "chamada", "nome": "max"}],
    },
    {
        "slug": "relogio-digital",
        "titulo": "Relógio digital",
        "dificuldade": Dificuldade.INTERMEDIARIO,
        "enunciado": (
            "Escreva `relogio(segundos)` que transforme uma quantidade de segundos "
            'no formato `"HH:MM:SS"`, sempre com dois dígitos em cada parte.\n\n'
            'Exemplo: `relogio(3725)` devolve `"01:02:05"`.'
        ),
        "contexto": (
            "A divisão inteira `//` diz quantas horas ou minutos cabem, e o resto "
            "`%` diz o que sobra. Para completar com zero à esquerda, use o "
            "formato `:02d` dentro de uma f-string."
        ),
        "exemplo": (
            "print(130 // 60)       # 2 minutos\n"
            "print(130 % 60)        # 10 segundos\n"
            'print(f"{7:02d}")      # 07'
        ),
        "funcao": "relogio",
        "codigo_inicial": "def relogio(segundos):\n    ...\n",
        "solucao_autor": (
            "def relogio(segundos):\n"
            "    horas = segundos // 3600\n"
            "    minutos = segundos % 3600 // 60\n"
            "    resto = segundos % 60\n"
            '    return f"{horas:02d}:{minutos:02d}:{resto:02d}"\n'
        ),
    },
]


class Command(BaseCommand):
    help = (
        "Publica a trilha oculta do desafio do dia com exercícios de código "
        "próprios, fora das trilhas e da ordem de estudo."
    )

    @transaction.atomic
    def handle(self, *args: Any, **options: Any) -> None:
        trilha, _ = Trilha.objects.update_or_create(
            slug=TRILHA_DOS_DESAFIOS,
            defaults={
                "nome": "Desafio do dia",
                "descricao": "Exercícios avulsos que aparecem um por dia.",
                "status": StatusEditorial.PUBLICADO,
                "desafio": True,
            },
        )
        aula, _ = Aula.objects.update_or_create(
            trilha=trilha,
            slug=AULA_DOS_DESAFIOS,
            defaults={
                "titulo": "Desafios",
                "conteudo": "",
                "status": StatusEditorial.PUBLICADO,
            },
        )

        for ordem, dados in enumerate(DESAFIOS, start=1):
            exercicio, _ = Exercicio.objects.update_or_create(
                trilha=trilha,
                slug=dados["slug"],
                defaults={
                    "aula": aula,
                    "titulo": dados["titulo"],
                    "enunciado": dados["enunciado"],
                    "tipo": Tipo.CODIGO,
                    "dificuldade": dados["dificuldade"],
                    "ordem": ordem,
                    "solucao_autor": dados["solucao_autor"],
                    "contexto": dados["contexto"],
                    "exemplo": dados["exemplo"],
                    "explicacao": "",
                    "status": StatusEditorial.PUBLICADO,
                },
            )
            especificacao, _ = EspecificacaoDeCodigo.objects.update_or_create(
                exercicio=exercicio,
                defaults={
                    "linguagem": Linguagem.PYTHON,
                    "funcao": dados["funcao"],
                    "codigo_inicial": dados["codigo_inicial"],
                    "requisitos": dados.get("requisitos", []),
                },
            )
            especificacao.full_clean()

        self.stdout.write(
            self.style.SUCCESS(
                f"{len(DESAFIOS)} desafios do dia publicados. "
                "Os casos de teste entram pelo seed_correcao."
            )
        )
