import json
import re
from secrets import randbelow
from sqlite3 import complete_statement
from uuid import uuid4

from django.core.exceptions import ValidationError

from .models import CasoDeTeste

VERSAO = "3"
_TRIVIA = r"(?:\s|--[^\n]*(?:\n|$)|/\*(?:[^*]|\*(?!/))*\*/)*"
_CRIAR_ALUNO = (
    rf"{_TRIVIA}CREATE\b{_TRIVIA}TABLE\b{_TRIVIA}"
    rf"(?:IF\b{_TRIVIA}NOT\b{_TRIVIA}EXISTS\b{_TRIVIA})?"
    rf'(?:aluno|"aluno"|`aluno`|\[aluno\]){_TRIVIA}\('
)

_INSERIR_ALUNO = "INSERT OR IGNORE INTO aluno (id, nome, email, nascimento) VALUES"
_CASOS_ALUNO = {
    "tabela": (
        "",
        "SELECT count(*) = 4 FROM pragma_table_info('aluno') "
        "WHERE name COLLATE NOCASE IN ('id', 'nome', 'email', 'nascimento')",
    ),
    "chave_primaria": (
        "",
        "SELECT count(*) = 1 AND max(name) = 'id' COLLATE NOCASE "
        "FROM pragma_table_info('aluno') WHERE pk > 0",
    ),
    "nome_obrigatorio": (
        f"{_INSERIR_ALUNO} (1, NULL, 'ana@exemplo.com', '2001-05-09');",
        """SELECT changes() = 0
   AND EXISTS (SELECT 1 FROM pragma_table_info('aluno')
               WHERE name = 'nome' COLLATE NOCASE AND "notnull" = 1
                 AND (type LIKE '%TEXT%' OR type LIKE '%CHAR%' OR type LIKE '%CLOB%')
                 AND type NOT LIKE '%INT%')""",
    ),
    "email_obrigatorio": (
        f"{_INSERIR_ALUNO} (1, 'Ana', NULL, '2001-05-09');",
        """SELECT changes() = 0
   AND EXISTS (SELECT 1 FROM pragma_table_info('aluno')
               WHERE name = 'email' COLLATE NOCASE AND "notnull" = 1
                 AND (type LIKE '%TEXT%' OR type LIKE '%CHAR%' OR type LIKE '%CLOB%')
                 AND type NOT LIKE '%INT%')""",
    ),
    "email_unico": (
        f"{_INSERIR_ALUNO} (1, 'Ana', 'ana@exemplo.com', '2001-05-09');\n"
        f"{_INSERIR_ALUNO} (2, 'Bia', 'ana@exemplo.com', '2002-06-10');",
        """SELECT changes() = 0 AND EXISTS (SELECT 1 FROM aluno WHERE id = 1)
   AND EXISTS (
       SELECT 1 FROM pragma_index_list('aluno') AS indice
       JOIN pragma_index_info(indice.name) AS coluna
       WHERE indice."unique" = 1 AND indice.partial = 0
       GROUP BY indice.name
       HAVING count(*) = 1 AND max(coluna.name) = 'email' COLLATE NOCASE
   )""",
    ),
    "data_opcional": (
        f"{_INSERIR_ALUNO} (1, 'Ana', 'ana@exemplo.com', NULL);",
        """SELECT changes() = 1 AND EXISTS (SELECT 1 FROM aluno WHERE nascimento IS NULL)
   AND EXISTS (SELECT 1 FROM pragma_table_info('aluno')
               WHERE name = 'nascimento' COLLATE NOCASE AND type COLLATE NOCASE IN ('DATE', 'DATETIME'))""",
    ),
    "id_unico": (
        f"{_INSERIR_ALUNO} (8, 'Iara', 'iara@exemplo.com', '2001-08-24');\n"
        f"{_INSERIR_ALUNO} (8, 'Leo', 'leo@exemplo.com', '2003-02-16');",
        "SELECT changes() = 0 AND EXISTS (SELECT 1 FROM aluno WHERE email = 'iara@exemplo.com')",
    ),
    "cadastro_com_data": (
        f"{_INSERIR_ALUNO} (12, 'Davi', 'davi@exemplo.com', '2004-02-29');\n"
        f"{_INSERIR_ALUNO} (13, 'Davi', 'davi2@exemplo.com', '2004-02-29');",
        """SELECT changes() = 1 AND EXISTS (SELECT 1 FROM aluno
                               WHERE id = 13 AND nascimento = '2004-02-29')
   AND EXISTS (SELECT 1 FROM aluno WHERE id = 12 AND nascimento = '2004-02-29')""",
    ),
}


