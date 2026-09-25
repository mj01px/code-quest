import json
import math

MARCADOR = "@@RESULTADO@@"

# Codigo vai ser inserido junto com a requisiçao do usuario para conseguir testar a funcao, ainda vou realizar algumas
# validações e tambem vou adicionar uma outra forma de correcao como o AST
VERSAO = "1"

_MODELO = """

import json as _cq_json
import sys as _cq_sys

_cq_funcao = globals().get("{funcao}")
_cq_casos = _cq_json.loads(_cq_sys.stdin.read())
_cq_saida = []
for _cq_args in _cq_casos:
    if not callable(_cq_funcao):
        _cq_saida.append({{"ok": False, "erro": "FuncaoAusente", "mensagem": ""}})
        continue
    try:
        _cq_valor = _cq_funcao(*_cq_args)
        _cq_json.dumps(_cq_valor)
        _cq_saida.append({{"ok": True, "valor": _cq_valor}})
    except Exception as _cq_e:
        _cq_saida.append(
            {{"ok": False, "erro": type(_cq_e).__name__, "mensagem": str(_cq_e)[:300]}}
        )
print("{marcador}" + _cq_json.dumps(_cq_saida, ensure_ascii=False))
"""


def montar_programa(*, codigo, funcao):
    if not funcao.isidentifier():
        raise ValueError(f"nome de função inválido: {funcao!r}")
    return codigo.rstrip() + "\n" + _MODELO.format(funcao=funcao, marcador=MARCADOR)


def montar_entrada(casos):
    return json.dumps([caso.argumentos for caso in casos], ensure_ascii=False)


def separar_saida(stdout):
    linhas = stdout.splitlines()
    for i in range(len(linhas) - 1, -1, -1):
        if linhas[i].startswith(MARCADOR):
            try:
                resultados = json.loads(linhas[i][len(MARCADOR) :])
            except ValueError:
                return stdout, None
            if not isinstance(resultados, list):
                return stdout, None
            impresso = "\n".join(linhas[:i] + linhas[i + 1 :])
            return impresso, resultados
    return stdout, None


def iguais(obtido, esperado):
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


def caso_passou(caso, resultado):
    if not isinstance(resultado, dict):
        return False
    if caso.erro_esperado:
        return (
            resultado.get("ok") is False
            and resultado.get("erro") == caso.erro_esperado
        )
    return resultado.get("ok") is True and iguais(resultado.get("valor"), caso.esperado)
