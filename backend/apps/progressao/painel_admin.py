"""Métricas do dashboard admin que dependem do período escolhido na tela."""

from collections import defaultdict
from datetime import date, datetime, time, timedelta
from typing import Any

from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone

from apps.correcao.models import Modo, Submissao, Veredito
from apps.trilhas.models import Aula, Exercicio, StatusEditorial, Trilha

from .models import (
    EtapaConcluida,
    EventoXP,
    Origem,
    Sequencia,
    TipoDeEtapa,
    TrilhaIniciada,
)

PERIODOS = {"hoje": 1, "7d": 7, "30d": 30, "90d": 90}
PERIODO_PADRAO = "7d"
MINIMO_DE_PONTOS = 7


def dias_do_periodo(periodo: str) -> int:
    return PERIODOS.get(periodo, PERIODOS[PERIODO_PADRAO])


def _inicio(dias: int) -> tuple[date, datetime]:
    primeiro = timezone.localdate() - timedelta(days=dias - 1)
    return primeiro, timezone.make_aware(datetime.combine(primeiro, time.min))


def _percentual(parte: int, todo: int) -> int:
    return round(parte * 100 / todo) if todo else 0


def _atividade(desde: datetime) -> set[tuple[Any, date]]:
    fontes = (
        (EventoXP.objects.all(), "criado_em"),
        (EtapaConcluida.objects.all(), "concluida_em"),
        (Submissao.objects.all(), "criado_em"),
    )
    pares: set[tuple[Any, date]] = set()
    for queryset, campo in fontes:
        pares.update(
            queryset.filter(**{f"{campo}__gte": desde})
            .annotate(dia=TruncDate(campo))
            .values_list("user_id", "dia")
            .distinct()
            .order_by()
        )
    return pares


def _serie(
    primeiro: date,
    dias: int,
    valores: dict[date, dict[str, int]],
    campos: tuple[str, ...],
) -> list[dict[str, Any]]:
    return [
        {
            "data": dia,
            **{campo: valores.get(dia, {}).get(campo, 0) for campo in campos},
        }
        for dia in (primeiro + timedelta(days=i) for i in range(dias))
    ]


def _submissoes_por_dia(desde: datetime) -> dict[date, dict[str, int]]:
    aprovada = Q(veredito=Veredito.APROVADO)
    linhas = (
        # Só o ENVIAR tem veredito de correção: o EXECUTAR com entradas próprias
        # sai APROVADO por não lançar exceção e inflaria a taxa.
        Submissao.objects.filter(criado_em__gte=desde, modo=Modo.ENVIAR)
        .annotate(dia=TruncDate("criado_em"))
        .values("dia")
        .annotate(
            aprovadas=Count("pk", filter=aprovada),
            rejeitadas=Count("pk", filter=~aprovada),
        )
        .order_by()
    )
    return {
        linha["dia"]: {
            "aprovadas": linha["aprovadas"],
            "rejeitadas": linha["rejeitadas"],
        }
        for linha in linhas
    }


def funil_da_trilha(trilha: Trilha) -> list[dict[str, Any]]:
    """Quantos alunos chegaram a cada passo do primeiro módulo da trilha."""
    # ponytail: ~9 consultas por trilha e os user_id em memória; só o admin
    # abre. Agregar por trilha (Count distinct com filter) se o catálogo crescer.
    iniciaram = (
        set(
            TrilhaIniciada.objects.filter(trilha=trilha).values_list(
                "user_id", flat=True
            )
        )
        | set(
            EtapaConcluida.objects.filter(aula__trilha=trilha).values_list(
                "user_id", flat=True
            )
        )
        | set(
            EventoXP.objects.filter(
                origem=Origem.EXERCICIO, exercicio__trilha=trilha
            ).values_list("user_id", flat=True)
        )
    )
    etapas = [{"chave": "iniciaram", "rotulo": "Iniciaram", "alunos": len(iniciaram)}]

    aula = (
        Aula.objects.publicados()
        .filter(trilha=trilha)
        .order_by("ordem", "titulo")
        .first()
    )
    if aula is None:
        return etapas

    leram = set(
        EtapaConcluida.objects.filter(aula=aula, tipo=TipoDeEtapa.LEITURA).values_list(
            "user_id", flat=True
        )
    )
    quiz = set(
        EtapaConcluida.objects.filter(aula=aula, tipo=TipoDeEtapa.QUIZ).values_list(
            "user_id", flat=True
        )
    )
    exercicios = list(
        Exercicio.objects.publicados()
        .filter(aula=aula)
        .order_by("ordem", "titulo")
        .values_list("pk", flat=True)
    )
    feitos: dict[Any, set[int]] = defaultdict(set)
    for user_id, exercicio_id in EventoXP.objects.filter(
        origem=Origem.EXERCICIO, exercicio_id__in=exercicios
    ).values_list("user_id", "exercicio_id"):
        feitos[user_id].add(exercicio_id)
    primeiro = {
        user for user, ids in feitos.items() if exercicios and exercicios[0] in ids
    }

    exige_leitura = bool(aula.conteudo.strip())
    exige_quiz = aula.questoes.exists()
    completos = {
        user
        for user in iniciaram
        if (not exige_leitura or user in leram)
        and (not exige_quiz or user in quiz)
        and set(exercicios) <= feitos.get(user, set())
    }

    etapas += [
        {"chave": "leram", "rotulo": "Leram a lição", "alunos": len(leram)},
        {"chave": "quiz", "rotulo": "Fizeram o quiz", "alunos": len(quiz)},
        {
            "chave": "primeiro_exercicio",
            "rotulo": "1º exercício",
            "alunos": len(primeiro),
        },
        {"chave": "modulo", "rotulo": "Módulo 01 completo", "alunos": len(completos)},
    ]
    return etapas