PROGRAMA = """
import json
import sqlite3
import sys


def autorizar(acao, nome, argumento, banco, origem):
    if acao in (
        sqlite3.SQLITE_ATTACH,
        sqlite3.SQLITE_DETACH,
        sqlite3.SQLITE_CREATE_VTABLE,
    ):
        return sqlite3.SQLITE_DENY
    if acao == sqlite3.SQLITE_PRAGMA and nome not in (
        "table_info", "index_list", "index_info"
    ):
        return sqlite3.SQLITE_DENY
    if acao == sqlite3.SQLITE_FUNCTION and argumento in (
        "edit", "load_extension", "readfile", "writefile"
    ):
        return sqlite3.SQLITE_DENY
    return sqlite3.SQLITE_OK


def executar(entrada):
    banco = sqlite3.connect(":memory:", isolation_level=None)
    try:
        banco.set_authorizer(autorizar)
        cursor = banco.execute(entrada["comando"])
        if not entrada["casos"]:
            for linha in cursor:
                print("|".join("" if valor is None else str(valor) for valor in linha))
            return

        for ordem, comandos, consulta in entrada["casos"]:
            banco.execute("SAVEPOINT caso")
            for comando, parametros in comandos:
                banco.execute(comando, parametros)
            passou, = banco.execute(*consulta).fetchone()
            banco.execute("ROLLBACK TO caso")
            banco.execute("RELEASE caso")
            print(f"{entrada['marcador']}:{ordem}:{int(bool(passou))}")
    finally:
        banco.close()


try:
    executar(json.load(sys.stdin))
except sqlite3.Error as erro:
    print(erro, file=sys.stderr)
    sys.exit(1)
"""


def _fim_do_comando(codigo: str) -> int | None:
    for fim in re.finditer(";", codigo):
        if complete_statement(codigo[: fim.end()]):
            if re.fullmatch(_TRIVIA, codigo[fim.end() :]):
                return fim.end()
            break
    return None


def preparar_comando(codigo: str, casos: list[CasoDeTeste]) -> str:
    if re.search(r"(?m)^\s*\.[a-zA-Z]", codigo):
        raise ValidationError(
            {
                "codigo": ValidationError(
                    "Use apenas comandos SQL. Comandos do console SQLite não são permitidos.",
                    code="comando_sqlite_invalido",
                )
            }
        )
    if not casos:
        return codigo

    nota = casos[0].argumentos[0] == "nota"
    fim = _fim_do_comando(codigo)
    if nota:
        if fim is not None:
            codigo = codigo[: fim - 1] + codigo[fim:]
        comando = f"CREATE TABLE notas (\n{codigo}\n);"
    else:
        comando = codigo if fim is not None else codigo + "\n;"

    if _fim_do_comando(comando) is None or (
        not nota and not re.match(_CRIAR_ALUNO, comando, re.IGNORECASE)
    ):
        mensagem = (
            "Escreva apenas a definição da coluna nota."
            if nota
            else "Escreva um único CREATE TABLE para a tabela aluno."
        )
        raise ValidationError(
            {"codigo": ValidationError(mensagem, code="comando_sql_invalido")}
        )
    return comando


def complementar_casos(casos: list[CasoDeTeste]) -> list[CasoDeTeste]:
    if casos[0].argumentos[0] != "nota":
        return casos

    notas = (
        (5, True),
        ((1 + randbelow(9999)) / 1000, True),
        (42, False),
        (-(1 + randbelow(99)) / 1000, False),
        (10 + (1 + randbelow(99)) / 1000, False),
    )
    ultima_ordem = max(caso.ordem for caso in casos)
    return [
        *casos,
        *(
            CasoDeTeste(
                ordem=ordem,
                argumentos=["nota", "Valida o intervalo de notas", valor],
                esperado=esperado,
                visivel=False,
            )
            for ordem, (valor, esperado) in enumerate(notas, start=ultima_ordem + 1)
        ),
    ]


def montar_entrada(comando: str, casos: list[CasoDeTeste]) -> tuple[str, str]:
    marcador = f"cq_{uuid4().hex}" if casos else ""
    testes = []
    for caso in casos:
        chave, *_ = caso.argumentos
        if chave == "nota":
            valor = caso.argumentos[2]
            comandos = [("INSERT OR IGNORE INTO notas (nota) VALUES (?)", (valor,))]
            consulta = (
                "SELECT changes() = ? "
                "AND (NOT changes() OR EXISTS (SELECT 1 FROM notas WHERE nota = ?))",
                (int(caso.esperado), valor),
            )
        else:
            insercoes, verificacao = _CASOS_ALUNO[chave]
            comandos = [(insercao, ()) for insercao in insercoes.splitlines()]
            consulta = (verificacao, ())
        testes.append((caso.ordem, comandos, consulta))

    entrada = {"comando": comando, "casos": testes, "marcador": marcador}
    return json.dumps(entrada, ensure_ascii=False), marcador
