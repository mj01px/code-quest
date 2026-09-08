from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Origem(models.TextChoices):
    EXERCICIO = "EXERCICIO", _("Exercício Concluído")
    AJUSTE = "AJUSTE", _("Ajuste de Progressão")

class Nivel(models.Model):
    numero = models.PositiveSmallIntegerField(
        primary_key=True,
        verbose_name=_("número"),
        help_text=_("Identificador estável. O nível 1 precisa existir com 0 de XP."),
    )

    xp_necessario = models.PositiveIntegerField(
        unique=True,
        verbose_name=_("XP acumulado necessário"),
        help_text=_("Total acumulado, não incremento. Nível 1 é sempre 0."),
    )

    titulo = models.CharField(
        max_length=40,
        blank=True,
        default="",
        verbose_name=_("título"),
        help_text=_("Rótulo exibido no perfil, por exemplo Aprendiz ou Arquiteto."),
    )

    class Meta:
        verbose_name = _("nível")
        verbose_name_plural = _("níveis")
        ordering = ["numero"]

    def __str__(self) -> str:
        return f"Nível {self.numero}"

class PerfilProgresso(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="perfil_progresso",
        verbose_name=_("usuário")
    )

    xp_total = models.PositiveIntegerField(
        default=0,
        verbose_name=_("XP Total"),
        help_text=_("Total de XP acumulado pelo usuário.")
    )

    nivel = models.ForeignKey(
        Nivel,
        on_delete=models.PROTECT,
        default=1,
        related_name="perfis",
        verbose_name=_("nível"),
    )

    atualizado_em = models.DateTimeField(
        auto_now=True,
        verbose_name=_("Atualizado em"),
        help_text=_("Data e hora da última atualização do perfil de progresso.")
    )
    class Meta:
        verbose_name = _("Perfil de Progresso")
        verbose_name_plural = _("Perfis de Progresso")
        ordering = ["-xp_total"]
        indexes = [
            models.Index(fields=["-xp_total"], name="perfilprogresso_xp_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.user.nickname} - nível {self.nivel_id}"


class EventoXP(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="eventos_xp",
        verbose_name=_("usuário"),
    )

    exercicio = models.ForeignKey(
        "trilhas.Exercicio",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="eventos_xp",
        verbose_name=_("exercício"),
        help_text=_("Nulo em ajustes manuais e quando o exercício é removido."),
    )

    origem = models.CharField(
        max_length=15,
        choices=Origem.choices,
        default=Origem.EXERCICIO,
        verbose_name=_("origem"),
    )

    xp = models.PositiveIntegerField(
        verbose_name=_("XP concedido"),
        help_text=_("Valor congelado no momento da concessão."),
    )

    criado_em = models.DateTimeField(auto_now_add=True, verbose_name=_("criado em"))

    class Meta:
        verbose_name = _("evento de XP")
        verbose_name_plural = _("eventos de XP")
        ordering = ["-criado_em"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "exercicio"],
                condition=models.Q(origem=Origem.EXERCICIO),
                name="eventoxp_um_por_exercicio_por_usuario",
                violation_error_message=_("Este exercício já concedeu XP a este usuário."),
            ),
        ]
        indexes = [
            models.Index(fields=["user", "-criado_em"], name="eventoxp_user_data_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.user.nickname} +{self.xp} XP"