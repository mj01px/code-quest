from django.core.validators import RegexValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

BRAND_ACCENT = "#A855F7"

hex_color_validator = RegexValidator(
    regex=r"^#[0-9A-Fa-f]{6}$",
    message=_("Informe uma cor hexadecimal no formato #RRGGBB."),
    code="cor_invalida",
)

sprite_filename_validator = RegexValidator(
    regex=r"^[a-z0-9_]+\.(png|webp)$",
    message=_(
        "O sprite deve ser um nome de arquivo em minúsculas, sem espaços, "
        "terminado em .png ou .webp."
    ),
    code="sprite_invalido",
)


class Domain(models.TextChoices):

    FUNDAMENTALS = "FUNDAMENTOS", _("Fundamentos")
    SCRIPTING = "SCRIPTING", _("Scripting")
    COMPILED = "COMPILADAS", _("Compiladas e OO")
    WEB = "WEB", _("Web")
    DATA = "DADOS", _("Dados")


class Stage(models.IntegerChoices):

    HATCHLING = 1, _("Filhote")
    JUVENILE = 2, _("Jovem")
    ADULT = 3, _("Adulto")


class Creature(models.Model):

    slug = models.SlugField(
        primary_key=True,
        max_length=32,
        verbose_name=_("slug"),
        help_text=_("Identificador estável usado na API. Não renomeie sem migration."),
    )

    name = models.CharField(
        max_length=40,
        unique=True,
        verbose_name=_("nome"),
        help_text=_("Nome próprio da criatura, como aparece na interface."),
    )

    species = models.CharField(
        max_length=40,
        verbose_name=_("espécie"),
        help_text=_("Tartaruga, cobra, dragão, raposa ou elefante."),
    )

    domain = models.CharField(
        max_length=20,
        choices=Domain.choices,
        unique=True,
        verbose_name=_("domínio"),
        help_text=_("Existe exatamente uma criatura por domínio de conhecimento."),
    )

    tagline = models.CharField(
        max_length=120,
        blank=True,
        verbose_name=_("chamada"),
        help_text=_("Frase curta exibida na tela de escolha da criatura."),
    )

    base_color = models.CharField(
        max_length=7, validators=[hex_color_validator], verbose_name=_("cor base")
    )
    outline_color = models.CharField(
        max_length=7, validators=[hex_color_validator], verbose_name=_("cor de contorno")
    )
    accent_color = models.CharField(
        max_length=7, validators=[hex_color_validator], verbose_name=_("cor de acento")
    )

    is_available = models.BooleanField(
        default=False,
        verbose_name=_("disponível para escolha"),
        help_text=_(
            "Desmarcado enquanto a arte não estiver pronta. Não invalida a "
            "posse de quem já escolheu a criatura antes."
        ),
    )

    display_order = models.PositiveSmallIntegerField(
        default=0,
        verbose_name=_("ordem de exibição"),
        help_text=_("Ordem na tela de escolha da criatura."),
    )

    class Meta:
        verbose_name = _("criatura")
        verbose_name_plural = _("criaturas")
        ordering = ["display_order", "slug"]

    def __str__(self) -> str:
        return self.name

    def stage_for_level(self, level: int) -> int:
        alcancados = [s.stage for s in self.stages.all() if s.min_level <= level]
        return max(alcancados) if alcancados else Stage.HATCHLING


class CreatureStage(models.Model):

    creature = models.ForeignKey(
        Creature,
        on_delete=models.CASCADE,
        related_name="stages",
        verbose_name=_("criatura"),
    )

    stage = models.PositiveSmallIntegerField(
        choices=Stage.choices, verbose_name=_("estágio")
    )

    min_level = models.PositiveIntegerField(
        verbose_name=_("nível mínimo"),
        help_text=_(
            "Nível do usuário a partir do qual a criatura assume este estágio."
        ),
    )

    sprite = models.CharField(
        max_length=100,
        validators=[sprite_filename_validator],
        verbose_name=_("sprite"),
        help_text=_("Nome do arquivo, por exemplo shellby_stage_1.png."),
    )

    sprite_dialog = models.CharField(
        max_length=100,
        blank=True,
        validators=[sprite_filename_validator],
        verbose_name=_("sprite de diálogo"),
        help_text=_("Variação usada nas caixas de fala. Opcional."),
    )

    class Meta:
        verbose_name = _("estágio da criatura")
        verbose_name_plural = _("estágios das criaturas")
        ordering = ["creature__display_order", "stage"]
        constraints = [
            models.UniqueConstraint(
                fields=["creature", "stage"],
                name="creaturestage_unico_por_criatura",
                violation_error_message=_("Esta criatura já tem este estágio."),
            ),
            models.UniqueConstraint(
                fields=["creature", "min_level"],
                name="creaturestage_limiar_unico_por_criatura",
                violation_error_message=_(
                    "Esta criatura já tem um estágio com este nível mínimo."
                ),
            ),
        ]

    def __str__(self) -> str:
        return f"{self.creature.name} - {self.get_stage_display()}"
