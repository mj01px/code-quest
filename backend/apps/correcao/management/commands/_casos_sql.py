from apps.correcao.models import Linguagem

from ._casos_python import EspecificacaoSeed

ValorSql = str | int | float | None
LinhaSql = tuple[ValorSql, ...]
PreparoSql = tuple[str, list[LinhaSql]]
CasoSql = tuple[list[object], object, bool]

_ALUNO = (
    "CREATE TABLE aluno (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, "
    "email TEXT NOT NULL UNIQUE, nascimento DATE)"
)
_TURMA = "CREATE TABLE turma (id INTEGER PRIMARY KEY, codigo TEXT NOT NULL)"
_MATRICULA = (
    "CREATE TABLE matricula (id INTEGER PRIMARY KEY, aluno_id INTEGER,"
    " turma_id INTEGER, nota NUMERIC, criado_em TEXT)"
)
_CONTA = "CREATE TABLE conta (id INTEGER PRIMARY KEY, saldo INTEGER NOT NULL)"
_CONSULTA_SALDOS = "SELECT id, saldo FROM conta ORDER BY id"
_INDICE_DATA = "idx_matricula_criado_em"

_BANCO: list[PreparoSql] = [
    (_ALUNO, []),
    (_TURMA, []),
    (_MATRICULA, []),
]


def _alunos(*linhas: tuple[int, str, str]) -> PreparoSql:
    return "INSERT INTO aluno (id, nome, email) VALUES (?, ?, ?)", list(linhas)


def _turmas(*linhas: tuple[int, str]) -> PreparoSql:
    return "INSERT INTO turma (id, codigo) VALUES (?, ?)", list(linhas)


def _matriculas(
    *linhas: tuple[int, int, int, int | float | None, str],
) -> PreparoSql:
    return "INSERT INTO matricula VALUES (?, ?, ?, ?, ?)", list(linhas)


def _consulta(
    descricao: str,
    dados: list[PreparoSql],
    esperado: list[LinhaSql],
    visivel: bool,
    *,
    ordenado: bool = False,
    indice: str = "",
) -> CasoSql:
    preparo: dict[str, object] = {"preparo": [*_BANCO, *dados], "ordenado": ordenado}
    if indice:
        preparo["indice"] = indice
    return ["consulta", descricao, preparo], esperado, visivel


def _estado(
    tipo: str,
    descricao: str,
    preparo: list[PreparoSql],
    verificacao: str,
    esperado: list[LinhaSql],
    visivel: bool,
    *,
    aceitar: tuple[tuple[str, tuple[int | None, ...]], ...] = (),
    recusar: tuple[tuple[str, tuple[int | None, ...]], ...] = (),
    falha: bool = False,
) -> CasoSql:
    return (
        [
            tipo,
            descricao,
            {
                "preparo": preparo,
                "verificacao": verificacao,
                "aceitar": aceitar,
                "recusar": recusar,
                "falha": falha,
            },
        ],
        esperado,
        visivel,
    )


_BASE_MATRICULA = [
    (_ALUNO, []),
    (_TURMA, []),
    _alunos((1, "Ana", "ana@escola.br"), (2, "Bia", "bia@escola.br")),
    _turmas((1, "A"), (2, "B")),
]
_INSERIR_MATRICULA = "INSERT INTO matricula (aluno_id, turma_id, nota) VALUES (?, ?, ?)"
_CHAVES_MATRICULA = (
    'SELECT "table", "from", "to" FROM pragma_foreign_key_list("matricula") '
    'ORDER BY "table"'
)
_BASE_INDICE: list[PreparoSql] = [
    (_MATRICULA, []),
    ("CREATE INDEX idx_turma ON matricula (turma_id)", []),
]
_CONSULTA_INDICE = """SELECT COUNT(*) AS total FROM pragma_index_list('matricula') AS i
       WHERE i.partial = 0 AND EXISTS (
           SELECT 1 FROM pragma_index_info(i.name) AS c
           WHERE c.seqno = 0 AND c.name = 'aluno_id' COLLATE NOCASE
       )"""
_BASE_DATA: tuple[PreparoSql, ...] = (
    ("CREATE INDEX " + _INDICE_DATA + " ON matricula (criado_em)", []),
)


