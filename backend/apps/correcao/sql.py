import json
import re
from secrets import randbelow
from sqlite3 import complete_statement
from uuid import uuid4

from django.core.exceptions import ValidationError

from . import harness
from .models import CasoDeTeste

VERSAO = "4"
_TRIVIA = r"(?:\s|--[^\n]*(?:\n|$)|/\*(?:[^*]|\*(?!/))*\*/)*"


def _identificador(nome: str) -> str:
    return rf'(?:{nome}|"{nome}"|`{nome}`|\[{nome}\])'


def _criar_tabela(nome: str) -> str:
    return (
        rf"CREATE\b{_TRIVIA}TABLE\b{_TRIVIA}"
        rf"(?:IF\b{_TRIVIA}NOT\b{_TRIVIA}EXISTS\b{_TRIVIA})?"
        rf"{_identificador(nome)}{_TRIVIA}\("
    )


_CRIAR_ALUNO = _criar_tabela("aluno")
_COMANDO_POR_TIPO = {
    "consulta": r"(?:SELECT|WITH)\b",
    "matricula": _criar_tabela("matricula"),
    "insercao": rf"INSERT\b{_TRIVIA}INTO\b{_TRIVIA}{_identificador('aluno')}{_TRIVIA}\(",
    "indice": rf"CREATE\b{_TRIVIA}(?:UNIQUE\b{_TRIVIA})?INDEX\b",
}


def _comeca_com(comando: str, padrao: str) -> bool:
    return re.match(_TRIVIA + padrao, comando, re.IGNORECASE) is not None


def _comandos_da_transacao(codigo: str) -> list[str]:
    comandos = []
    inicio = 0
    for fim in re.finditer(";", codigo):
        parte = codigo[inicio : fim.end()]
        if complete_statement(parte):
            comandos.append(parte)
            inicio = fim.end()
    if not re.fullmatch(_TRIVIA, codigo[inicio:]):
        return []
    if (
        len(comandos) < 4
        or not _comeca_com(comandos[0], r"BEGIN\b")
        or not _comeca_com(comandos[-1], r"(?:COMMIT|END)\b")
        or not all(_comeca_com(comando, r"UPDATE\b") for comando in comandos[1:-1])
    ):
        return []
    return comandos


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


def autorizar_verificacao(acao, nome, argumento, banco, origem):
    if acao == sqlite3.SQLITE_PRAGMA and nome == "foreign_key_list":
        return sqlite3.SQLITE_OK
    return autorizar(acao, nome, argumento, banco, origem)


def autorizar_comando(tipo, acao, nome, argumento, banco, origem):
    if autorizar(acao, nome, argumento, banco, origem) == sqlite3.SQLITE_DENY:
        return sqlite3.SQLITE_DENY
    if acao in (sqlite3.SQLITE_SELECT, sqlite3.SQLITE_READ, sqlite3.SQLITE_FUNCTION,
                sqlite3.SQLITE_RECURSIVE):
        return sqlite3.SQLITE_OK
    if tipo == "matricula" and acao == sqlite3.SQLITE_CREATE_TABLE and nome.lower() == "matricula":
        return sqlite3.SQLITE_OK
    if tipo in ("matricula", "indice") and (
        (acao == sqlite3.SQLITE_CREATE_INDEX and argumento.lower() == "matricula")
        or (acao in (sqlite3.SQLITE_INSERT, sqlite3.SQLITE_UPDATE)
            and nome == "sqlite_master")
        or (tipo == "indice" and acao == sqlite3.SQLITE_REINDEX)
    ):
        return sqlite3.SQLITE_OK
    if tipo == "insercao" and acao == sqlite3.SQLITE_INSERT and nome.lower() == "aluno":
        return sqlite3.SQLITE_OK
    if tipo == "transacao" and (
        acao == sqlite3.SQLITE_TRANSACTION
        or (acao == sqlite3.SQLITE_UPDATE and nome.lower() == "conta" and argumento.lower() == "saldo")
    ):
        return sqlite3.SQLITE_OK
    return sqlite3.SQLITE_DENY


