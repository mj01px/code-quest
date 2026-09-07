from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from .catalog import Creature, Stage


class UserCreature(models.Model):

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="creatures",
        verbose_name=_("usuário"),
    )

    creature = models.ForeignKey(
        Creature,
        on_delete=models.PROTECT,
        related_name="owners",
        verbose_name=_("criatura"),
    )

    current_stage = models.PositiveSmallIntegerField(
        choices=Stage.choices,
        default=Stage.HATCHLING,
        verbose_name=_("estágio atual"),
    )

    is_starter = models.BooleanField(
        default=False,
        verbose_name=_("criatura inicial"),
        help_text=_("A escolhida no cadastro. Cada usuário tem no máximo uma."),
    )

    acquired_at = models.DateTimeField(auto_now_add=True, verbose_name=_("adquirida em"))
    evolved_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("evoluiu em"),
        help_text=_("Última vez que o estágio mudou."),
    )

    class Meta:
        verbose_name = _("criatura do usuário")
        verbose_name_plural = _("criaturas dos usuários")
        ordering = ["-is_starter", "acquired_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "creature"],
                name="usercreature_uma_vez_por_usuario",
                violation_error_message=_("Este usuário já tem esta criatura."),
            ),
            models.UniqueConstraint(
                fields=["user"],
                condition=models.Q(is_starter=True),
                name="usercreature_uma_inicial_por_usuario",
                violation_error_message=_(
                    "Este usuário já escolheu a criatura inicial."
                ),
            ),
        ]
        indexes = [
            models.Index(fields=["creature"], name="usercreature_criatura_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.user.nickname} - {self.creature.name}"

    def sync_stage(self, level: int) -> bool:
        novo = self.creature.stage_for_level(level)
        if novo <= self.current_stage:
            return False
        self.current_stage = novo
        return True
