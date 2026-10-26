from django.conf import settings
from django.core.validators import MinValueValidator, RegexValidator
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

icone_validator = RegexValidator(
    regex=r"^[a-z0-9_]+$",
    message=_("O ícone deve ser um identificador em minúsculas, sem espaços."),
    code="icone_invalido",
)


class Criterio(models.TextChoices):
    CRIATURA_ESCOLHIDA = "CRIATURA_ESCOLHIDA", _("Escolheu uma criatura")
    EXERCICIOS_CONCLUIDOS = "EXERCICIOS_CONCLUIDOS", _("Exercícios concluídos")
    TRILHAS_INICIADAS = "TRILHAS_INICIADAS", _("Trilhas iniciadas")
    NIVEL_ALCANCADO = "NIVEL_ALCANCADO", _("Nível alcançado")
    CODIGO_EXECUTADO = "CODIGO_EXECUTADO", _("Executou código")
    APROVADO_DE_PRIMEIRA = "APROVADO_DE_PRIMEIRA", _("Aprovado no primeiro envio")
    APROVADO_APOS_ERRO = "APROVADO_APOS_ERRO", _("Aprovado depois de errar")
    MEMBRO_DE_CLA = "MEMBRO_DE_CLA", _("Entrou em um clã")
    PODIOS_MENSAIS = "PODIOS_MENSAIS", _("Pódios no ranking mensal")
    VITORIAS_MENSAIS = "VITORIAS_MENSAIS", _("Vitórias no ranking mensal")


class Conquista(models.Model):
    slug = models.SlugField(
        primary_key=True,
        max_length=40,
        verbose_name=_("slug"),
    )

    nome = models.CharField(max_length=60, unique=True, verbose_name=_("nome"))

    descricao = models.CharField(max_length=160, verbose_name=_("descrição"))

    icone = models.CharField(
        max_length=40,
        validators=[icone_validator],
        verbose_name=_("ícone"),
        help_text=_("Identificador do ícone desenhado pelo frontend."),
    )

    criterio = models.CharField(
        max_length=30,
        choices=Criterio.choices,
        verbose_name=_("critério"),
    )

    meta = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        verbose_name=_("meta"),
        help_text=_("Valor do critério que desbloqueia a conquista."),
    )

    oculta = models.BooleanField(
        default=False,
        verbose_name=_("oculta"),
        help_text=_("Aparece como ??? até ser desbloqueada."),
    )

    ativa = models.BooleanField(default=True, verbose_name=_("ativa"))

    ordem = models.PositiveSmallIntegerField(default=0, verbose_name=_("ordem"))

    class Meta:
        verbose_name = _("conquista")
        verbose_name_plural = _("conquistas")
        ordering = ["ordem", "slug"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(meta__gte=1),
                name="conquista_meta_positiva",
                violation_error_message=_("A meta precisa ser pelo menos 1."),
            ),
        ]

    def __str__(self) -> str:
        return self.nome


class ConquistaDesbloqueada(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="conquistas",
        verbose_name=_("aluno"),
    )

    conquista = models.ForeignKey(
        Conquista,
        on_delete=models.CASCADE,
        related_name="desbloqueios",
        verbose_name=_("conquista"),
    )

    desbloqueada_em = models.DateTimeField(
        default=timezone.now, verbose_name=_("desbloqueada em")
    )

    vista_em = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("vista em"),
        help_text=_("Nulo enquanto o aviso de desbloqueio não foi exibido."),
    )

    class Meta:
        verbose_name = _("conquista desbloqueada")
        verbose_name_plural = _("conquistas desbloqueadas")
        ordering = ["-desbloqueada_em"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "conquista"],
                name="conquista_uma_vez_por_usuario",
                violation_error_message=_("Esta conquista já foi desbloqueada."),
            ),
        ]
        indexes = [
            models.Index(fields=["conquista"], name="desbloqueio_conquista_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.user_id} - {self.conquista_id}"
