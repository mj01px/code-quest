import secrets
import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from .validators import (
    DESCRICAO_MAX_LENGTH,
    NOME_MAX_LENGTH,
    validar_nome,
    validar_sem_palavras_proibidas,
)

# fica aqui e não no settings porque tem CHECK no banco
NIVEL_MINIMO_GLOBAL = 5

# sem 0/O e 1/I pra não confundir
TAG_ALFABETO = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
TAG_TAMANHO = 8


def gerar_tag() -> str:
    return "".join(secrets.choice(TAG_ALFABETO) for _ in range(TAG_TAMANHO))


class Bandeira(models.TextChoices):
    # mesmo nome do arquivo em frontend/public/clas/
    GUILDA_1 = "guilda_1", _("Guilda 1")
    GUILDA_2 = "guilda_2", _("Guilda 2")
    GUILDA_3 = "guilda_3", _("Guilda 3")
    GUILDA_4 = "guilda_4", _("Guilda 4")


class TipoDeCla(models.TextChoices):
    PUBLICO = "PUBLICO", _("Público")
    PRIVADO = "PRIVADO", _("Privado")


class Cargo(models.TextChoices):
    LIDER = "LIDER", _("Líder")
    COLIDER = "COLIDER", _("Co-líder")
    MEMBRO = "MEMBRO", _("Membro")


class Cla(models.Model):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid7,
        editable=False,
        verbose_name=_("identificador"),
    )

    tag = models.CharField(
        max_length=TAG_TAMANHO,
        unique=True,
        default=gerar_tag,
        editable=False,
        verbose_name=_("tag"),
        help_text=_("Identificador público e imutável, exibido com # na frente."),
    )

    nome = models.CharField(
        max_length=NOME_MAX_LENGTH,
        validators=[validar_nome],
        verbose_name=_("nome"),
        help_text=_("Pode repetir entre clãs; quem distingue é a tag. Não muda."),
    )

    descricao = models.CharField(
        max_length=DESCRICAO_MAX_LENGTH,
        blank=True,
        default="",
        validators=[validar_sem_palavras_proibidas],
        verbose_name=_("descrição"),
    )

    bandeira = models.CharField(
        max_length=16,
        choices=Bandeira.choices,
        verbose_name=_("bandeira"),
    )

    tipo = models.CharField(
        max_length=10,
        choices=TipoDeCla.choices,
        default=TipoDeCla.PUBLICO,
        verbose_name=_("tipo"),
        help_text=_(
            "Público aparece na busca e aceita entrada direta. Privado só "
            "aceita entrada por link de convite."
        ),
    )

    nivel_minimo = models.PositiveSmallIntegerField(
        default=NIVEL_MINIMO_GLOBAL,
        verbose_name=_("nível mínimo"),
        help_text=_(
            "Nível da criatura mais forte do usuário exigido para entrar. "
            "Nunca abaixo do mínimo global."
        ),
    )

    criado_em = models.DateTimeField(auto_now_add=True, verbose_name=_("criado em"))
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name=_("atualizado em"))

    class Meta:
        verbose_name = _("clã")
        verbose_name_plural = _("clãs")
        ordering = ["-criado_em"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(nivel_minimo__gte=NIVEL_MINIMO_GLOBAL),
                name="cla_nivel_minimo_global",
                violation_error_message=_(
                    "O nível mínimo não pode ficar abaixo do mínimo global."
                ),
            ),
            models.CheckConstraint(
                condition=models.Q(bandeira__in=Bandeira.values),
                name="cla_bandeira_valida",
            ),
            models.CheckConstraint(
                condition=models.Q(tipo__in=TipoDeCla.values),
                name="cla_tipo_valido",
            ),
            models.CheckConstraint(
                condition=models.Q(tag__regex=rf"^[{TAG_ALFABETO}]{{{TAG_TAMANHO}}}$"),
                name="cla_tag_formato",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.nome} #{self.tag}"


class MembroDoCla(models.Model):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid7,
        editable=False,
        verbose_name=_("identificador"),
    )

    cla = models.ForeignKey(
        Cla,
        on_delete=models.CASCADE,
        related_name="membros",
        # já coberto pelo índice composto
        db_index=False,
        verbose_name=_("clã"),
    )

    # OneToOne garante um clã por usuário no banco
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="membro_de_cla",
        verbose_name=_("usuário"),
    )

    cargo = models.CharField(
        max_length=10,
        choices=Cargo.choices,
        default=Cargo.MEMBRO,
        verbose_name=_("cargo"),
    )

    # default em vez de auto_now_add pra dar pra controlar nos testes
    entrou_em = models.DateTimeField(default=timezone.now, verbose_name=_("entrou em"))

    class Meta:
        verbose_name = _("membro do clã")
        verbose_name_plural = _("membros dos clãs")
        ordering = ["entrou_em"]
        constraints = [
            models.UniqueConstraint(
                fields=["cla"],
                condition=models.Q(cargo=Cargo.LIDER),
                name="membrodocla_um_lider_por_cla",
                violation_error_message=_("Este clã já tem um líder."),
            ),
            models.CheckConstraint(
                condition=models.Q(cargo__in=Cargo.values),
                name="membrodocla_cargo_valido",
            ),
        ]
        indexes = [
            models.Index(
                fields=["cla", "cargo", "entrou_em"],
                name="membrodocla_cla_cargo_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.user.nickname} ({self.get_cargo_display()}) em #{self.cla.tag}"


class ConviteDoCla(models.Model):
    # só o hash do token fica salvo, o link aparece uma vez na geração

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid7,
        editable=False,
        verbose_name=_("identificador"),
    )

    cla = models.ForeignKey(
        Cla,
        on_delete=models.CASCADE,
        related_name="convites",
        verbose_name=_("clã"),
    )

    token_hash = models.CharField(
        max_length=64,
        unique=True,
        verbose_name=_("hash do token"),
    )

    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        verbose_name=_("criado por"),
    )

    criado_em = models.DateTimeField(default=timezone.now, verbose_name=_("criado em"))
    expira_em = models.DateTimeField(verbose_name=_("expira em"))
    revogado_em = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("revogado em"),
        help_text=_("Preenchido ao gerar um novo link ou ao revogar este."),
    )

    class Meta:
        verbose_name = _("convite do clã")
        verbose_name_plural = _("convites dos clãs")
        ordering = ["-criado_em"]
        constraints = [
            # expirado também conta, o próximo revoga o anterior antes
            models.UniqueConstraint(
                fields=["cla"],
                condition=models.Q(revogado_em__isnull=True),
                name="convitedocla_um_ativo_por_cla",
                violation_error_message=_("Este clã já tem um convite ativo."),
            ),
            models.CheckConstraint(
                condition=models.Q(expira_em__gt=models.F("criado_em")),
                name="convitedocla_expira_depois_de_criar",
            ),
        ]

    def __str__(self) -> str:
        return f"Convite de #{self.cla.tag}"

    @property
    def esta_ativo(self) -> bool:
        return self.revogado_em is None and self.expira_em > timezone.now()
