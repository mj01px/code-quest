from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from typing import TypedDict
from uuid import UUID

from django.db import IntegrityError, transaction
from django.db.models import Max, Sum
from django.utils import timezone

from apps.clas.models import MembroDoCla
from apps.conquistas.models import Conquista, ConquistaDesbloqueada
from apps.contas.models import User
from apps.gamificacao.models import UserCreature
from apps.gamificacao.serializers import _url_sprite
from apps.progressao.models import EventoXP, Nivel, ProgressoCriatura
from apps.progressao.services import (
    ler_sequencia,
    progresso_das_trilhas,
)

from .models import PodioMensal

TAMANHO_DO_TOPO = 10
TAMANHO_DO_PODIO = 3


@dataclass(frozen=True)
class Linha:
    posicao: int
    user_id: UUID
    nickname: str
    xp: int


class CriaturaDoRanking(TypedDict):
    nome: str
    sprite: str | None


class Periodo(TypedDict):
    inicio: date
    fim: date
    fecha_em: datetime


class LinhaDoTopo(TypedDict):
    posicao: int
    nickname: str
    xp: int
    criatura: CriaturaDoRanking | None
    voce: bool


class MinhaPosicao(TypedDict):
    nickname: str
    criatura: CriaturaDoRanking | None
    posicao: int | None
    xp: int
    faltam_para_subir: int | None
    podios: int
    vitorias: int


class RankingMensal(TypedDict):
    mes: Periodo
    topo: list[LinhaDoTopo]
    voce: MinhaPosicao


class ConquistaDoPerfil(TypedDict):
    slug: str
    nome: str
    descricao: str
    icone: str
    desbloqueada_em: datetime


class ConquistaBloqueada(TypedDict):
    slug: str
    nome: str
    icone: str
    oculta: bool


class TrilhaDoPerfil(TypedDict):
    slug: str
    nome: str
    percentual: int


class PerfilPublico(TypedDict):
    nickname: str
    criatura: CriaturaDoRanking | None
    nivel: int | None
    titulo_do_nivel: str
    xp_total: int
    xp_no_nivel: int
    xp_para_o_proximo: int | None
    membro_desde: date
    cla: str | None
    sequencia_atual: int
    sequencia_recorde: int
    total_conquistas: int
    conquistas: list[ConquistaDoPerfil]
    conquistas_bloqueadas: list[ConquistaBloqueada]
    trilhas: list[TrilhaDoPerfil]


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


def _criaturas_ativas(user_ids: Iterable[UUID]) -> dict[UUID, CriaturaDoRanking]:
    posses = (
        UserCreature.objects.filter(user_id__in=user_ids, is_active=True)
        .select_related("creature")
        .prefetch_related("creature__stages")
    )
    criaturas: dict[UUID, CriaturaDoRanking] = {}
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


def _contar_podios(user: User) -> tuple[int, int]:
    posicoes = list(
        PodioMensal.objects.filter(user=user).values_list("posicao", flat=True)
    )
    return len(posicoes), posicoes.count(1)


def ranking_mensal(user: User) -> RankingMensal:
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


def perfil_publico(nickname: str) -> PerfilPublico | None:
    """Vitrine de outro aluno: criatura ativa, nível, XP e conquistas obtidas.

    Conta inativa ou anonimizada some como se não existisse (None vira 404).
    Só leitura: não cria ProgressoCriatura para quem ainda não pontuou.
    """
    user = User.objects.filter(
        nickname__iexact=nickname, is_active=True, anonymized_at__isnull=True
    ).first()
    if user is None:
        return None

    posse = UserCreature.objects.filter(user=user, is_active=True).first()
    progresso = (
        ProgressoCriatura.objects.filter(user_creature=posse).first() if posse else None
    )
    nivel = None
    if posse is not None:
        # criatura sem progresso ainda está no nível 1
        nivel = progresso.nivel_id if progresso else 1

    desbloqueios = list(
        ConquistaDesbloqueada.objects.filter(user=user, conquista__ativa=True)
        .select_related("conquista")
        .order_by("-desbloqueada_em")
    )
    obtidas = {d.conquista_id for d in desbloqueios}
    bloqueadas = [
        c for c in Conquista.objects.filter(ativa=True) if c.pk not in obtidas
    ]

    titulo = ""
    xp_no_nivel = 0
    xp_para_o_proximo: int | None = None
    if progresso is not None:
        atual = progresso.nivel
        seguinte = (
            Nivel.objects.filter(numero__gt=atual.numero).order_by("numero").first()
        )
        titulo = atual.titulo
        xp_no_nivel = progresso.xp_total - atual.xp_necessario
        xp_para_o_proximo = (
            seguinte.xp_necessario - atual.xp_necessario if seguinte else None
        )
    elif posse is not None:
        primeiro = Nivel.objects.filter(numero=1).first()
        segundo = Nivel.objects.filter(numero=2).first()
        titulo = primeiro.titulo if primeiro else ""
        xp_para_o_proximo = segundo.xp_necessario if segundo else None

    membro = MembroDoCla.objects.filter(user=user).select_related("cla").first()
    sequencia = ler_sequencia(user=user)

    perfil: PerfilPublico = {
        "nickname": user.nickname,
        "criatura": _criaturas_ativas([user.pk]).get(user.pk),
        "nivel": nivel,
        "titulo_do_nivel": titulo,
        "xp_total": progresso.xp_total if progresso else 0,
        "xp_no_nivel": xp_no_nivel,
        "xp_para_o_proximo": xp_para_o_proximo,
        "membro_desde": timezone.localtime(user.created_at).date(),
        "cla": membro.cla.nome if membro else None,
        "sequencia_atual": sequencia["atual"],
        "sequencia_recorde": sequencia["recorde"],
        "total_conquistas": len(obtidas) + len(bloqueadas),
        "conquistas": [
            {
                "slug": d.conquista.slug,
                "nome": d.conquista.nome,
                "descricao": d.conquista.descricao,
                "icone": d.conquista.icone,
                "desbloqueada_em": d.desbloqueada_em,
            }
            for d in desbloqueios
        ],
        "conquistas_bloqueadas": [
            {
                "slug": c.slug,
                "nome": "???" if c.oculta else c.nome,
                "icone": "" if c.oculta else c.icone,
                "oculta": c.oculta,
            }
            for c in bloqueadas
        ],
        "trilhas": progresso_das_trilhas(user=user),
    }
    return perfil