def _contas(
    saldo1: int, saldo2: int, saldo3: int, *, falha: bool = False
) -> list[PreparoSql]:
    preparo: list[PreparoSql] = [
        (_CONTA, []),
        ("INSERT INTO conta VALUES (?, ?)", [(1, saldo1), (2, saldo2), (3, saldo3)]),
    ]
    if falha:
        preparo.append(
            (
                "CREATE TRIGGER falhar_credito BEFORE UPDATE OF saldo ON conta "
                "WHEN OLD.id = 2 AND NEW.saldo > OLD.saldo "
                "BEGIN SELECT RAISE(ABORT, 'falha de teste no credito'); END",
                [],
            )
        )
    return preparo


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
    "selecionar-colunas": {
        "linguagem": Linguagem.SQL,
        "funcao": "",
        "codigo_inicial": "-- A tabela aluno tem id, nome, email e nascimento.\n",
        "casos": [
            _consulta(
                "Devolve somente nome e e-mail, em ordem alfabética",
                [_alunos((1, "Bia", "b@escola.br"), (2, "Ana", "a@escola.br"))],
                [("Ana", "a@escola.br"), ("Bia", "b@escola.br")],
                True,
                ordenado=True,
            ),
            _consulta(
                "Funciona com um único aluno",
                [_alunos((5, "Caio", "outra@escola.br"))],
                [("Caio", "outra@escola.br")],
                True,
                ordenado=True,
            ),
            _consulta(
                "Ordena pelo nome mesmo quando os e-mails têm outra ordem",
                [
                    _alunos(
                        (8, "Lia", "a@escola.br"),
                        (3, "Davi", "z@escola.br"),
                        (6, "Eva", "x@escola.br"),
                    )
                ],
                [
                    ("Davi", "z@escola.br"),
                    ("Eva", "x@escola.br"),
                    ("Lia", "a@escola.br"),
                ],
                False,
                ordenado=True,
            ),
            _consulta(
                "Devolve uma lista vazia sem alunos", [], [], False, ordenado=True
            ),
        ],
    },
    "filtrar-por-faixa": {
        "linguagem": Linguagem.SQL,
        "funcao": "",
        "codigo_inicial": "-- matricula tem id, aluno_id, turma_id, nota e criado_em.\n",
        "casos": [
            _consulta(
                "Inclui as notas 7 e 10 e ordena da maior para a menor",
                [
                    _matriculas(
                        (1, 1, 1, 7, "2026-01-01"),
                        (2, 2, 1, 10, "2026-01-01"),
                        (3, 3, 1, 6.9, "2026-01-01"),
                    )
                ],
                [(2, 2, 1, 10, "2026-01-01"), (1, 1, 1, 7, "2026-01-01")],
                True,
                ordenado=True,
            ),
            _consulta(
                "Aceita nota fracionária e ignora nota ausente",
                [
                    _matriculas(
                        (1, 4, 2, None, "2026-02-02"), (2, 5, 2, 8.5, "2026-02-02")
                    )
                ],
                [(2, 5, 2, 8.5, "2026-02-02")],
                True,
                ordenado=True,
            ),
            _consulta(
                "Exclui notas acima de 10 e verifica a ordem com outros dados",
                [
                    _matriculas(
                        (5, 5, 2, 10.1, "2025-05-01"),
                        (6, 6, 2, 7.1, "2025-05-01"),
                        (7, 7, 2, 9.8, "2025-05-01"),
                    )
                ],
                [(7, 7, 2, 9.8, "2025-05-01"), (6, 6, 2, 7.1, "2025-05-01")],
                False,
                ordenado=True,
            ),
            _consulta("Devolve vazio sem matrículas", [], [], False, ordenado=True),
        ],
    },
    "media-por-turma": {
        "linguagem": Linguagem.SQL,
        "funcao": "",
        "codigo_inicial": "-- Use turma_id e nota da tabela matricula.\n",
        "casos": [
            _consulta(
                "Devolve o total e a média separadamente para cada turma",
                [
                    _matriculas(
                        (1, 1, 2, 8, "2026-01-01"),
                        (2, 2, 2, 5, "2026-01-01"),
                        (3, 3, 1, 10, "2026-01-01"),
                    )
                ],
                [(1, 1, 10), (2, 2, 6.5)],
                True,
            ),
            _consulta(
                "Conta a matrícula sem nota e ignora o nulo na média",
                [
                    _matriculas(
                        (1, 1, 3, None, "2026-01-01"), (2, 2, 3, 9, "2026-01-01")
                    )
                ],
                [(3, 2, 9)],
                True,
            ),
            _consulta(
                "Mantém a turma que só tem notas ausentes",
                [
                    _matriculas(
                        (1, 2, 9, None, "2026-02-01"),
                        (2, 3, 8, 0, "2026-02-01"),
                        (3, 4, 8, 6, "2026-02-01"),
                    )
                ],
                [(9, 1, None), (8, 2, 3)],
                False,
            ),
            _consulta("Devolve vazio sem matrículas", [], [], False),
        ],
    },
    "turmas-com-minimo": {
        "linguagem": Linguagem.SQL,
        "funcao": "",
        "codigo_inicial": "-- Use turma_id e nota da tabela matricula.\n",
        "casos": [
            _consulta(
                "Separa seis aprovados de cinco e ignora notas baixas na média",
                [
                    _matriculas(
                        *[
                            (i, i, turma, nota, "2026-01-01")
                            for i, (turma, nota) in enumerate(
                                [(1, 7)] * 6 + [(1, 4)] + [(2, 10)] * 5, start=1
                            )
                        ]
                    )
                ],
                [(1, 7)],
                True,
            ),
            _consulta(
                "Ordena as turmas da maior média para a menor",
                [
                    _matriculas(
                        *[
                            (i, i, turma, nota, "2026-02-01")
                            for i, (turma, nota) in enumerate(
                                [(1, 8)] * 6 + [(2, 9)] * 6, start=1
                            )
                        ]
                    )
                ],
                [(2, 9), (1, 8)],
                True,
                ordenado=True,
            ),
            _consulta(
                "Inclui notas iguais a 7 no cálculo e exclui nulos e reprovados",
                [
                    _matriculas(
                        *[
                            (i, i, 7, nota, "2026-03-01")
                            for i, nota in enumerate(
                                [7, 8, 8, 9, 9, 10, None, 2], start=1
                            )
                        ]
                    )
                ],
                [(7, 8.5)],
                False,
                ordenado=True,
            ),
            _consulta(
                "Devolve vazio quando nenhuma turma supera cinco aprovações",
                [],
                [],
                False,
                ordenado=True,
            ),
        ],
    },
    "criar-matricula": {
        "linguagem": Linguagem.SQL,
        "funcao": "",
        "codigo_inicial": "-- As tabelas aluno(id) e turma(id) já existem.\nCREATE TABLE matricula (\n    \n);\n",
        "casos": [
            _estado(
                "matricula",
                "Liga a matrícula ao aluno e à turma",
                _BASE_MATRICULA,
                _CHAVES_MATRICULA,
                [("aluno", "aluno_id", "id"), ("turma", "turma_id", "id")],
                True,
            ),
            _estado(
                "matricula",
                "Aceita nota ausente e recusa matrícula duplicada",
                _BASE_MATRICULA,
                'SELECT COUNT(*) FROM pragma_table_info("matricula") WHERE name = \'nota\' AND "notnull" = 0',
                [(1,)],
                True,
                aceitar=((_INSERIR_MATRICULA, (1, 1, None)),),
                recusar=((_INSERIR_MATRICULA, (1, 1, 8)),),
            ),
            _estado(
                "matricula",
                "Recusa um aluno ou uma turma inexistente",
                _BASE_MATRICULA,
                _CHAVES_MATRICULA,
                [("aluno", "aluno_id", "id"), ("turma", "turma_id", "id")],
                False,
                recusar=(
                    (_INSERIR_MATRICULA, (99, 1, 7)),
                    (_INSERIR_MATRICULA, (1, 99, 7)),
                ),
            ),
            _estado(
                "matricula",
                "Exige os dois vínculos e restringe apenas a combinação",
                _BASE_MATRICULA,
                "SELECT COUNT(*) FROM pragma_table_info('matricula') "
                "WHERE name IN ('aluno_id','turma_id') AND \"notnull\" = 1",
                [(2,)],
                False,
                aceitar=(
                    (_INSERIR_MATRICULA, (1, 1, 5)),
                    (_INSERIR_MATRICULA, (1, 2, 6)),
                    (_INSERIR_MATRICULA, (2, 1, 7)),
                ),
            ),
        ],
    },
    "juntar-tres-tabelas": {
        "linguagem": Linguagem.SQL,
        "funcao": "",
        "codigo_inicial": "-- Use aluno(id, nome), turma(id, codigo) e matricula(aluno_id, turma_id, nota).\n",
        "casos": [
            _consulta(
                "Associa nomes e códigos a partir das chaves",
                [
                    _alunos((2, "Ana", "a@escola.br"), (5, "Bia", "b@escola.br")),
                    _turmas((2, "B"), (5, "A")),
                    _matriculas((1, 5, 2, 8, "2026-01-01"), (2, 2, 5, 9, "2026-01-01")),
                ],
                [("Bia", "B", 8), ("Ana", "A", 9)],
                True,
            ),
            _consulta(
                "Inclui a matrícula que ainda está sem nota",
                [
                    _alunos((1, "Davi", "d@escola.br")),
                    _turmas((8, "N")),
                    _matriculas((3, 1, 8, None, "2026-01-01")),
                ],
                [("Davi", "N", None)],
                True,
            ),
            _consulta(
                "Preserva linhas iguais quando representam matrículas distintas",
                [
                    _alunos(
                        (2, "Lia", "l2@escola.br"),
                        (5, "Lia", "l5@escola.br"),
                        (7, "Eva", "e@escola.br"),
                    ),
                    _turmas((3, "T"), (9, "U")),
                    _matriculas((1, 2, 3, 8, "2026-02-02"), (2, 5, 3, 8, "2026-02-02")),
                ],
                [("Lia", "T", 8), ("Lia", "T", 8)],
                False,
            ),
            _consulta("Devolve vazio sem matrículas", [], [], False),
        ],
    },
    "alunos-sem-matricula": {
        "linguagem": Linguagem.SQL,
        "funcao": "",
        "codigo_inicial": "-- Use aluno(id, nome) e matricula(id, aluno_id, turma_id, nota).\n",
        "casos": [
            _consulta(
                "Inclui aluno sem matrícula com valor zero",
                [
                    _alunos((1, "Ana", "a@escola.br"), (2, "Bia", "b@escola.br")),
                    _matriculas((1, 1, 1, 8, "2026-01-01"), (2, 1, 2, 9, "2026-02-01")),
                ],
                [("Ana", 2), ("Bia", 0)],
                True,
            ),
            _consulta(
                "Conta matrícula sem nota lançada",
                [
                    _alunos((1, "Davi", "d@escola.br")),
                    _matriculas((3, 1, 8, None, "2026-01-01")),
                ],
                [("Davi", 1)],
                True,
            ),
            _consulta(
                "Distingue dois alunos com o mesmo nome",
                [
                    _alunos((2, "Lia", "l2@escola.br"), (5, "Lia", "l5@escola.br")),
                    _matriculas((1, 2, 3, 7, "2026-02-01"), (2, 2, 6, 5, "2026-03-01")),
                ],
                [("Lia", 2), ("Lia", 0)],
                False,
            ),
            _consulta(
                "Mantém todos os alunos quando ninguém está matriculado",
                [_alunos((1, "Caio", "c@escola.br"), (4, "Eva", "e@escola.br"))],
                [("Caio", 0), ("Eva", 0)],
                False,
            ),
        ],
    },
    "inserir-aluno": {
        "linguagem": Linguagem.SQL,
        "funcao": "",
        "codigo_inicial": "-- A tabela aluno tem id, nome, email e nascimento.\n",
        "casos": [
            _estado(
                "insercao",
                "Cadastra Ana com o e-mail pedido",
                [(_ALUNO, [])],
                "SELECT nome, email FROM aluno ORDER BY id",
                [("Ana", "ana@escola.br")],
                True,
            ),
            _estado(
                "insercao",
                "Preserva o aluno que já estava cadastrado",
                [(_ALUNO, []), _alunos((13, "Bia", "bia@escola.br"))],
                "SELECT nome, email FROM aluno ORDER BY nome",
                [("Ana", "ana@escola.br"), ("Bia", "bia@escola.br")],
                True,
            ),
            _estado(
                "insercao",
                "Cadastra uma única Ana e funciona com outros IDs existentes",
                [
                    (_ALUNO, []),
                    _alunos(
                        (1, "Bia", "bia@escola.br"),
                        (2, "Caio", "caio@escola.br"),
                        (20, "Lia", "lia@escola.br"),
                    ),
                ],
                "SELECT nome, email FROM aluno ORDER BY nome",
                [
                    ("Ana", "ana@escola.br"),
                    ("Bia", "bia@escola.br"),
                    ("Caio", "caio@escola.br"),
                    ("Lia", "lia@escola.br"),
                ],
                False,
            ),
        ],
    },
    "transferencia-em-transacao": {
        "linguagem": Linguagem.SQL,
        "funcao": "",
        "codigo_inicial": "-- A tabela conta tem id e saldo.\n",
        "casos": [
            _estado(
                "transacao",
                "Debita 100 da conta 1 e credita 100 na conta 2",
                _contas(500, 250, 80),
                _CONSULTA_SALDOS,
                [(1, 400), (2, 350), (3, 80)],
                True,
            ),
            _estado(
                "transacao",
                "Preserva os saldos quando o crédito falha",
                _contas(500, 250, 80, falha=True),
                _CONSULTA_SALDOS,
                [(1, 500), (2, 250), (3, 80)],
                True,
                falha=True,
            ),
            _estado(
                "transacao",
                "Transfere a partir de saldos diferentes e preserva a terceira conta",
                _contas(120, 0, 999),
                _CONSULTA_SALDOS,
                [(1, 20), (2, 100), (3, 999)],
                False,
            ),
            _estado(
                "transacao",
                "Confirma a reversão com outros saldos",
                _contas(800, 35, 180, falha=True),
                _CONSULTA_SALDOS,
                [(1, 800), (2, 35), (3, 180)],
                False,
                falha=True,
            ),
        ],
    },
    "indexar-chave-estrangeira": {
        "linguagem": Linguagem.SQL,
        "funcao": "",
        "codigo_inicial": "-- A tabela matricula tem aluno_id e turma_id.\n",
        "casos": [
            _estado(
                "indice",
                "Cria um índice que começa por matricula.aluno_id",
                [(_MATRICULA, [])],
                _CONSULTA_INDICE,
                [(1,)],
                True,
            ),
            _estado(
                "indice",
                "Funciona com outro índice já existente",
                _BASE_INDICE,
                _CONSULTA_INDICE,
                [(1,)],
                True,
            ),
            _estado(
                "indice",
                "Cria o índice sem alterar as linhas existentes",
                [
                    *_BASE_INDICE,
                    _matriculas(
                        (11, 7, 3, 6, "2026-04-01"), (12, 7, 5, 8, "2026-04-01")
                    ),
                ],
                "SELECT COUNT(*), (SELECT COUNT(*) FROM matricula) FROM ("
                + _CONSULTA_INDICE
                + ") WHERE total = 1",
                [(1, 2)],
                False,
            ),
        ],
    },
    "funcao-na-coluna": {
        "linguagem": Linguagem.SQL,
        "funcao": "",
        "codigo_inicial": "-- matricula tem id, aluno_id, turma_id, nota e criado_em.\n",
        "casos": [
            _consulta(
                "Busca as datas de 2026 usando o índice em criado_em",
                [
                    *_BASE_DATA,
                    _matriculas(
                        (1, 1, 1, 7, "2025-12-31"),
                        (2, 2, 1, 8, "2026-01-01"),
                        (3, 3, 1, 9, "2026-12-31"),
                        (4, 4, 1, 10, "2027-01-01"),
                    ),
                ],
                [(2, 2, 1, 8, "2026-01-01"), (3, 3, 1, 9, "2026-12-31")],
                True,
                indice=_INDICE_DATA,
            ),
            _consulta(
                "Inclui registros de dezembro mesmo quando têm hora",
                [
                    *_BASE_DATA,
                    _matriculas(
                        (11, 4, 5, 9, "2026-12-31 23:59:59"),
                        (12, 1, 5, 7, "2027-01-01 00:00:00"),
                    ),
                ],
                [(11, 4, 5, 9, "2026-12-31 23:59:59")],
                True,
                indice=_INDICE_DATA,
            ),
            _consulta(
                "Mantém os limites do intervalo quando mudam IDs e datas",
                [
                    *_BASE_DATA,
                    _matriculas(
                        (2, 4, 7, 8.5, "2026-07-20 01:00:00"),
                        (7, 6, 5, None, "2026-01-01 00:00:00"),
                        (9, 2, 1, 6, "2028-05-01"),
                    ),
                ],
                [
                    (7, 6, 5, None, "2026-01-01 00:00:00"),
                    (2, 4, 7, 8.5, "2026-07-20 01:00:00"),
                ],
                False,
                indice=_INDICE_DATA,
            ),
        ],
    },
}
