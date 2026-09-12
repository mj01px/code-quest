"""Formato dos dados de seed, compartilhado entre o comando e os conteúdos.

Mora num módulo à parte porque o comando importa os conteúdos e os conteúdos
precisam do tipo: sem esta separação, os dois se importariam em círculo. O
nome com underscore mantém o arquivo fora da lista de comandos do Django.
"""

from typing import TypedDict


class ExercicioSeed(TypedDict):
    slug: str
    titulo: str
    ordem: int
    tipo: str
    dificuldade: str
    enunciado: str
    solucao_autor: str


class AulaSeed(TypedDict):
    slug: str
    titulo: str
    ordem: int
    pre_requisito: str | None
    conteudo: str
    exercicios: list[ExercicioSeed]


class TrilhaSeed(TypedDict):
    slug: str
    nome: str
    # Linha de catálogo, para o card da listagem.
    descricao: str
    # Parágrafo do topo da página da trilha. Vazio cai na descrição.
    resumo: str
    # Texto da seção "Sobre a trilha". Vazio cai no resumo.
    sobre: str
    ordem: int
    status: str
