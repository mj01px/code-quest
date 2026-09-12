from dataclasses import dataclass
from decimal import Decimal

from django.core.exceptions import ImproperlyConfigured, ValidationError
from django.db import IntegrityError, transaction
from django.db.models import F
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.gamificacao.models import UserCreature, XpBonus
from apps.trilhas.models import Dificuldade

from .models import EventoXP, Nivel, Origem, ProgressoCriatura

# O valor do XP vem diretamente do back
# Nenhum endpoint pode aceitar input de xp vinda do usuario.
# A fazer: verificar se é possivel segurar requisição para fazer alteração do xp creditado, tipo com Charles Proxy

XP_POR_DIFICULDADE = {
    Dificuldade.INICIANTE: 50,
    Dificuldade.INTERMEDIARIO: 100,
    Dificuldade.AVANCADO: 200,
}

XP_PADRAO = 50

# Relidos sempre juntos: "nivel" sem "xp_total" mistura dois momentos e faz
# "montar_progresso" devolver xp_no_nivel negativo.
CAMPOS_RELIDOS = ["xp_total", "nivel", "atualizado_em"]


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


def multiplicador_de_bonus(*, creature, trilha) -> Decimal:
    """1.00 quando não há linha de bônus para o par. Ausência não é erro."""
    bonus = XpBonus.objects.filter(creature=creature, trilha=trilha).first()
    return bonus.multiplier if bonus else Decimal("1.00")


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


def exercicios_concluidos(*, user, trilha_slug=None):
    """Conclusões do usuário, das mais recentes para as mais antigas.

    `select_related` porque o payload atravessa exercicio -> trilha: sem ele a
    lista faria duas consultas por linha.

    Os dois filtros não são decoração. `exercicio` é SET_NULL, então evento de
    exercício apagado não tem slug para devolver; e `AJUSTE` é ajuste de
    progressão, não conclusão. Sobra exatamente o que a UniqueConstraint de
    `EventoXP` garante único por usuário: no máximo uma linha por exercício.
    """
    eventos = EventoXP.objects.filter(
        user=user, origem=Origem.EXERCICIO, exercicio__isnull=False
    ).select_related("exercicio__trilha")

    if trilha_slug:
        eventos = eventos.filter(exercicio__trilha__slug=trilha_slug)

    return eventos


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

    # Fica entre a leitura do progresso e a escrita de propósito: os testes de concorrência injetam a gravação alheia neste ponto.
    multiplicador = multiplicador_de_bonus(creature=ativa.creature, trilha=exercicio.trilha)
    xp = int(xp_do_exercicio(exercicio) * multiplicador)

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

    # A soma vai no banco, não em Python: o SQLite ignora o select_for_update
    # acima, então ler, somar e gravar perderia o incremento de um pedido
    # concorrente do mesmo usuário em outro exercício.
    # `atualizado_em` é auto_now e não dispara em update(); por isso vai à mão.
    agora = timezone.now()
    ProgressoCriatura.objects.filter(pk=progresso.pk).update(
        xp_total=F("xp_total") + xp,
        atualizado_em=agora,
    )
    progresso.refresh_from_db(fields=CAMPOS_RELIDOS)

    alcancado = nivel_para_xp(progresso.xp_total)
    subiu = False

    if alcancado.numero > progresso.nivel_id:
        # Mesma razão do xp_total: gravar o nível calculado sobre a leitura de
        # antes rebaixaria a conta se outro pedido já tivesse subido mais. O
        # filtro deixa a comparação no banco, e o rowcount responde a pergunta
        # que o front usa: foi ESTE pedido que subiu?
        # `nivel_id` é o próprio `Nivel.numero` — PK semântica e monotônica —,
        # então `__lt` compara ordem de nível, não chave surrogada.
        subiu = (
            ProgressoCriatura.objects.filter(
                pk=progresso.pk, nivel_id__lt=alcancado.numero
            ).update(nivel=alcancado, atualizado_em=agora)
            == 1
        )

        if subiu:
            progresso.nivel = alcancado
        else:
            # Perdeu a corrida: `nivel` e `xp_total` têm que vir da mesma leitura.
            progresso.refresh_from_db(fields=CAMPOS_RELIDOS)
    else:
        # Mesmo nível: o objeto já está em mãos, e o refresh acima limpou o
        # cache da FK. Sem isto, `montar_progresso` faz um SELECT a cada POST.
        progresso.nivel = alcancado

    evoluiu = False
    if subiu:
        # `ativa` foi lido no começo do pedido, então comparar em memória
        # des-evoluiria a criatura. O filtro faz a comparação no banco; o
        # rowcount diz quem evoluiu de fato.
        estagio = ativa.creature.stage_for_level(progresso.nivel_id)
        evoluiu = (
            UserCreature.objects.filter(
                pk=ativa.pk, current_stage__lt=estagio
            ).update(current_stage=estagio, evolved_at=agora)
            == 1
        )

        if evoluiu:
            ativa.refresh_from_db(fields=["current_stage", "evolved_at"])

    return ResultadoXP(
        progresso=progresso,
        xp_ganho=xp,
        subiu_de_nivel=subiu,
        evoluiu=evoluiu,
        ja_concluido=False,
    )
