from collections.abc import Callable

from django.db.models import Exists, OuterRef, QuerySet, Subquery

from apps.clas.models import MembroDoCla
from apps.contas.models import User
from apps.correcao.models import Modo, Submissao, Veredito
from apps.gamificacao.models import UserCreature
from apps.progressao.models import EventoXP, Origem, TrilhaIniciada
from apps.progressao.services import maior_nivel_do_usuario
from apps.ranking.models import PodioMensal

from .models import Criterio


def _julgadas(**filtros: object) -> QuerySet[Submissao]:
    return Submissao.objects.filter(**filtros).exclude(hash="")


def _envios_aprovados(user: User) -> QuerySet[Submissao]:
    return _julgadas(
        user=user,
        modo=Modo.ENVIAR,
        exercicio__isnull=False,
        veredito=Veredito.APROVADO,
    )


def criatura_escolhida(user: User) -> int:
    return int(UserCreature.objects.filter(user=user).exists())


def exercicios_concluidos(user: User) -> int:
    return EventoXP.objects.filter(user=user, origem=Origem.EXERCICIO).count()


def trilhas_iniciadas(user: User) -> int:
    return TrilhaIniciada.objects.filter(user=user).count()


def nivel_alcancado(user: User) -> int:
    return maior_nivel_do_usuario(user)


def codigo_executado(user: User) -> int:
    return int(_julgadas(user=user, modo=Modo.EXECUTAR).exists())


def aprovado_de_primeira(user: User) -> int:
    primeiro_veredito = (
        _julgadas(
            user=OuterRef("user"),
            exercicio=OuterRef("exercicio"),
            modo=Modo.ENVIAR,
        )
        .order_by("criado_em", "id")
        .values("veredito")[:1]
    )
    return int(
        _envios_aprovados(user)
        .annotate(primeiro=Subquery(primeiro_veredito))
        .filter(primeiro=Veredito.APROVADO)
        .exists()
    )


def aprovado_apos_erro(user: User) -> int:
    erro_anterior = _julgadas(
        user=OuterRef("user"),
        exercicio=OuterRef("exercicio"),
        modo=Modo.ENVIAR,
        criado_em__lt=OuterRef("criado_em"),
    ).exclude(veredito=Veredito.APROVADO)
    return int(_envios_aprovados(user).filter(Exists(erro_anterior)).exists())


def membro_de_cla(user: User) -> int:
    return int(MembroDoCla.objects.filter(user=user).exists())


def podios_mensais(user: User) -> int:
    return PodioMensal.objects.filter(user=user).count()


def vitorias_mensais(user: User) -> int:
    return PodioMensal.objects.filter(user=user, posicao=1).count()


AVALIADORES: dict[str, Callable[[User], int]] = {
    Criterio.CRIATURA_ESCOLHIDA: criatura_escolhida,
    Criterio.EXERCICIOS_CONCLUIDOS: exercicios_concluidos,
    Criterio.TRILHAS_INICIADAS: trilhas_iniciadas,
    Criterio.NIVEL_ALCANCADO: nivel_alcancado,
    Criterio.CODIGO_EXECUTADO: codigo_executado,
    Criterio.APROVADO_DE_PRIMEIRA: aprovado_de_primeira,
    Criterio.APROVADO_APOS_ERRO: aprovado_apos_erro,
    Criterio.MEMBRO_DE_CLA: membro_de_cla,
    Criterio.PODIOS_MENSAIS: podios_mensais,
    Criterio.VITORIAS_MENSAIS: vitorias_mensais,
}
