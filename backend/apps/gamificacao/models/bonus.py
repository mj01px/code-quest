from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from .catalog import Creature

MULTIPLICADOR_NEUTRO = Decimal("1.00")
MULTIPLICADOR_MAXIMO = Decimal("5.00")


class XpBonus(models.Model):
    """Quanto o XP de uma trilha rende para quem tem determinada criatura.

    A afinidade nasce do domínio da criatura: quem escolheu a cobra, de domínio
    SCRIPTING, ganha o dobro na trilha de Python. O par é explícito em vez de
    derivado do domínio porque nem todo domínio tem trilha, e nem toda trilha
    nasce com criatura: a tabela permite ligar os dois conforme o catálogo
    cresce, sem migration de schema a cada par novo.

    Ausência de linha significa multiplicador neutro. Nada aqui credita XP: o
    crédito é da submissão, que ainda não existe.
    """

    creature = models.ForeignKey(
        Creature,
        on_delete=models.CASCADE,
        related_name="xp_bonuses",
        verbose_name=_("criatura"),
    )

    trilha = models.ForeignKey(
        "trilhas.Trilha",
        on_delete=models.CASCADE,
        related_name="xp_bonuses",
        verbose_name=_("trilha"),
    )

    multiplier = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=MULTIPLICADOR_NEUTRO,
        validators=[
            MinValueValidator(MULTIPLICADOR_NEUTRO),
            MaxValueValidator(MULTIPLICADOR_MAXIMO),
        ],
        verbose_name=_("multiplicador"),
        help_text=_(
            "De 1.00 a 5.00. O valor 2.00 dobra o XP da trilha para quem tem "
            "esta criatura."
        ),
    )

    class Meta:
        verbose_name = _("bônus de XP")
        verbose_name_plural = _("bônus de XP")
        ordering = ["trilha__ordem", "creature__display_order"]
        constraints = [
            models.UniqueConstraint(
                fields=["creature", "trilha"],
                name="xpbonus_um_por_criatura_e_trilha",
                violation_error_message=_(
                    "Esta criatura já tem um bônus nesta trilha."
                ),
            ),
            models.CheckConstraint(
                condition=models.Q(multiplier__gte=MULTIPLICADOR_NEUTRO)
                & models.Q(multiplier__lte=MULTIPLICADOR_MAXIMO),
                name="xpbonus_multiplicador_na_faixa",
                violation_error_message=_(
                    "O multiplicador precisa ficar entre 1.00 e 5.00."
                ),
            ),
        ]
        indexes = [
            models.Index(fields=["trilha"], name="xpbonus_trilha_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.creature.name} - {self.trilha.nome} ({self.multiplier}x)"
