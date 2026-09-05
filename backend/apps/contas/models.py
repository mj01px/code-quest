import uuid

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.db.models.functions import Lower
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from .managers import UserManager
from .rbac import permissions_for_role
from .validators import (
    NICKNAME_MAX_LENGTH,
    nickname_format_validator,
    nickname_min_length_validator,
    validate_nickname_not_reserved,
)


class User(AbstractBaseUser, PermissionsMixin):

    class Role(models.TextChoices):

        STUDENT = "ALUNO", _("Aluno")
        AUTHOR = "AUTOR", _("Autor")
        ADMIN = "ADMIN", _("Administrador")

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid7,
        editable=False,
        verbose_name=_("identificador"),
    )

    email = models.EmailField(
        unique=True,
        verbose_name=_("e-mail"),
        help_text=_("Usado para entrar na plataforma."),
        error_messages={"unique": _("Já existe uma conta com este e-mail.")},
    )

    nickname = models.CharField(
        max_length=NICKNAME_MAX_LENGTH,
        verbose_name=_("nickname"),
        help_text=_(
            "Nome público, exibido no ranking e no perfil. "
            "Letras sem acento, números e underscore."
        ),
        validators=[
            nickname_min_length_validator,
            nickname_format_validator,
            validate_nickname_not_reserved,
        ],
    )

    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.STUDENT,
        db_index=True,
        verbose_name=_("papel"),
        help_text=_(
            "O papel de autor é concedido por um administrador, "
            "nunca escolhido no cadastro."
        ),
    )

    is_active = models.BooleanField(
        default=True,
        verbose_name=_("ativo"),
        help_text=_(
            "Desmarque para suspender a conta. Não tem relação com a "
            "confirmação de e-mail."
        ),
    )

    is_staff = models.BooleanField(
        default=False,
        verbose_name=_("acesso ao admin do Django"),
        help_text=_(
            "Restrito à equipe de desenvolvimento. Não confundir com o papel "
            "de administrador do produto, que é o campo acima."
        ),
    )

    deletion_requested_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("exclusão solicitada em"),
        help_text=_(
            "Preenchido quando o titular pede a exclusão. A anonimização "
            "acontece depois do prazo de arrependimento."
        ),
    )

    anonymized_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("anonimizado em"),
        help_text=_("Preenchido pela tarefa que executa a exclusão de fato."),
    )

    created_at = models.DateTimeField(
        default=timezone.now,
        editable=False,
        verbose_name=_("criado em"),
    )
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("atualizado em"))

    objects = UserManager()

    USERNAME_FIELD = "email"
    EMAIL_FIELD = "email"
    REQUIRED_FIELDS = ["nickname"]

    class Meta:
        verbose_name = _("usuário")
        verbose_name_plural = _("usuários")
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                Lower("nickname"),
                name="user_nickname_unico_sem_caixa",
                violation_error_message=_("Este nickname já está em uso."),
            ),
        ]
        indexes = [
            models.Index(fields=["-created_at"], name="user_criado_em_idx"),
        ]

    def __str__(self) -> str:
        return self.nickname

    def save(self, *args, **kwargs):
        if self.email:
            self.email = self.__class__.objects.normalize_email(self.email).lower()
        return super().save(*args, **kwargs)

    @property
    def is_author(self) -> bool:
        return self.role in {self.Role.AUTHOR, self.Role.ADMIN}

    @property
    def is_platform_admin(self) -> bool:
        return self.role == self.Role.ADMIN

    def has_perm(self, perm, obj=None) -> bool:
        if not self.is_active:
            return False
        if self.role == self.Role.ADMIN:
            return True
        if not isinstance(perm, str):
            return super().has_perm(perm, obj)
        return perm in self.get_role_permissions()

    def get_role_permissions(self) -> frozenset[str]:
        cache = getattr(self, "_perm_cache", None)
        if cache is None or cache[0] != self.role:
            cache = (self.role, permissions_for_role(self.role))
            self._perm_cache = cache
        return cache[1]

    @property
    def is_anonymized(self) -> bool:
        return self.anonymized_at is not None

    def request_deletion(self) -> None:
        if self.deletion_requested_at is None:
            self.deletion_requested_at = timezone.now()
        self.is_active = False
        self.save(update_fields=["deletion_requested_at", "is_active", "updated_at"])
