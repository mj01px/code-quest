from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class PodioMensal(models.Model):
    """Os três primeiros de um mês já fechado.

    O placar do mês corrente sai direto do EventoXP; só o pódio é guardado,
    porque alimenta conquistas e o histórico de campeões.
    """

    mes = models.DateField(
        verbose_name=_("mês"),
        help_text=_("O dia 1 do mês."),
    )

    posicao = models.PositiveSmallIntegerField(verbose_name=_("posição"))

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="podios",
        verbose_name=_("aluno"),
    )

    xp = models.PositiveIntegerField(
        verbose_name=_("XP no mês"),
        help_text=_("Valor congelado no fechamento."),
    )

    criado_em = models.DateTimeField(auto_now_add=True, verbose_name=_("criado em"))

    class Meta:
        verbose_name = _("pódio mensal")
        verbose_name_plural = _("pódios mensais")
        ordering = ["-mes", "posicao"]
        constraints = [
            models.UniqueConstraint(
                fields=["mes", "posicao"],
                name="podio_uma_posicao_por_mes",
                violation_error_message=_("Esta posição já foi ocupada neste mês."),
            ),
            models.UniqueConstraint(
                fields=["mes", "user"],
                name="podio_um_lugar_por_aluno",
                violation_error_message=_("Este aluno já está no pódio deste mês."),
            ),
            models.CheckConstraint(
                condition=models.Q(posicao__gte=1, posicao__lte=3),
                name="podio_posicao_de_1_a_3",
                violation_error_message=_("A posição do pódio vai de 1 a 3."),
            ),
        ]
        indexes = [
            models.Index(fields=["user", "posicao"], name="podio_user_posicao_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.mes:%m/%Y} #{self.posicao} {self.user.nickname}"
