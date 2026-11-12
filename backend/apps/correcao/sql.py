import re
from sqlite3 import complete_statement
from uuid import uuid4

from django.core.exceptions import ValidationError

from .models import CasoDeTeste

VERSAO = "2"
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


def montar_programa(codigo: str) -> str:
    if re.search(r"(?m)^\s*\.[a-zA-Z]", codigo):
        raise ValidationError(
            {
                "codigo": ValidationError(
                    "Use apenas comandos SQL. Comandos do console SQLite não são permitidos.",
                    code="comando_sqlite_invalido",
                )
            }
        )
    return ".bail on\n" + codigo.rstrip() + "\n"


def _fim_do_comando(codigo: str) -> int | None:
    for fim in re.finditer(";", codigo):
        if complete_statement(codigo[: fim.end()]):
            if re.fullmatch(_TRIVIA, codigo[fim.end() :]):
                return fim.end()
            break
    return None


def montar_correcao(codigo: str, casos: list[CasoDeTeste]) -> tuple[str, str]:
    nota = casos[0].argumentos[0] == "nota"
    fim = _fim_do_comando(codigo)
    if nota:
        if fim is not None:
            codigo = codigo[: fim - 1] + codigo[fim:]
        comando = f"CREATE TABLE notas (\n{codigo}\n);"
    else:
        comando = codigo if fim is not None else codigo + "\n;"
    programa = montar_programa(comando)
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

    marcador = f"cq_{uuid4().hex}"
    partes = [programa]
    for caso in casos:
        chave, *_ = caso.argumentos
        if chave == "nota":
            valor, esperado = caso.argumentos[2], caso.esperado
            # Os dois entram crus no script: só número e booleano passam, para
            # um caso mal cadastrado no admin não virar SQL arbitrário.
            if not isinstance(valor, int | float) or not isinstance(esperado, bool):
                raise ValueError(f"Caso SQL {caso.ordem}: nota numérica e esperado booleano.")
            comandos = f"INSERT OR IGNORE INTO notas (nota) VALUES ({valor});"
            consulta = (
                f"SELECT changes() = {int(esperado)} "
                f"AND (NOT changes() OR EXISTS (SELECT 1 FROM notas WHERE nota = {valor}))"
            )
        else:
            comandos, consulta = _CASOS_ALUNO[chave]
        partes.extend(
            (
                "SAVEPOINT caso;",
                comandos,
                f"SELECT '{marcador}:{caso.ordem}:' || COALESCE(({consulta}), 0);",
                "ROLLBACK TO caso;",
                "RELEASE caso;",
            )
        )
    return "\n".join(partes) + "\n", marcador
