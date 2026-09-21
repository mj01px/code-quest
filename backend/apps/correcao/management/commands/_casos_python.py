# Casos de teste da trilha de Python, por slug do exercício.


CASOS_PYTHON = {
    "iniciais-do-nome": {
        "funcao": "iniciais",
        "codigo_inicial": "def iniciais(nome_completo):\n    ...\n",
        "casos": [
            (["ana paula souza"], "A.P.S", True),
            (["joão"], "J", True),
            (["maria da silva"], "M.D.S", False),
            (["  pedro   henrique  "], "P.H", False),
            (["Élio lima"], "É.L", False),
        ],
    },
    "limpar-entrada": {
        "funcao": "normalizar",
        "codigo_inicial": "def normalizar(email):\n    ...\n",
        "casos": [
            (["  Ana@Email.COM "], "ana@email.com", True),
            (["bia@x.com"], "bia@x.com", True),
            (["\tCARLOS@UMC.BR\n"], "carlos@umc.br", False),
            (["   "], "", False),
        ],
    },
    "boletim-formatado": {
        "funcao": "linha_do_boletim",
        "codigo_inicial": "def linha_do_boletim(nome, nota):\n    ...\n",
        "casos": [
            (["Ana", 8.456], "Ana: 8.46", True),
            (["Bia", 10], "Bia: 10.00", True),
            (["Caio", 0], "Caio: 0.00", False),
            (["Duda", 7.1], "Duda: 7.10", False),
        ],
    },
    "contar-palavras": {
        "funcao": "contar",
        "codigo_inicial": "def contar(frase):\n    ...\n",
        "casos": [
            (["a b a"], {"a": 2, "b": 1}, True),
            ([""], {}, True),
            (["o gato e o rato"], {"o": 2, "gato": 1, "e": 1, "rato": 1}, False),
            (["Sol sol"], {"Sol": 1, "sol": 1}, False),
        ],
    },
    "remover-duplicatas": {
        "funcao": "sem_repetir",
        "codigo_inicial": "def sem_repetir(itens):\n    ...\n",
        "casos": [
            ([[3, 1, 3, 2, 1]], [3, 1, 2], True),
            ([[]], [], True),
            ([[5, 4, 3, 2, 1]], [5, 4, 3, 2, 1], False),
            ([["b", "a", "b", "c", "a"]], ["b", "a", "c"], False),
        ],
    },
    "media-por-aluno": {
        "funcao": "medias",
        "codigo_inicial": "def medias(notas):\n    ...\n",
        "casos": [
            ([{"Ana": [8, 6]}], {"Ana": 7.0}, True),
            ([{"Bia": []}], {"Bia": 0.0}, True),
            ([{"Caio": [10, 9, 8], "Duda": [5]}], {"Caio": 9.0, "Duda": 5.0}, False),
            ([{}], {}, False),
        ],
    },
    "quadrados-pares": {
        "funcao": "quadrados_pares",
        "codigo_inicial": "def quadrados_pares(numeros):\n    ...\n",
        "casos": [
            ([[1, 2, 3, 4]], [4, 16], True),
            ([[]], [], True),
            ([[1, 3, 5]], [], False),
            ([[-2, 0, 7, 10]], [4, 0, 100], False),
        ],
    },
    "indice-e-item": {
        "funcao": "numerar",
        "codigo_inicial": "def numerar(itens):\n    ...\n",
        "casos": [
            ([["a", "b"]], ["1. a", "2. b"], True),
            ([[]], [], True),
            ([["pão", "leite", "café"]], ["1. pão", "2. leite", "3. café"], False),
        ],
    },
    "juntar-nomes-e-notas": {
        "funcao": "aprovados",
        "codigo_inicial": "def aprovados(nomes, notas):\n    ...\n",
        "casos": [
            ([["Ana", "Bia"], [8, 5]], ["Ana"], True),
            ([[], []], [], True),
            ([["Caio", "Duda", "Eva"], [7, 6.9, 10]], ["Caio", "Eva"], False),
        ],
    },
    "saudacao-com-padrao": {
        "funcao": "saudacao",
        "codigo_inicial": 'def saudacao(nome, prefixo="Olá"):\n    ...\n',
        "casos": [
            (["Ana"], "Olá Ana!", True),
            (["Ana", "Oi"], "Oi Ana!", True),
            (["Bia", "Bom dia"], "Bom dia Bia!", False),
            (["Caio"], "Olá Caio!", False),
        ],
    },
    "divisao-com-resto": {
        "funcao": "dividir",
        "codigo_inicial": "def dividir(a, b):\n    ...\n",
        "casos": [
            ([7, 2], [3, 1], True),
            ([10, 5], [2, 0], True),
            ([3, 7], [0, 3], False),
            ([100, 9], [11, 1], False),
        ],
    },
    "inteiro-seguro": {
        "funcao": "para_inteiro",
        "codigo_inicial": "def para_inteiro(texto, padrao=0):\n    ...\n",
        "casos": [
            (["42"], 42, True),
            (["abc"], 0, True),
            (["-7"], -7, False),
            (["x", -1], -1, False),
            (["3.5"], 0, False),
        ],
    },
    "raiz-com-validacao": {
        "funcao": "raiz",
        "codigo_inicial": "def raiz(numero):\n    ...\n",
        "casos": [
            ([9], 3.0, True),
            ([-4], {"erro": "ValueError"}, True),
            ([0], 0.0, False),
            ([2], 1.4142135623730951, False),
            ([-0.5], {"erro": "ValueError"}, False),
        ],
    },
    "media-lista-vazia": {
        "funcao": "media",
        "codigo_inicial": "def media(notas):\n    ...\n",
        "casos": [
            ([[8, 6]], 7.0, True),
            ([[]], 0.0, True),
            ([[10]], 10.0, False),
            ([[7, 8, 9]], 8.0, False),
        ],
    },
}