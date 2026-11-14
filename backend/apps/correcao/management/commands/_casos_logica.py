from ._casos_python import EspecificacaoSeed

CASOS_LOGICA: dict[str, EspecificacaoSeed] = {
    "par-ou-impar": {
        "funcao": "par_ou_impar",
        "codigo_inicial": "def par_ou_impar(numero):\n    ...\n",
        "casos": [
            ([4], "par", True),
            ([7], "impar", True),
            ([0], "par", False),
            ([-3], "impar", False),
            ([-12], "par", False),
        ],
    },
    "maior-de-tres": {
        "funcao": "maior",
        "codigo_inicial": "def maior(a, b, c):\n    ...\n",
        "requisitos": [{"regra": "proibir", "construcao": "chamada", "nome": "max"}],
        "casos": [
            ([3, 9, 5], 9, True),
            ([8, 2, 4], 8, True),
            ([-5, -8, -2], -2, False),
            ([2, 6, 6], 6, False),
            ([3, 3, 3], 3, False),
        ],
    },
    "classificar-nota": {
        "funcao": "classificar",
        "codigo_inicial": "def classificar(nota):\n    ...\n",
        "casos": [
            ([7], "aprovado", True),
            ([5], "recuperacao", True),
            ([4.99], "reprovado", False),
            ([6.99], "recuperacao", False),
            ([10], "aprovado", False),
        ],
    },
    "ano-bissexto": {
        "funcao": "bissexto",
        "codigo_inicial": "def bissexto(ano):\n    ...\n",
        "casos": [
            ([2024], True, True),
            ([1900], False, True),
            ([2000], True, False),
            ([2023], False, False),
            ([2100], False, False),
        ],
    },
    "somar-ate-n": {
        "funcao": "somar_ate",
        "codigo_inicial": "def somar_ate(n):\n    ...\n",
        "casos": [
            ([5], 15, True),
            ([1], 1, True),
            ([0], 0, False),
            ([10], 55, False),
            ([100], 5050, False),
        ],
    },
    "contar-vogais": {
        "funcao": "contar_vogais",
        "codigo_inicial": "def contar_vogais(texto):\n    ...\n",
        "casos": [
            (["CodeQuest"], 4, True),
            ([""], 0, True),
            (["ÁÉÍÓÚ aEiOu"], 5, False),
            (["rhythm 123"], 0, False),
            (["BaNaNa"], 3, False),
        ],
    },
    "tabuada": {
        "funcao": "tabuada",
        "codigo_inicial": "def tabuada(numero):\n    ...\n",
        "casos": [
            ([3], [3, 6, 9, 12, 15, 18, 21, 24, 27, 30], True),
            ([1], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], True),
            ([0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], False),
            ([-2], [-2, -4, -6, -8, -10, -12, -14, -16, -18, -20], False),
        ],
    },
    "fatorial": {
        "funcao": "fatorial",
        "codigo_inicial": "def fatorial(n):\n    ...\n",
        "casos": [
            ([5], 120, True),
            ([0], 1, True),
            ([1], 1, False),
            ([7], 5040, False),
            ([10], 3628800, False),
        ],
    },
    "sequencia-de-fibonacci": {
        "funcao": "fibonacci",
        "codigo_inicial": "def fibonacci(quantidade):\n    ...\n",
        "casos": [
            ([7], [0, 1, 1, 2, 3, 5, 8], True),
            ([1], [0], True),
            ([0], [], False),
            ([2], [0, 1], False),
            ([10], [0, 1, 1, 2, 3, 5, 8, 13, 21, 34], False),
        ],
    },
    "maior-da-lista": {
        "funcao": "maior_da_lista",
        "codigo_inicial": "def maior_da_lista(numeros):\n    ...\n",
        "requisitos": [{"regra": "proibir", "construcao": "chamada", "nome": "max"}],
        "casos": [
            ([[3, 9, 5]], 9, True),
            ([[]], None, True),
            ([[-10, -3, -7]], -3, False),
            ([[6]], 6, False),
            ([[2, 2, 3, 3]], 3, False),
        ],
    },
    "media-da-lista": {
        "funcao": "media_das_notas",
        "codigo_inicial": "def media_das_notas(notas):\n    ...\n",
        "casos": [
            ([[8, 6, 10]], 8.0, True),
            ([[]], 0.0, True),
            ([[7.5]], 7.5, False),
            ([[7, 8]], 7.5, False),
            ([[0, 1, 1]], 0.6666666666666666, False),
        ],
    },
    "remover-repetidos": {
        "funcao": "sem_repetidos",
        "codigo_inicial": "def sem_repetidos(valores):\n    ...\n",
        "casos": [
            ([[3, 1, 3, 2, 1]], [3, 1, 2], True),
            ([[]], [], True),
            ([[4, 4, 4]], [4], False),
            ([[8, 2, 5, 2, 8, 1]], [8, 2, 5, 1], False),
        ],
    },
    "contar-palavras": {
        "funcao": "contar_palavras",
        "codigo_inicial": "def contar_palavras(texto):\n    ...\n",
        "casos": [
            (["um dois um"], {"um": 2, "dois": 1}, True),
            (["Sol sol"], {"sol": 2}, True),
            ([""], {}, False),
            (["  água\tSol\nÁGUA  "], {"água": 2, "sol": 1}, False),
        ],
    },
    "saudacao-com-padrao": {
        "funcao": "saudacao",
        "codigo_inicial": 'def saudacao(nome, prefixo="Olá"):\n    ...\n',
        "casos": [
            (["Ana"], "Olá, Ana!", True),
            (["Ana", "Bom dia"], "Bom dia, Ana!", True),
            (["João"], "Olá, João!", False),
            (["Lia", "Boa noite"], "Boa noite, Lia!", False),
        ],
    },
    "aplicar-desconto": {
        "funcao": "com_desconto",
        "codigo_inicial": "def com_desconto(preco, percentual):\n    ...\n",
        "casos": [
            ([200, 25], 150.0, True),
            ([50, -1], {"erro": "ValueError"}, True),
            ([80, 0], 80.0, False),
            ([80, 100], 0.0, False),
            ([90, 12.5], 78.75, False),
            ([20, 101], {"erro": "ValueError"}, False),
        ],
    },
    "validar-senha": {
        "funcao": "senha_valida",
        "codigo_inicial": "def senha_valida(senha):\n    ...\n",
        "requisitos": [{"regra": "proibir", "construcao": "bloco_aninhado"}],
        "casos": [
            (["Abcdefg1"], True, True),
            (["Ab1"], False, True),
            (["abcdefg1"], False, False),
            (["ABCDEFG1"], False, False),
            (["Abcdefgh"], False, False),
            (["aB9!z Xpto"], True, False),
        ],
    },
    "achar-o-erro-do-loop": {
        "funcao": "somar",
        "codigo_inicial": (
            "def somar(numeros):\n"
            "    for numero in numeros:\n"
            "        total = 0\n"
            "        total = total + numero\n"
            "    return total\n"
        ),
        "casos": [
            ([[1, 2, 3]], 6, True),
            ([[5]], 5, True),
            ([[]], 0, False),
            ([[-4, 4, 2]], 2, False),
            ([[9, -4, 0, 2]], 7, False),
        ],
    },
    "dividir-com-seguranca": {
        "funcao": "dividir",
        "codigo_inicial": "def dividir(a, b):\n    ...\n",
        "casos": [
            ([10, 2], 5.0, True),
            ([10, 0], None, True),
            ([5, 2], 2.5, False),
            ([-9, 4], -2.25, False),
            ([0, 8], 0.0, False),
        ],
    },
    "refatorar-condicional": {
        "funcao": "pode_dirigir",
        "codigo_inicial": "from types import SimpleNamespace\n\ndef pode_dirigir(pessoa):\n    ...\n",
        "requisitos": [{"regra": "proibir", "construcao": "bloco_aninhado"}],
        "casos": [
            ([{"__cq_objeto__": {"idade": 18, "tem_habilitacao": True}}], True, True),
            ([None], False, True),
            ([{"__cq_objeto__": {"idade": 17, "tem_habilitacao": True}}], False, False),
            ([{"__cq_objeto__": {"idade": 25, "tem_habilitacao": False}}], False, False),
            ([{"__cq_objeto__": {"idade": 40, "tem_habilitacao": True}}], True, False),
        ],
    },
}
