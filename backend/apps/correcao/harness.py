import ast
import json
import math
from collections.abc import Iterable

from .models import CasoDeTeste

MARCADOR = "@@RESULTADO@@"

VERSAO = "4"

_MODELO = """

import json as _cq_json
import sys as _cq_sys
from contextlib import redirect_stdout as _cq_redirect_stdout, redirect_stderr as _cq_redirect_stderr
from io import StringIO as _cq_StringIO

_cq_funcao = globals().get("{funcao}")
_cq_casos = _cq_json.loads(_cq_sys.stdin.read())
_cq_saida = []
for _cq_indice, _cq_args in enumerate(_cq_casos):
    _cq_argumentos = _cq_args
    if not callable(_cq_funcao):
        _cq_saida.append({{"ok": False, "erro": "FuncaoAusente", "mensagem": ""}})
        continue
    try:
        if {personalizado}:
            _cq_args = list(_cq_args)
            for _cq_i in range(len(_cq_args), max(_cq_entradas_personalizadas) + 1):
                if _cq_i in _cq_entradas_personalizadas:
                    _cq_args.append(_cq_entradas_personalizadas[_cq_i])
                else:
                    _cq_padroes = _cq_funcao.__defaults__ or ()
                    _cq_inicio = _cq_funcao.__code__.co_argcount - len(_cq_padroes)
                    _cq_args.append(_cq_padroes[_cq_i - _cq_inicio])
            _cq_args = [_cq_entradas_personalizadas.get(_cq_i, _cq_arg) for _cq_i, _cq_arg in enumerate(_cq_args)]
            _cq_argumentos = _cq_json.loads(_cq_json.dumps(_cq_args))
        with _cq_redirect_stdout(_cq_sys.stdout if _cq_indice == 0 else _cq_StringIO()), _cq_redirect_stderr(_cq_sys.stderr if _cq_indice == 0 else _cq_StringIO()):
            _cq_valor = _cq_funcao(*_cq_args)
        _cq_json.dumps(_cq_valor)
        _cq_saida.append({{"ok": True, "valor": _cq_valor}})
    except Exception as _cq_e:
        _cq_saida.append(
            {{"ok": False, "erro": type(_cq_e).__name__, "mensagem": str(_cq_e)[:300]}}
        )
    if {personalizado}:
        _cq_saida[-1]["argumentos"] = _cq_argumentos
print("{marcador}" + _cq_json.dumps(_cq_saida, ensure_ascii=False))
"""


def parametros_de(codigo: str, funcao: str) -> list[str]:
    try:
        programa = ast.parse(codigo)
    except SyntaxError:
        return []
    for node in programa.body:
        if isinstance(node, ast.FunctionDef) and node.name == funcao:
            return [arg.arg for arg in node.args.posonlyargs + node.args.args]
    return []


def entradas_do_codigo(
    codigo: str, funcao: str, parametros: list[str]
) -> dict[int, str]:
    nomes: set[str] = set()
    for node in ast.parse(codigo).body:
        if isinstance(node, ast.FunctionDef) and node.name == funcao:
            break
        if isinstance(node, ast.Assign):
            alvos = node.targets
        elif isinstance(node, ast.AnnAssign) and node.value is not None:
            alvos = [node.target]
        else:
            continue
        for alvo in alvos:
            nomes.update(n.id for n in ast.walk(alvo) if isinstance(n, ast.Name))
    return {indice: nome for indice, nome in enumerate(parametros) if nome in nomes}


def montar_programa(
    *, codigo: str, funcao: str, entradas: dict[int, str] | None = None
) -> str:
    if not funcao.isidentifier():
        raise ValueError(f"nome de função inválido: {funcao!r}")
    if entradas:
        node = next(
            n
            for n in ast.parse(codigo).body
            if isinstance(n, ast.FunctionDef) and n.name == funcao
        )
        linha = min([node.lineno, *(d.lineno for d in node.decorator_list)]) - 1
        linhas = codigo.splitlines()
        valores = ", ".join(f"{indice}: {nome}" for indice, nome in entradas.items())
        linhas.insert(linha, f"_cq_entradas_personalizadas = {{{valores}}}")
        codigo = "\n".join(linhas)
    return (
        codigo.rstrip()
        + "\n"
        + _MODELO.format(funcao=funcao, marcador=MARCADOR, personalizado=bool(entradas))
    )


def montar_entrada(casos: Iterable[CasoDeTeste]) -> str:
    return json.dumps([caso.argumentos for caso in casos], ensure_ascii=False)


def separar_saida(stdout: str) -> tuple[str, list[object] | None]:
    linhas = stdout.splitlines()
    marcadores = [
        indice for indice, linha in enumerate(linhas) if linha.startswith(MARCADOR)
    ]
    if len(marcadores) != 1:
        return stdout, None

    indice = marcadores[0]
    try:
        resultados = json.loads(linhas[indice][len(MARCADOR) :])
    except ValueError:
        return stdout, None
    if not isinstance(resultados, list):
        return stdout, None
    impresso = "\n".join(linhas[:indice] + linhas[indice + 1 :])
    return impresso, resultados


def iguais(obtido: object, esperado: object) -> bool:
    if isinstance(esperado, bool) or isinstance(obtido, bool):
        return type(obtido) is type(esperado) and obtido == esperado
    if isinstance(esperado, (int, float)) and isinstance(obtido, (int, float)):
        return math.isclose(obtido, esperado, rel_tol=1e-9, abs_tol=1e-9)
    if isinstance(esperado, list) and isinstance(obtido, list):
        return len(obtido) == len(esperado) and all(
            iguais(o, e) for o, e in zip(obtido, esperado, strict=True)
        )
    if isinstance(esperado, dict) and isinstance(obtido, dict):
        return obtido.keys() == esperado.keys() and all(
            iguais(obtido[k], esperado[k]) for k in esperado
        )
    return obtido == esperado


def caso_passou(caso: CasoDeTeste, resultado: object) -> bool:
    if not isinstance(resultado, dict):
        return False
    if caso.erro_esperado:
        return (
            resultado.get("ok") is False and resultado.get("erro") == caso.erro_esperado
        )
    return resultado.get("ok") is True and iguais(resultado.get("valor"), caso.esperado)
