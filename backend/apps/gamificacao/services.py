from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils.translation import gettext_lazy as _

from .models import Creature, UserCreature, XpBonus


def _nao_possui() -> ValidationError:
    return ValidationError(
        {
            "criatura": ValidationError(
                _("Você não possui esta criatura."), code="criatura_nao_possuida"
            )
        }
    )


def _ja_escolhida() -> ValidationError:
    return ValidationError(
        _("Você já escolheu sua criatura inicial."), code="inicial_ja_escolhida"
    )


def list_selectable_creatures():
    return (
        Creature.objects.filter(is_available=True)
        .prefetch_related("stages")
        .order_by("display_order", "slug")
    )


@transaction.atomic
def select_starter_creature(*, user, creature_slug: str) -> UserCreature:
    try:
        creature = Creature.objects.get(pk=creature_slug)
    except Creature.DoesNotExist:
        raise ValidationError(
            {
                "creature": ValidationError(
                    _("Criatura não encontrada."), code="criatura_inexistente"
                )
            }
        ) from None

    if not creature.is_available:
        raise ValidationError(
            {
                "creature": ValidationError(
                    _("Esta criatura ainda não está disponível para escolha."),
                    code="criatura_indisponivel",
                )
            }
        )

    if UserCreature.objects.filter(user=user, is_starter=True).exists():
        raise ValidationError({"creature": _ja_escolhida()})

    try:
        return UserCreature.objects.create(
            user=user,
            creature=creature,
            is_starter=True,
            is_active=True,
            current_stage=creature.stage_for_level(level=1),
        )
    except IntegrityError:
        raise ValidationError({"creature": _ja_escolhida()}) from None


@transaction.atomic
def adquirir_criatura(*, user, creature_slug: str) -> UserCreature:
    try:
        creature = Creature.objects.get(pk=creature_slug)
    except Creature.DoesNotExist:
        raise ValidationError(
            {
                "criatura": ValidationError(
                    _("Criatura não encontrada."), code="criatura_inexistente"
                )
            }
        ) from None

    if not creature.is_available:
        raise ValidationError(
            {
                "criatura": ValidationError(
                    _("Esta criatura ainda não está disponível para escolha."),
                    code="criatura_indisponivel",
                )
            }
        )

    try:
        return UserCreature.objects.create(
            user=user,
            creature=creature,
            is_starter=False,
            is_active=False,
            current_stage=creature.stage_for_level(level=1),
        )
    except IntegrityError:
        raise ValidationError(
            {
                "criatura": ValidationError(
                    _("Você já possui esta criatura."), code="criatura_ja_possuida"
                )
            }
        ) from None


@transaction.atomic
def definir_criatura_ativa(*, user, creature_slug: str) -> UserCreature:
    escolhida = (
        UserCreature.objects.select_related("creature")
        .prefetch_related("creature__stages")
        .filter(user=user, creature_id=creature_slug)
        .first()
    )
    if escolhida is None:
        raise _nao_possui()

    if escolhida.is_active:
        return escolhida

    UserCreature.objects.filter(user=user, is_active=True).update(is_active=False)
    escolhida.is_active = True
    escolhida.save(update_fields=["is_active"])
    return escolhida


def xp_bonuses_for_user(*, user):
    """Bônus valendo para o usuário, um por par criatura/trilha que ele tem.

    Só entram as criaturas que ele possui. Trilha sem linha aqui rende XP
    neutro, então a ausência é resposta legítima e não erro.
    """
    return (
        XpBonus.objects.select_related("creature", "trilha")
        .filter(creature__owners__user=user)
        .order_by("trilha__ordem", "creature__display_order")
    )
