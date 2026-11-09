"""Ordem de estudo da trilha: cada passo só abre depois do anterior.

Em cada aula a ordem é leitura, quiz e exercícios; a aula seguinte só abre
quando a anterior termina. O que já foi feito continua aberto para revisão,
mesmo que tenha sido feito fora de ordem antes desta regra existir.
"""

from collections import defaultdict
from collections.abc import Iterable
from dataclasses import dataclass

from django.conf import settings
from django.db.models import Prefetch
from django.utils.translation import gettext_lazy as _
from rest_framework import status
from rest_framework.exceptions import APIException

from apps.trilhas.models import Aula, Exercicio, StatusEditorial, Trilha

from .models import EtapaConcluida, EventoXP, Origem, TipoDeEtapa

EXERCICIO = "EXERCICIO"


@dataclass(frozen=True)
class Passo:
    tipo: str
    aula_slug: str
    exercicio_slug: str | None
    titulo: str

    @property
    def chave(self) -> str:
        return f"{self.aula_slug}#{self.tipo}#{self.exercicio_slug or ''}"


@dataclass(frozen=True)
class EstadoDoPasso:
    passo: Passo
    estado: str


class EtapaBloqueada(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = _("Conclua a etapa anterior para liberar esta.")
    default_code = "etapa_bloqueada"


def _aulas_das_trilhas(ids: Iterable[int]) -> dict[int, list[Aula]]:
    """Aulas publicadas de várias trilhas em 3 consultas, agrupadas por trilha."""
    exercicios = Prefetch(
        "exercicios",
        queryset=Exercicio.objects.publicados().order_by("ordem", "titulo"),
    )
    aulas = (
        Aula.objects.publicados()
        .filter(trilha_id__in=list(ids))
        .prefetch_related(exercicios, "questoes")
        .order_by("ordem", "titulo")
    )
    por_trilha: dict[int, list[Aula]] = defaultdict(list)
    for aula in aulas:
        por_trilha[aula.trilha_id].append(aula)
    return por_trilha


def passos_da_trilha(trilha: Trilha) -> list[Passo]:
    return _passos(_aulas_das_trilhas([trilha.pk])[trilha.pk])


def _passos(aulas: list[Aula]) -> list[Passo]:
    passos: list[Passo] = []
    for aula in aulas:
        if aula.conteudo.strip():
            passos.append(
                Passo(TipoDeEtapa.LEITURA, aula.slug, None, f"Lição: {aula.titulo}")
            )
        if aula.questoes.all():
            passos.append(
                Passo(TipoDeEtapa.QUIZ, aula.slug, None, f"Quiz: {aula.titulo}")
            )
        for exercicio in aula.exercicios.all():
            passos.append(Passo(EXERCICIO, aula.slug, exercicio.slug, exercicio.titulo))
    return passos


def _feitos(user, ids: list[int]) -> dict[int, set[str]]:
    """Chaves dos passos feitos pelo aluno, por trilha, em 2 consultas."""
    exercicios = EventoXP.objects.filter(
        user=user,
        origem=Origem.EXERCICIO,
        exercicio__trilha_id__in=ids,
        exercicio__isnull=False,
    ).values_list("exercicio__trilha_id", "exercicio__aula__slug", "exercicio__slug")
    etapas = EtapaConcluida.objects.filter(user=user, aula__trilha_id__in=ids).values_list(
        "aula__trilha_id", "aula__slug", "tipo"
    )
    feitos: dict[int, set[str]] = defaultdict(set)
    for trilha_id, aula, slug in exercicios:
        feitos[trilha_id].add(f"{aula}#{EXERCICIO}#{slug}")
    for trilha_id, aula, tipo in etapas:
        feitos[trilha_id].add(f"{aula}#{tipo}#")
    return feitos


def estados_das_trilhas(
    user, trilhas: Iterable[Trilha]
) -> dict[int, list[EstadoDoPasso]]:
    """`estado_da_trilha` de várias trilhas com consultas fixas (sem N+1)."""
    ids = [trilha.pk for trilha in trilhas]
    aulas = _aulas_das_trilhas(ids)
    feitos = _feitos(user, ids)
    return {pk: _estados(_passos(aulas[pk]), feitos[pk]) for pk in ids}


def estado_da_trilha(user, trilha: Trilha) -> list[EstadoDoPasso]:
    return estados_das_trilhas(user, [trilha])[trilha.pk]


def _estados(passos: list[Passo], feitos: set[str]) -> list[EstadoDoPasso]:
    proximo = next(
        (indice for indice, passo in enumerate(passos) if passo.chave not in feitos),
        len(passos),
    )
    return [
        EstadoDoPasso(
            passo,
            "concluido"
            if passo.chave in feitos
            else "liberado"
            if indice == proximo
            else "bloqueado",
        )
        for indice, passo in enumerate(passos)
    ]


def exigir_liberado(
    *,
    user,
    trilha: Trilha,
    tipo: str,
    aula_slug: str,
    exercicio_slug: str | None = None,
) -> None:
    if (
        not settings.PROGRESSAO_SEQUENCIAL
        or trilha.status != StatusEditorial.PUBLICADO
        or trilha.desafio
    ):
        return
    chave = Passo(tipo, aula_slug, exercicio_slug, "").chave
    estados = estado_da_trilha(user, trilha)
    atual = next((e for e in estados if e.passo.chave == chave), None)
    if atual is None or atual.estado != "bloqueado":
        return
    proximo = next((e.passo for e in estados if e.estado == "liberado"), None)
    detalhe = (
        _("Conclua “%(titulo)s” para liberar esta etapa.") % {"titulo": proximo.titulo}
        if proximo
        else EtapaBloqueada.default_detail
    )
    raise EtapaBloqueada(detail=detalhe)
