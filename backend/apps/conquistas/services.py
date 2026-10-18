from dataclasses import dataclass
from datetime import datetime

from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.utils import timezone

from .criterios import AVALIADORES
from .models import Conquista, ConquistaDesbloqueada

NOME_OCULTO = "???"
DESCRICAO_OCULTA = "Conquista oculta. Continue jogando para descobrir."
ICONE_OCULTO = "oculta"


@dataclass(frozen=True)
class ItemConquista:
    slug: str | None
    nome: str
    descricao: str
    icone: str
    oculta: bool
    desbloqueada: bool
    desbloqueada_em: datetime | None
    vista: bool
    progresso: int | None
    meta: int | None
    raridade: float


def _pode_desbloquear(user) -> bool:
    return user.is_active and not user.is_anonymized


def _valor(user, criterio, cache):
    if criterio not in cache:
        cache[criterio] = AVALIADORES[criterio](user)
    return cache[criterio]


def avaliar(user, criterios=None) -> list[Conquista]:
    if not _pode_desbloquear(user):
        return []

    pendentes = Conquista.objects.filter(ativa=True).exclude(desbloqueios__user=user)
    if criterios is not None:
        pendentes = pendentes.filter(criterio__in=criterios)

    valores = {}
    novas = [c for c in pendentes if _valor(user, c.criterio, valores) >= c.meta]

    ConquistaDesbloqueada.objects.bulk_create(
        [ConquistaDesbloqueada(user=user, conquista=c) for c in novas],
        ignore_conflicts=True,
    )
    return novas


def avaliar_por_id(user_id, criterios=None) -> list[Conquista]:
    user = get_user_model().objects.filter(pk=user_id).first()
    if user is None:
        return []
    return avaliar(user, criterios)


def _alunos_ativos():
    return Q(is_active=True, anonymized_at__isnull=True)


def listar_conquistas(user) -> list[ItemConquista]:
    filtro_ativos = Q(
        desbloqueios__user__is_active=True,
        desbloqueios__user__anonymized_at__isnull=True,
    )
    catalogo = (
        Conquista.objects.filter(ativa=True)
        .annotate(total=Count("desbloqueios", filter=filtro_ativos))
        .order_by("ordem", "slug")
    )
    alunos = get_user_model().objects.filter(_alunos_ativos()).count()
    meus = {d.conquista_id: d for d in ConquistaDesbloqueada.objects.filter(user=user)}

    valores = {}
    itens = []
    for conquista in catalogo:
        desbloqueio = meus.get(conquista.slug)
        raridade = round(100 * conquista.total / alunos, 1) if alunos else 0.0

        if desbloqueio is None and conquista.oculta:
            itens.append(
                ItemConquista(
                    slug=None,
                    nome=NOME_OCULTO,
                    descricao=DESCRICAO_OCULTA,
                    icone=ICONE_OCULTO,
                    oculta=True,
                    desbloqueada=False,
                    desbloqueada_em=None,
                    vista=False,
                    progresso=None,
                    meta=None,
                    raridade=raridade,
                )
            )
            continue

        if desbloqueio is None:
            progresso = min(_valor(user, conquista.criterio, valores), conquista.meta)
        else:
            progresso = conquista.meta

        itens.append(
            ItemConquista(
                slug=conquista.slug,
                nome=conquista.nome,
                descricao=conquista.descricao,
                icone=conquista.icone,
                oculta=conquista.oculta,
                desbloqueada=desbloqueio is not None,
                desbloqueada_em=desbloqueio.desbloqueada_em if desbloqueio else None,
                vista=bool(desbloqueio and desbloqueio.vista_em),
                progresso=progresso,
                meta=conquista.meta,
                raridade=raridade,
            )
        )
    return itens


def marcar_como_vistas(user) -> int:
    return ConquistaDesbloqueada.objects.filter(
        user=user, vista_em__isnull=True
    ).update(vista_em=timezone.now())