def faixas_de_sequencia() -> list[dict[str, Any]]:
    """Alunos por sequência atual; quem perdeu o dia de ontem volta para zero."""
    ontem = timezone.localdate() - timedelta(days=1)
    ativas = Sequencia.objects.filter(ultimo_dia__gte=ontem)
    contagem = ativas.aggregate(
        curta=Count("pk", filter=Q(atual__gte=1, atual__lte=2)),
        media=Count("pk", filter=Q(atual__gte=3, atual__lte=6)),
        longa=Count("pk", filter=Q(atual__gte=7)),
    )
    total = get_user_model().objects.filter(is_active=True).count()
    com_sequencia = contagem["curta"] + contagem["media"] + contagem["longa"]
    return [
        {"faixa": "0 dias", "alunos": max(total - com_sequencia, 0)},
        {"faixa": "1–2 dias", "alunos": contagem["curta"]},
        {"faixa": "3–6 dias", "alunos": contagem["media"]},
        {"faixa": "7+ dias", "alunos": contagem["longa"]},
    ]


def montar_painel(periodo: str) -> dict[str, Any]:
    dias = dias_do_periodo(periodo)
    primeiro, desde = _inicio(dias)
    pontos = max(dias, MINIMO_DE_PONTOS)
    primeiro_da_serie, desde_da_serie = _inicio(pontos)

    usuarios = get_user_model().objects
    total_usuarios = usuarios.count()

    atividade = _atividade(desde_da_serie)
    ativos = {user for user, dia in atividade if dia >= primeiro}
    ativos_por_dia: dict[date, set[Any]] = defaultdict(set)
    for user, dia in atividade:
        ativos_por_dia[dia].add(user)

    submissoes = Submissao.objects.filter(criado_em__gte=desde, modo=Modo.ENVIAR)
    total_submissoes = submissoes.count()
    aprovadas = submissoes.filter(veredito=Veredito.APROVADO).count()

    trilhas = Trilha.objects.filter(
        status=StatusEditorial.PUBLICADO, desafio=False
    ).order_by("nome")

    return {
        "periodo": periodo if periodo in PERIODOS else PERIODO_PADRAO,
        "usuarios": {
            "total": total_usuarios,
            "novos": usuarios.filter(created_at__gte=desde).count(),
        },
        "ativos": {
            "total": len(ativos),
            "percentual": _percentual(len(ativos), total_usuarios),
        },
        "submissoes": {
            "total": total_submissoes,
            "percentual_aprovadas": _percentual(aprovadas, total_submissoes),
        },
        "trilhas": {
            "publicadas": trilhas.count(),
            "em_revisao": Trilha.objects.filter(status=StatusEditorial.REVISAO).count(),
        },
        "ativos_por_dia": _serie(
            primeiro_da_serie,
            pontos,
            {dia: {"alunos": len(users)} for dia, users in ativos_por_dia.items()},
            ("alunos",),
        ),
        "submissoes_por_dia": _serie(
            primeiro_da_serie,
            pontos,
            _submissoes_por_dia(desde_da_serie),
            ("aprovadas", "rejeitadas"),
        ),
        "funis": [
            {
                "slug": trilha.slug,
                "nome": trilha.nome,
                "etapas": funil_da_trilha(trilha),
            }
            for trilha in trilhas
        ],
        "sequencias": faixas_de_sequencia(),
    }
