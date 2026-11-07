from ._casos_python import EspecificacaoSeed

CASOS_DESAFIOS: dict[str, EspecificacaoSeed] = {
    "palindromo": {
        "funcao": "palindromo",
        "codigo_inicial": "def palindromo(texto):\n    ...\n",
        "casos": [
            (["Ame a ema"], True, True),
            (["Python"], False, True),
            ([""], True, False),
            (["   "], True, False),
            (["RaDaR"], True, False),
            (["a b c"], False, False),
        ],
    },
    "fizzbuzz": {
        "funcao": "fizzbuzz",
        "codigo_inicial": "def fizzbuzz(n):\n    ...\n",
        "casos": [
            ([5], ["1", "2", "Fizz", "4", "Buzz"], True),
            ([3], ["1", "2", "Fizz"], True),
            ([1], ["1"], False),
            (
                [15],
                [
                    "1",
                    "2",
                    "Fizz",
                    "4",
                    "Buzz",
                    "Fizz",
                    "7",
                    "8",
                    "Fizz",
                    "Buzz",
                    "11",
                    "Fizz",
                    "13",
                    "14",
                    "FizzBuzz",
                ],
                False,
            ),
        ],
    },
    "contar-vogais": {
        "funcao": "contar_vogais",
        "codigo_inicial": "def contar_vogais(texto):\n    ...\n",
        "casos": [
            (["Programação"], 5, True),
            (["Python"], 1, True),
            ([""], 0, False),
            (["ÁÉÍÓÚ"], 5, False),
            (["àâêôãõü"], 7, False),
            (["bcd 123!"], 0, False),
        ],
    },
    "maior-sem-max": {
        "funcao": "maior",
        "codigo_inicial": "def maior(numeros):\n    ...\n",
        "requisitos": [{"regra": "proibir", "construcao": "chamada", "nome": "max"}],
        "casos": [
            ([[3, 9, 2]], 9, True),
            ([[4, 2, 8, 8]], 8, True),
            ([[-8, -2, -5]], -2, False),
            ([[-7]], -7, False),
            ([[-4, 0, -1]], 0, False),
            ([[1.5, 1.25, 1.75]], 1.75, False),
        ],
    },
    "relogio-digital": {
        "funcao": "relogio",
        "codigo_inicial": "def relogio(segundos):\n    ...\n",
        "casos": [
            ([3725], "01:02:05", True),
            ([60], "00:01:00", True),
            ([0], "00:00:00", False),
            ([86399], "23:59:59", False),
            ([3600], "01:00:00", False),
            ([9], "00:00:09", False),
        ],
    },
}
