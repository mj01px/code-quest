import ast
from collections.abc import Mapping, Sequence
from dataclasses import dataclass

CONSTRUCOES = {
    "for": ((ast.For, ast.AsyncFor), "um laço for"),
    "while": ((ast.While,), "um laço while"),
    "if": ((ast.If, ast.IfExp), "um if"),
    "try": ((ast.Try, ast.TryStar), "um try"),
    "compreensao": (
        (ast.ListComp, ast.SetComp, ast.DictComp, ast.GeneratorExp),
        "uma compreensão",
    ),
    "fstring": ((ast.JoinedStr,), "uma f-string"),
    "import": ((ast.Import, ast.ImportFrom), "import"),
    "with": ((ast.With, ast.AsyncWith), "um with"),
    "chamada": ((ast.Call,), "a função"),
}

REGRAS = {"exigir", "proibir"}


@dataclass(frozen=True)
class Barrado:
    code: str
    mensagem: str
    linha: int | None = None


def requisitos_invalidos(requisitos: object) -> list[str]:
    if not isinstance(requisitos, list):
        return ["requisitos precisa ser uma lista"]

    problemas = []
    for i, item in enumerate(requisitos):
        if not isinstance(item, dict):
            problemas.append(f"item {i}: precisa ser um objeto")
            continue
        if item.get("regra") not in REGRAS:
            problemas.append(f"item {i}: regra deve ser exigir ou proibir")
        construcao = item.get("construcao")
        if construcao not in CONSTRUCOES:
            problemas.append(f"item {i}: construção desconhecida {construcao!r}")
        if construcao == "chamada" and not str(item.get("nome", "")).isidentifier():
            problemas.append(f"item {i}: chamada precisa de um nome de função válido")
    return problemas


def _nome_chamado(no: ast.Call) -> str | None:
    if isinstance(no.func, ast.Name):
        return no.func.id
    if isinstance(no.func, ast.Attribute):
        return no.func.attr
    return None


def _ocorrencias(
    arvore: ast.AST, item: Mapping[str, str]
) -> list[ast.stmt | ast.expr]:
    tipos, _ = CONSTRUCOES[item["construcao"]]
    achados: list[ast.stmt | ast.expr] = [
        no for no in ast.walk(arvore) if isinstance(no, tipos)
    ]
    if item["construcao"] == "chamada":
        achados = [
            no
            for no in achados
            if isinstance(no, ast.Call) and _nome_chamado(no) == item["nome"]
        ]
    return achados


def _descrever(item: Mapping[str, str]) -> str:
    _, descricao = CONSTRUCOES[item["construcao"]]
    if item["construcao"] == "chamada":
        return f"{descricao} {item['nome']}"
    return descricao


def verificar(
    *, codigo: str, funcao: str, requisitos: Sequence[Mapping[str, str]]
) -> Barrado | None:
    try:
        arvore = ast.parse(codigo)
    except SyntaxError as erro:
        onde = f" na linha {erro.lineno}" if erro.lineno else ""
        return Barrado(
            code="erro_de_sintaxe",
            mensagem=f"Erro de sintaxe{onde}: {erro.msg}",
            linha=erro.lineno,
        )
    except (ValueError, RecursionError, MemoryError):
        return Barrado(
            code="erro_de_sintaxe", mensagem="Não foi possível ler o código."
        )

    # Só vale definida no topo: o harness procura a função em globals().
    definidas = {no.name for no in arvore.body if isinstance(no, ast.FunctionDef)}
    if funcao not in definidas:
        return Barrado(code="funcao_ausente", mensagem=f"Defina a função {funcao}.")

    for item in requisitos:
        achados = _ocorrencias(arvore, item)

        if item["regra"] == "exigir" and not achados:
            return Barrado(
                code="requisito_exigido",
                mensagem=f"Este exercício pede {_descrever(item)}.",
            )

        if item["regra"] == "proibir" and achados:
            return Barrado(
                code="requisito_proibido",
                mensagem=f"Este exercício não permite {_descrever(item)}.",
                linha=achados[0].lineno,
            )

    return None
