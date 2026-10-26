from dataclasses import dataclass
from datetime import date, datetime, time, timedelta

from django.db import IntegrityError, transaction
from django.db.models import Max, Sum
from django.utils import timezone

from apps.gamificacao.models import UserCreature
from apps.gamificacao.serializers import _url_sprite
from apps.progressao.models import EventoXP

from .models import PodioMensal

TAMANHO_DO_TOPO = 10
TAMANHO_DO_PODIO = 3


@dataclass(frozen=True)
class Linha:
    posicao: int
    user_id: int
    nickname: str
    xp: int


def primeiro_dia(dia: date) -> date:
    return dia.replace(day=1)


def mes_seguinte(mes: date) -> date:
    # dia 28 + 4 dias sempre cai no mês seguinte, qualquer que seja o mês
    return primeiro_dia(mes.replace(day=28) + timedelta(days=4))


def mes_anterior(mes: date) -> date:
    return primeiro_dia(mes - timedelta(days=1))


def mes_atual() -> date:
    return primeiro_dia(timezone.localdate())


def limites(mes: date) -> tuple[datetime, datetime]:
    """Dia 1 00:00 até o dia 1 do mês seguinte, no fuso do projeto (São Paulo)."""
    fuso = timezone.get_current_timezone()
    inicio = datetime.combine(mes, time.min, tzinfo=fuso)
    fim = datetime.combine(mes_seguinte(mes), time.min, tzinfo=fuso)
    return inicio, fim


def placar(mes: date) -> list[Linha]:
    """XP somado no mês, do maior para o menor.

    Empate: fica na frente quem chegou primeiro àquele XP, ou seja, quem fez
    o último ganho mais cedo. O id só desempata o que cair no mesmo instante.
    """
    inicio, fim = limites(mes)
    linhas = (
        EventoXP.objects.filter(
            criado_em__gte=inicio,
            criado_em__lt=fim,
            user__is_active=True,
            user__anonymized_at__isnull=True,
        )
        .values("user_id", "user__nickname")
        .annotate(total=Sum("xp"), ultimo=Max("criado_em"))
        .filter(total__gt=0)
        .order_by("-total", "ultimo", "user_id")
    )
    return [
        Linha(
            posicao=posicao,
            user_id=linha["user_id"],
            nickname=linha["user__nickname"],
            xp=linha["total"],
        )
        for posicao, linha in enumerate(linhas, start=1)
    ]


@transaction.atomic
def _gravar_podio(mes: date, linhas: list[Linha]) -> list[PodioMensal]:
    # create, não bulk_create: o post_save é o gatilho das conquistas de pódio
    return [
        PodioMensal.objects.create(
            mes=mes, posicao=linha.posicao, user_id=linha.user_id, xp=linha.xp
        )
        for linha in linhas
    ]


def fechar_mes(mes: date) -> list[PodioMensal]:
    """Grava o pódio de um mês encerrado. Idempotente.

    Roda sob demanda, na primeira leitura do ranking depois da virada, então
    não precisa de tarefa agendada. Mês sem ninguém pontuando não gera
    linha e é só recalculado (vazio) na próxima leitura.
    """
    if mes >= mes_atual():
        return []
    if PodioMensal.objects.filter(mes=mes).exists():
        return []

    linhas = placar(mes)[:TAMANHO_DO_PODIO]
    if not linhas:
        return []
    try:
        return _gravar_podio(mes, linhas)
    except IntegrityError:
        # outra requisição fechou o mesmo mês primeiro
        return []


def _criaturas_ativas(user_ids) -> dict[int, dict]:
    posses = (
        UserCreature.objects.filter(user_id__in=user_ids, is_active=True)
        .select_related("creature")
        .prefetch_related("creature__stages")
    )
    criaturas = {}
    for posse in posses:
        estagio = next(
            (e for e in posse.creature.stages.all() if e.stage == posse.current_stage),
            None,
        )
        criaturas[posse.user_id] = {
            "nome": posse.creature.name,
            "sprite": _url_sprite(estagio.sprite) if estagio else None,
        }
    return criaturas


def _contar_podios(user) -> tuple[int, int]:
    posicoes = list(
        PodioMensal.objects.filter(user=user).values_list("posicao", flat=True)
    )
    return len(posicoes), posicoes.count(1)


def ranking_mensal(user) -> dict:
    mes = mes_atual()
    fechar_mes(mes_anterior(mes))

    linhas = placar(mes)
    topo = linhas[:TAMANHO_DO_TOPO]
    criaturas = _criaturas_ativas([linha.user_id for linha in topo] + [user.pk])
    minha = next((linha for linha in linhas if linha.user_id == user.pk), None)
    podios, vitorias = _contar_podios(user)

    faltam = None
    if minha is not None and minha.posicao > 1:
        # +1 porque no empate quem chegou antes continua na frente
        faltam = linhas[minha.posicao - 2].xp - minha.xp + 1

    _inicio, fim = limites(mes)
    return {
        "mes": {
            "inicio": mes,
            "fim": mes_seguinte(mes) - timedelta(days=1),
            "fecha_em": fim,
        },
        "topo": [
            {
                "posicao": linha.posicao,
                "nickname": linha.nickname,
                "xp": linha.xp,
                "criatura": criaturas.get(linha.user_id),
                "voce": linha.user_id == user.pk,
            }
            for linha in topo
        ],
        "voce": {
            "nickname": user.nickname,
            "criatura": criaturas.get(user.pk),
            "posicao": minha.posicao if minha else None,
            "xp": minha.xp if minha else 0,
            "faltam_para_subir": faltam,
            "podios": podios,
            "vitorias": vitorias,
        },
    }