def transferir(banco, comandos, falha):
    try:
        banco.execute(comandos[0])
        for comando in comandos[1:-1]:
            banco.execute(comando)
        banco.execute(comandos[-1])
    except sqlite3.IntegrityError as erro:
        if not falha or str(erro) != "falha de teste no credito":
            raise
        if banco.in_transaction:
            banco.rollback()
        return True
    return not falha and not banco.in_transaction


def avaliar_caso(comando, tipo, dados, esperado, mostrar):
    banco = sqlite3.connect(":memory:", isolation_level=None)
    try:
        banco.execute("PRAGMA foreign_keys = ON")
        for instrucao, parametros in dados["preparo"]:
            if parametros and isinstance(parametros[0], list):
                banco.executemany(instrucao, parametros)
            else:
                banco.execute(instrucao, parametros)
        banco.set_authorizer(lambda *args: autorizar_comando(tipo, *args))
        if tipo == "transacao":
            passou = transferir(banco, comando, dados.get("falha", False))
        else:
            cursor = banco.execute(comando)
            passou = True

        if tipo == "consulta":
            linhas = cursor.fetchmany(max(esperado + 1, 20) if mostrar else esperado + 1)
            passou = cursor.description is not None
            if any(isinstance(valor, bytes) for linha in linhas for valor in linha):
                return False, [], []
            if "indice" in dados:
                plano = banco.execute("EXPLAIN QUERY PLAN " + comando)
                passou = passou and any(
                    detalhe.upper().startswith("SEARCH ") and (
                        "USING INDEX " + dados["indice"] + " (" in detalhe
                        or "USING COVERING INDEX " + dados["indice"] + " (" in detalhe
                    )
                    for _, _, _, detalhe in plano
                )
            grade = []
            if mostrar and cursor.description:
                grade = [[coluna[0] for coluna in cursor.description], *linhas[:20]]
            return passou, grade, linhas

        banco.set_authorizer(autorizar_verificacao)
        if passou and "verificacao" in dados:
            passou = banco.execute(dados["verificacao"]).fetchall() == [
                tuple(linha) for linha in esperado
            ]
        if passou:
            for instrucao, parametros in dados.get("aceitar", []):
                try:
                    banco.execute(instrucao, parametros)
                except sqlite3.IntegrityError:
                    return False, [], None
            for instrucao, parametros in dados.get("recusar", []):
                try:
                    banco.execute(instrucao, parametros)
                except sqlite3.IntegrityError:
                    continue
                passou = False
                break
        return passou, [], None
    finally:
        banco.close()


def executar_casos(entrada):
    for indice, (ordem, tipo, dados, esperado) in enumerate(entrada["casos"]):
        mostrar = entrada["mostrar_saida"] and indice == 0
        passou, grade, linhas = avaliar_caso(entrada["comando"], tipo, dados, esperado, mostrar)
        if grade:
            print(entrada["marcador"] + ":saida:" + json.dumps(grade, ensure_ascii=True))
        resultado = str(int(passou)) if linhas is None else json.dumps(
            {"passou": passou, "linhas": linhas}, ensure_ascii=True
        )
        print("%s:%d:%s" % (entrada["marcador"], ordem, resultado))


