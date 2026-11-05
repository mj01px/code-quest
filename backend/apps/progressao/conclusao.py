from datetime import date
from typing import Any

from django.db.models import Min, Sum
from django.db.models.functions import TruncDate

from apps.conquistas.models import ConquistaDesbloqueada
from apps.correcao.models import Modo, Submissao, Veredito
from apps.trilhas.models import Trilha

from .models import EtapaConcluida, EventoXP, Origem, TipoDeEtapa, TrilhaIniciada
from .sequencia import estado_da_trilha


def _inicio_na_trilha(user, trilha: Trilha):
    marcas = [
        TrilhaIniciada.objects.filter(user=user, trilha=trilha).aggregate(
            m=Min("iniciada_em")
        )["m"],
        EtapaConcluida.objects.filter(user=user, aula__trilha=trilha).aggregate(
            m=Min("concluida_em")
        )["m"],
        EventoXP.objects.filter(
            user=user, origem=Origem.EXERCICIO, exercicio__trilha=trilha
        ).aggregate(m=Min("criado_em"))["m"],
    ]
    datas = [marca for marca in marcas if marca is not None]
    return min(datas) if datas else None


def _dias_de_estudo(user, trilha: Trilha) -> int:
    dias: set[date] = set()
    fontes = (
        (EventoXP.objects.filter(user=user, exercicio__trilha=trilha), "criado_em"),
        (
            EtapaConcluida.objects.filter(user=user, aula__trilha=trilha),
            "concluida_em",
        ),
        (Submissao.objects.filter(user=user, exercicio__trilha=trilha), "criado_em"),
    )
    for queryset, campo in fontes:
        dias.update(
            queryset.annotate(dia=TruncDate(campo))
            .values_list("dia", flat=True)
            .distinct()
            .order_by()
        )
    return len(dias)


def _acerto_de_primeira(user, trilha: Trilha) -> int | None:
    """Quanto o aluno acertou já na primeira tentativa, em porcentagem.

    Exercício de código conta 1 quando o primeiro Enviar passou; o Rodar fica
    de fora porque serve para testar. Quiz conta os acertos da primeira vez, e
    quiz feito antes desse registro usa a nota guardada. Teórico não entra:
    não tem certo ou errado.
    """
    primeiros: dict[int, str] = {}
    for exercicio_id, veredito in (
        Submissao.objects.filter(user=user, exercicio__trilha=trilha, modo=Modo.ENVIAR)
        .order_by("criado_em", "pk")
        .values_list("exercicio_id", "veredito")
    ):
        primeiros.setdefault(exercicio_id, veredito)

    acertos = sum(1 for v in primeiros.values() if v == Veredito.APROVADO)
    total = len(primeiros)

    for (
        na_primeira,
        total_na_primeira,
        melhor,
        total_melhor,
    ) in EtapaConcluida.objects.filter(
        user=user, aula__trilha=trilha, tipo=TipoDeEtapa.QUIZ
    ).values_list("acertos_na_primeira", "total_na_primeira", "acertos", "total"):
        perguntas = total_na_primeira if total_na_primeira is not None else total_melhor
        certas = na_primeira if na_primeira is not None else melhor
        if perguntas:
            total += perguntas
            acertos += certas or 0

    return round(acertos * 100 / total) if total else None


def _proxima_trilha(user, trilha: Trilha) -> Trilha | None:
    candidatas = (
        Trilha.objects.publicados()
        .filter(desafio=False)
        .exclude(pk=trilha.pk)
        .order_by("ordem", "nome")
    )
    for candidata in candidatas:
        estados = estado_da_trilha(user, candidata)
        if estados and any(e.estado != "concluido" for e in estados):
            return candidata
    return None


def resumo_da_conclusao(*, user, trilha: Trilha) -> dict[str, Any]:
    """O que a tela de quest completa mostra ao fim de uma trilha."""
    estados = estado_da_trilha(user, trilha)
    feitas = sum(1 for e in estados if e.estado == "concluido")
    inicio = _inicio_na_trilha(user, trilha)

    conquistas = ConquistaDesbloqueada.objects.filter(
        user=user, conquista__ativa=True
    ).select_related("conquista")
    if inicio is not None:
        conquistas = conquistas.filter(desbloqueada_em__gte=inicio)

    xp = (
        EventoXP.objects.filter(
            user=user, origem=Origem.EXERCICIO, exercicio__trilha=trilha
        ).aggregate(total=Sum("xp"))["total"]
        or 0
    )

    return {
        "trilha": trilha,
        "concluida": bool(estados) and feitas == len(estados),
        "fases_feitas": feitas,
        "fases_total": len(estados),
        "xp": xp,
        "acerto_de_primeira": _acerto_de_primeira(user, trilha),
        "dias_de_estudo": _dias_de_estudo(user, trilha),
        "conquistas": [d.conquista for d in conquistas.order_by("-desbloqueada_em")],
        "proxima": _proxima_trilha(user, trilha),
    }
