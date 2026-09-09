from dataclasses import dataclass

from django.core.exceptions import ImproperlyConfigured, ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.gamificacao.models import UserCreature
from apps.trilhas.models import Dificuldade

from .models import EventoXP, Nivel, Origem, ProgressoCriatura

# O valor do XP vem diretamente do back
# Nenhum endpoint pode aceitar input de xp vinda do usuario.
# todo: verificar se é possivel segurar requisição para fazer alteração do xp creditado, tipo com Charles Proxy

XP_POR_DIFICULDADE = {
    Dificuldade.INICIANTE: 50,
    Dificuldade.INTERMEDIARIO: 100,
    Dificuldade.AVANCADO: 200,
}

XP_PADRAO = 50


@dataclass(frozen=True)
class ResultadoXP:
    progresso: ProgressoCriatura
    xp_ganho: int
    subiu_de_nivel: bool
    evoluiu: bool
    ja_concluido: bool


def _nao_publicado():
    return ValidationError(
        _("Este exercício não está publicado."), code="exercicio_nao_publicado"
    )


def _conta_inativa():
    return ValidationError(_("Esta conta não pode receber XP."), code="conta_inativa")


def _sem_criatura_ativa():
    return ValidationError(
        _("Escolha uma criatura antes de resolver exercícios."),
        code="sem_criatura_ativa",
    )


def xp_do_exercicio(exercicio):
    return XP_POR_DIFICULDADE.get(exercicio.dificuldade, XP_PADRAO)


def nivel_para_xp(xp_total):
    """Maior nível já alcançado. Trava no topo da tabela."""
    nivel = (
        Nivel.objects.filter(xp_necessario__lte=xp_total).order_by("-numero").first()
    )

    if nivel is None:
        raise ImproperlyConfigured(
            "Nenhum nível com xp_necessario igual a 0. A migration de seed dos "
            "níveis não rodou, ou o nível 1 foi removido."
        )

    return nivel


def proximo_nivel(progresso):
    """None quando já está no topo da tabela."""
    return Nivel.objects.filter(numero__gt=progresso.nivel_id).order_by("numero").first()


def criatura_ativa(user):
    return UserCreature.objects.filter(user=user, is_active=True).first()


def obter_progresso(user_creature):
    progresso, _criado = ProgressoCriatura.objects.get_or_create(
        user_creature=user_creature
    )
    return progresso


def montar_progresso(progresso):
    """Valores relativos, que é o que a barra de XP do front precisa."""
    proximo = proximo_nivel(progresso)
    progresso.proximo_nivel = proximo
    progresso.xp_no_nivel = progresso.xp_total - progresso.nivel.xp_necessario
    progresso.xp_para_o_proximo = (
        proximo.xp_necessario - progresso.nivel.xp_necessario if proximo else None
    )
    return progresso


@transaction.atomic
def creditar_exercicio(*, user, exercicio):
    if not user.is_active or user.is_anonymized:
        raise ValidationError({"usuario": _conta_inativa()})

    if not exercicio.publicado:
        raise ValidationError({"exercicio": _nao_publicado()})

    ativa = criatura_ativa(user)
    if ativa is None:
        raise ValidationError({"criatura": _sem_criatura_ativa()})

    obter_progresso(ativa)
    progresso = ProgressoCriatura.objects.select_for_update().get(user_creature=ativa)

    xp = xp_do_exercicio(exercicio)

    try:
        with transaction.atomic():
            EventoXP.objects.create(
                user=user,
                user_creature=ativa,
                exercicio=exercicio,
                origem=Origem.EXERCICIO,
                xp=xp,
            )
    except IntegrityError:
        return ResultadoXP(
            progresso=progresso,
            xp_ganho=0,
            subiu_de_nivel=False,
            evoluiu=False,
            ja_concluido=True,
        )

    progresso.xp_total += xp
    alcancado = nivel_para_xp(progresso.xp_total)
    subiu = alcancado.numero > progresso.nivel_id

    if subiu:
        progresso.nivel = alcancado

    progresso.save(update_fields=["xp_total", "nivel", "atualizado_em"])

    evoluiu = False
    if subiu and ativa.sync_stage(progresso.nivel_id):
        ativa.evolved_at = timezone.now()
        ativa.save(update_fields=["current_stage", "evolved_at"])
        evoluiu = True

    return ResultadoXP(
        progresso=progresso,
        xp_ganho=xp,
        subiu_de_nivel=subiu,
        evoluiu=evoluiu,
        ja_concluido=False,
    )