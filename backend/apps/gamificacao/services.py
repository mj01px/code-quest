from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from .models import Creature, UserCreature


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
            current_stage=creature.stage_for_level(level=1),
        )
    except IntegrityError:
        raise ValidationError({"creature": _ja_escolhida()}) from None


def apply_level_to_creatures(*, user, level: int) -> list[UserCreature]:
    possuidas = list(
        UserCreature.objects.select_related("creature")
        .prefetch_related("creature__stages")
        .filter(user=user)
    )

    evoluidas = [uc for uc in possuidas if uc.sync_stage(level)]
    if evoluidas:
        agora = timezone.now()
        for uc in evoluidas:
            uc.evolved_at = agora
        UserCreature.objects.bulk_update(evoluidas, ["current_stage", "evolved_at"])
    return evoluidas
