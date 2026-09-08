"""Construtores de conteúdo para os testes de trilhas."""

from apps.trilhas.models import (
    Aula,
    Dificuldade,
    Exercicio,
    StatusEditorial,
    Tipo,
    Trilha,
)

PUBLICADO = StatusEditorial.PUBLICADO
RASCUNHO = StatusEditorial.RASCUNHO


def criar_trilha(slug: str = "logica", **extra: object) -> Trilha:
    campos: dict[str, object] = {
        "nome": slug.replace("-", " ").title(),
        "descricao": f"Descrição da trilha {slug}.",
        "ordem": 1,
        "status": PUBLICADO,
    }
    campos.update(extra)
    return Trilha.objects.create(slug=slug, **campos)


def criar_aula(trilha: Trilha, slug: str = "aula-1", **extra: object) -> Aula:
    campos: dict[str, object] = {
        "titulo": slug.replace("-", " ").title(),
        "conteudo": f"Conteúdo da aula {slug}.",
        "ordem": 1,
        "status": PUBLICADO,
    }
    campos.update(extra)
    return Aula.objects.create(trilha=trilha, slug=slug, **campos)


def criar_exercicio(aula: Aula, slug: str = "ex-1", **extra: object) -> Exercicio:
    campos: dict[str, object] = {
        "titulo": slug.replace("-", " ").title(),
        "enunciado": f"Enunciado do exercício {slug}.",
        "tipo": Tipo.CODIGO,
        "dificuldade": Dificuldade.INICIANTE,
        "ordem": 1,
        "solucao_autor": "SEGREDO: resposta de referência do autor.",
        "status": PUBLICADO,
    }
    campos.update(extra)
    return Exercicio.objects.create(aula=aula, slug=slug, **campos)
