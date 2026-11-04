"""Ordem de estudo da trilha: cada passo só abre depois do anterior.

Em cada aula a ordem é leitura, quiz e exercícios; a aula seguinte só abre
quando a anterior termina. O que já foi feito continua aberto para revisão,
mesmo que tenha sido feito fora de ordem antes desta regra existir.
"""

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


def passos_da_trilha(trilha: Trilha) -> list[Passo]:
    exercicios = Prefetch(
        "exercicios",
        queryset=Exercicio.objects.publicados().order_by("ordem", "titulo"),
    )
    aulas = (
        Aula.objects.publicados()
        .filter(trilha=trilha)
        .prefetch_related(exercicios, "questoes")
        .order_by("ordem", "titulo")
    )
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


def _feitos(user, trilha: Trilha) -> set[str]:
    exercicios = EventoXP.objects.filter(
        user=user,
        origem=Origem.EXERCICIO,
        exercicio__trilha=trilha,
        exercicio__isnull=False,
    ).values_list("exercicio__aula__slug", "exercicio__slug")
    etapas = EtapaConcluida.objects.filter(user=user, aula__trilha=trilha).values_list(
        "aula__slug", "tipo"
    )
    return {f"{aula}#{EXERCICIO}#{slug}" for aula, slug in exercicios} | {
        f"{aula}#{tipo}#" for aula, tipo in etapas
    }


def estado_da_trilha(user, trilha: Trilha) -> list[EstadoDoPasso]:
    passos = passos_da_trilha(trilha)
    feitos = _feitos(user, trilha)
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
    if not settings.PROGRESSAO_SEQUENCIAL or trilha.status != StatusEditorial.PUBLICADO:
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