def executar(entrada):
    if entrada.get("tipo") == "casos":
        executar_casos(entrada)
        return

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

    tipo = casos[0].argumentos[0]
    novo_comando = codigo if _fim_do_comando(codigo) is not None else codigo + "\n;"
    if tipo == "transacao":
        if _comandos_da_transacao(codigo):
            return codigo
        if _comandos_da_transacao(novo_comando):
            return novo_comando
        mensagem = "Use BEGIN, os comandos UPDATE e COMMIT para transferir os saldos."
        raise ValidationError(
            {"codigo": ValidationError(mensagem, code="comando_sql_invalido")}
        )
    if tipo in _COMANDO_POR_TIPO:
        if _fim_do_comando(novo_comando) and _comeca_com(
            novo_comando, _COMANDO_POR_TIPO[tipo]
        ):
            return novo_comando
        mensagem = "Escreva um único comando SQL do tipo pedido no exercício."
        raise ValidationError(
            {"codigo": ValidationError(mensagem, code="comando_sql_invalido")}
        )

    nota = tipo == "nota"
    fim = _fim_do_comando(codigo)
    if nota:
        if fim is not None:
            codigo = codigo[: fim - 1] + codigo[fim:]
        comando = f"CREATE TABLE notas (\n{codigo}\n);"
    else:
        comando = codigo if fim is not None else codigo + "\n;"

    if _fim_do_comando(comando) is None or (
        not nota and not _comeca_com(comando, _CRIAR_ALUNO)
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


def resultado_do_caso(caso: CasoDeTeste, valor: str) -> bool | None:
    if caso.argumentos[0] != "consulta":
        return valor == "1" if valor in ("0", "1") else None

    try:
        dados = json.loads(valor)
    except ValueError:
        return None
    if not isinstance(dados, dict) or not isinstance(dados.get("passou"), bool):
        return None
    linhas = dados.get("linhas")
    if not isinstance(linhas, list) or any(
        not isinstance(linha, list) for linha in linhas
    ):
        return None
    if not dados["passou"]:
        return False
    esperado = caso.esperado
    if not isinstance(esperado, list) or len(linhas) != len(esperado):
        return False
    if caso.argumentos[2].get("ordenado"):
        return harness.iguais(linhas, esperado)

    faltam = list(esperado)
    for linha in linhas:
        indice = next(
            (i for i, item in enumerate(faltam) if harness.iguais(linha, item)), None
        )
        if indice is None:
            return False
        faltam.pop(indice)
    return True


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


def _quantidade_esperada(caso: CasoDeTeste) -> int:
    if not isinstance(caso.esperado, list):
        raise ValueError(f"Caso SQL {caso.ordem}: linhas esperadas devem ser uma lista.")
    return len(caso.esperado)


def montar_entrada(
    comando: str, casos: list[CasoDeTeste], *, mostrar_saida: bool = False
) -> tuple[str, str]:
    marcador = f"cq_{uuid4().hex}" if casos else ""
    if casos and casos[0].argumentos[0] in {*_COMANDO_POR_TIPO, "transacao"}:
        tipo = casos[0].argumentos[0]
        entrada = {
            "tipo": "casos",
            "comando": _comandos_da_transacao(comando)
            if tipo == "transacao"
            else comando,
            "casos": [
                (
                    caso.ordem,
                    caso.argumentos[0],
                    caso.argumentos[2],
                    _quantidade_esperada(caso)
                    if caso.argumentos[0] == "consulta"
                    else caso.esperado,
                )
                for caso in casos
            ],
            "marcador": marcador,
            "mostrar_saida": mostrar_saida,
        }
        return json.dumps(entrada, ensure_ascii=False), marcador

    testes = []
    for caso in casos:
        comandos: list[tuple[str, tuple[int | float, ...]]]
        consulta: tuple[str, tuple[int | float, ...]]
        chave, *_ = caso.argumentos
        if chave == "nota":
            valor, esperado = caso.argumentos[2], caso.esperado
            if not isinstance(valor, int | float) or not isinstance(esperado, bool):
                raise ValueError(
                    f"Caso SQL {caso.ordem}: nota numérica e esperado booleano."
                )
            comandos = [("INSERT OR IGNORE INTO notas (nota) VALUES (?)", (valor,))]
            consulta = (
                "SELECT changes() = ? "
                "AND (NOT changes() OR EXISTS (SELECT 1 FROM notas WHERE nota = ?))",
                (int(esperado), valor),
            )
        else:
            insercoes, verificacao = _CASOS_ALUNO[chave]
            comandos = [(insercao, ()) for insercao in insercoes.splitlines()]
            consulta = (verificacao, ())
        testes.append((caso.ordem, comandos, consulta))

    entrada_legada = {"comando": comando, "casos": testes, "marcador": marcador}
    return json.dumps(entrada_legada, ensure_ascii=False), marcador
