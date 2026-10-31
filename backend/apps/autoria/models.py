from django.conf import settings
from django.core.validators import MinLengthValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

CARTA_MINIMA = 80


class SolicitacaoAutoria(models.Model):
    """Pedido de um aluno para virar autor, decidido por um administrador."""

    class Status(models.TextChoices):
        PENDENTE = "PENDENTE", _("Pendente")
        APROVADA = "APROVADA", _("Aprovada")
        REJEITADA = "REJEITADA", _("Rejeitada")

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="solicitacoes_autoria",
        verbose_name=_("usuário"),
    )

    areas = models.ManyToManyField(
        "trilhas.Trilha",
        related_name="+",
        verbose_name=_("áreas de interesse"),
    )

    carta_apresentacao = models.TextField(
        validators=[MinLengthValidator(CARTA_MINIMA)],
        verbose_name=_("carta de apresentação"),
    )

    portfolio_link = models.URLField(
        blank=True,
        default="",
        verbose_name=_("portfólio"),
    )

    aceite_diretrizes = models.BooleanField(
        default=False,
        verbose_name=_("aceitou as diretrizes de autoria"),
    )

    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDENTE,
        db_index=True,
        verbose_name=_("status"),
    )

    motivo_rejeicao = models.TextField(
        blank=True,
        default="",
        verbose_name=_("motivo da rejeição"),
    )

    criado_em = models.DateTimeField(auto_now_add=True, verbose_name=_("criado em"))

    class Meta:
        verbose_name = _("solicitação de autoria")
        verbose_name_plural = _("solicitações de autoria")
        ordering = ["-criado_em"]
        constraints = [
            # Garantia no banco: dois POSTs simultâneos não criam dois pendentes.
            models.UniqueConstraint(
                fields=["usuario"],
                condition=models.Q(status="PENDENTE"),
                name="solicitacao_autoria_pendente_unica",
                violation_error_message=_("Você já tem uma solicitação em análise."),
            ),
        ]

    def __str__(self) -> str:
        return f"{self.usuario} ({self.status})"
