from django.db.models import Exists, OuterRef, Subquery

from apps.clas.models import MembroDoCla
from apps.correcao.models import Modo, Submissao, Veredito
from apps.gamificacao.models import UserCreature
from apps.progressao.models import EventoXP, Origem, TrilhaIniciada
from apps.progressao.services import maior_nivel_do_usuario

from .models import Criterio


def _julgadas(**filtros):
    return Submissao.objects.filter(**filtros).exclude(hash="")


def _envios_aprovados(user):
    return _julgadas(
        user=user,
        modo=Modo.ENVIAR,
        exercicio__isnull=False,
        veredito=Veredito.APROVADO,
    )


def criatura_escolhida(user) -> int:
    return int(UserCreature.objects.filter(user=user).exists())


def exercicios_concluidos(user) -> int:
    return EventoXP.objects.filter(user=user, origem=Origem.EXERCICIO).count()


def trilhas_iniciadas(user) -> int:
    return TrilhaIniciada.objects.filter(user=user).count()


def nivel_alcancado(user) -> int:
    return maior_nivel_do_usuario(user)


def codigo_executado(user) -> int:
    return int(_julgadas(user=user, modo=Modo.EXECUTAR).exists())


def aprovado_de_primeira(user) -> int:
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


def aprovado_apos_erro(user) -> int:
    erro_anterior = _julgadas(
        user=OuterRef("user"),
        exercicio=OuterRef("exercicio"),
        modo=Modo.ENVIAR,
        criado_em__lt=OuterRef("criado_em"),
    ).exclude(veredito=Veredito.APROVADO)
    return int(_envios_aprovados(user).filter(Exists(erro_anterior)).exists())


def membro_de_cla(user) -> int:
    return int(MembroDoCla.objects.filter(user=user).exists())


AVALIADORES = {
    Criterio.CRIATURA_ESCOLHIDA: criatura_escolhida,
    Criterio.EXERCICIOS_CONCLUIDOS: exercicios_concluidos,
    Criterio.TRILHAS_INICIADAS: trilhas_iniciadas,
    Criterio.NIVEL_ALCANCADO: nivel_alcancado,
    Criterio.CODIGO_EXECUTADO: codigo_executado,
    Criterio.APROVADO_DE_PRIMEIRA: aprovado_de_primeira,
    Criterio.APROVADO_APOS_ERRO: aprovado_apos_erro,
    Criterio.MEMBRO_DE_CLA: membro_de_cla,
}
