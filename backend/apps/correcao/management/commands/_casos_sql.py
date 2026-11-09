from apps.correcao.models import Linguagem

from ._casos_python import EspecificacaoSeed

CASOS_SQL: dict[str, EspecificacaoSeed] = {
    "criar-tabela-aluno": {
        "linguagem": Linguagem.SQL,
        "funcao": "",
        "codigo_inicial": "CREATE TABLE aluno (\n    \n);\n",
        "casos": [
            (
                ["tabela", "Cria a tabela aluno com as quatro colunas pedidas"],
                True,
                True,
            ),
            (["chave_primaria", "Usa id como chave primária"], True, True),
            (["nome_obrigatorio", "Exige um nome do tipo texto"], True, True),
            (["email_obrigatorio", "Exige um e-mail do tipo texto"], True, True),
            (["email_unico", "Recusa dois alunos com o mesmo e-mail"], True, True),
            (
                ["data_opcional", "Aceita um cadastro sem data de nascimento"],
                True,
                True,
            ),
            (["id_unico", "Recusa dois alunos com o mesmo id"], True, False),
            (
                ["cadastro_com_data", "Aceita alunos distintos com data de nascimento"],
                True,
                False,
            ),
        ],
    },
    "restringir-nota": {
        "linguagem": Linguagem.SQL,
        "funcao": "",
        "codigo_inicial": "-- Defina a coluna nota aqui\n",
        "casos": [
            (["nota", "Aceita a nota 0", 0], True, True),
            (["nota", "Aceita a nota 7.5", 7.5], True, True),
            (["nota", "Aceita a nota 10", 10], True, True),
            (["nota", "Recusa a nota -1", -1], False, True),
            (["nota", "Recusa a nota 11", 11], False, True),
            (["nota", "Recusa a nota -0.1", -0.1], False, False),
            (["nota", "Recusa a nota 10.1", 10.1], False, False),
            (["nota", "Aceita a nota 0.25", 0.25], True, False),
            (["nota", "Aceita a nota 9", 9], True, False),
        ],
    },
}
