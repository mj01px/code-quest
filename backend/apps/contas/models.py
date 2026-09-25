import uuid
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.db.models.functions import Lower
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from .documentos import VERSAO_MAX_LENGTH, VIGENTES, Documento
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

    email_pendente = models.EmailField(
        blank=True,
        default="",
        verbose_name=_("e-mail pendente"),
        help_text=_(
            "Endereço pedido na troca de e-mail, ainda não confirmado pelo "
            "endereço atual. Login e 2FA seguem no e-mail atual até lá."
        ),
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

    birth_date = models.DateField(
        null=True,
        blank=True,
        verbose_name=_("data de nascimento"),
        help_text=_("Usada para confirmar a idade mínima no cadastro."),
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

    nivel_de_acesso = models.ForeignKey(
        "contas.NivelDeAcesso",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="usuarios",
        verbose_name=_("nível de acesso"),
        help_text=_(
            "Define as permissões granulares. Um ADMIN ignora este campo e "
            "pode tudo; sem nível, cai nas permissões padrão do papel."
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

    email_verified_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("e-mail verificado em"),
        help_text=_(
            "Preenchido quando o titular clica no link enviado no cadastro. "
            "Enquanto for nulo, o login fica bloqueado."
        ),
    )

    failed_logins = models.PositiveSmallIntegerField(
        default=0,
        verbose_name=_("tentativas de login falhas"),
        help_text=_("Zerado a cada login bem-sucedido."),
    )

    locked_until = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("bloqueado até"),
        help_text=_(
            "Preenchido quando as tentativas falhas passam do limite. "
            "Não confundir com is_active, que é suspensão manual."
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
            models.UniqueConstraint(
                Lower("email"),
                name="user_email_unico_sem_caixa",
                violation_error_message=_("Já existe uma conta com este e-mail."),
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
    def is_platform_admin(self) -> bool:
        # O acesso ao painel vem do NÍVEL, não do papel: um nível o concede
        # (o "Admin" concede). Conta inativa nunca é admin.
        return bool(
            self.is_active
            and self.nivel_de_acesso_id is not None
            and self.nivel_de_acesso.acesso_admin
        )

    def has_perm(self, perm, obj=None) -> bool:
        # Sem curto-circuito por papel: quem manda é o nível de acesso. Assim,
        # rebaixar o nível de um admin realmente o rebaixa.
        if not self.is_active:
            return False
        if not isinstance(perm, str):
            return super().has_perm(perm, obj)
        return perm in self.get_role_permissions()

    def get_role_permissions(self) -> frozenset[str]:
        # As permissões vêm do nível de acesso; sem nível, caímos nas permissões
        # padrão do papel (útil para contas ainda não migradas). O cache depende
        # de papel + nível: muda se qualquer um trocar no objeto.
        chave = (self.role, self.nivel_de_acesso_id)
        cache = getattr(self, "_perm_cache", None)
        if cache is None or cache[0] != chave:
            if self.nivel_de_acesso_id is not None:
                perms = frozenset(
                    self.nivel_de_acesso.permissoes.values_list("codename", flat=True)
                )
            else:
                perms = permissions_for_role(self.role)
            cache = (chave, perms)
            self._perm_cache = cache
        return cache[1]

    def invalidar_cache_permissoes(self) -> None:
        """Descarta o cache após trocar o nível de acesso na mesma instância."""
        if hasattr(self, "_perm_cache"):
            del self._perm_cache

    @property
    def email_verificado(self) -> bool:
        return self.email_verified_at is not None

    def marcar_email_verificado(self) -> bool:
        """Marca o e-mail como verificado de forma atômica e devolve se ESTA
        chamada foi a que marcou. Sob duas requisições simultâneas (ex.: o
        StrictMode dispara a verificação em dobro), só uma ganha o UPDATE — o
        que evita auditar a verificação duas vezes."""
        agora = timezone.now()
        marcou = (
            type(self)
            .objects.filter(pk=self.pk, email_verified_at__isnull=True)
            .update(email_verified_at=agora, updated_at=agora)
        )
        if marcou:
            self.email_verified_at = agora
            return True
        return False

    @property
    def esta_bloqueado(self) -> bool:
        return self.locked_until is not None and self.locked_until > timezone.now()

    def registrar_falha_de_login(self) -> None:
        self.failed_logins += 1
        campos = ["failed_logins", "updated_at"]

        if self.failed_logins >= settings.LOGIN_MAX_TENTATIVAS:
            self.locked_until = timezone.now() + timedelta(
                seconds=settings.LOGIN_BLOQUEIO_SEGUNDOS
            )
            self.failed_logins = 0
            campos.append("locked_until")

        self.save(update_fields=campos)

    def registrar_login_valido(self) -> None:
        if self.failed_logins or self.locked_until:
            self.failed_logins = 0
            self.locked_until = None
            self.save(update_fields=["failed_logins", "locked_until", "updated_at"])

    @property
    def is_anonymized(self) -> bool:
        return self.anonymized_at is not None

    def anonimizar(self) -> bool:
        """Embaralha a PII da conta, mantendo a linha para os agregados.

        Só mexe nos campos do próprio usuário; a PII espalhada (snapshot de
        auditoria, IP dos aceites) é tratada pelo serviço que orquestra a
        exclusão. Idempotente: já anonimizado, não faz nada.
        """
        if self.is_anonymized:
            return False

        marca = uuid.uuid4().hex[:12]
        self.email = f"anon-{marca}@anonimizado.invalid"
        self.email_pendente = ""
        self.nickname = f"anon_{marca}"
        self.set_unusable_password()
        self.failed_logins = 0
        self.locked_until = None
        self.is_active = False
        self.anonymized_at = timezone.now()
        if self.deletion_requested_at is None:
            self.deletion_requested_at = timezone.now()
        self.save(
            update_fields=[
                "email",
                "email_pendente",
                "nickname",
                "password",
                "failed_logins",
                "locked_until",
                "is_active",
                "anonymized_at",
                "deletion_requested_at",
                "updated_at",
            ]
        )
        return True


class Permissao(models.Model):
    """Catálogo de permissões granulares que um nível de acesso pode conceder.

    Semeado a partir de `rbac.CATALOG` numa migração de dados: o código continua
    sendo a fonte da verdade de quais permissões existem; esta tabela só as
    materializa para que a UI as liste e os níveis as referenciem.
    """

    codename = models.CharField(
        max_length=64, unique=True, verbose_name=_("código")
    )
    rotulo = models.CharField(max_length=160, verbose_name=_("rótulo"))
    modulo = models.CharField(max_length=32, db_index=True, verbose_name=_("módulo"))
    ordem = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["modulo", "ordem", "codename"]
        verbose_name = _("permissão")
        verbose_name_plural = _("permissões")

    def __str__(self) -> str:
        return self.codename


class NivelDeAcesso(models.Model):
    """Um conjunto nomeado de permissões, atribuível a usuários.

    Ex.: "aluno_sem_criatura". Um usuário com `role` ADMIN ignora o nível e pode
    tudo; os demais têm exatamente as permissões do seu nível.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid7, editable=False)
    nome = models.CharField(max_length=80, unique=True, verbose_name=_("nome"))
    descricao = models.CharField(
        max_length=255, blank=True, default="", verbose_name=_("descrição")
    )
    permissoes = models.ManyToManyField(
        Permissao,
        related_name="niveis",
        blank=True,
        verbose_name=_("permissões"),
    )
    sistema = models.BooleanField(
        default=False,
        verbose_name=_("nível de sistema"),
        help_text=_(
            "Níveis embutidos (Aluno, Autor, Admin) não podem ser removidos."
        ),
    )
    acesso_admin = models.BooleanField(
        default=False,
        verbose_name=_("acesso ao painel admin"),
        help_text=_(
            "Usuários neste nível podem abrir o /admin. É o que define quem é "
            "administrador da plataforma."
        ),
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["nome"]
        verbose_name = _("nível de acesso")
        verbose_name_plural = _("níveis de acesso")

    def __str__(self) -> str:
        return self.nome


class AceiteDeTermos(models.Model):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid7,
        editable=False,
        verbose_name=_("identificador"),
    )

    user = models.ForeignKey(
        "contas.User",
        on_delete=models.CASCADE,
        related_name="aceites",
        verbose_name=_("usuário"),
    )

    documento = models.CharField(
        max_length=20,
        choices=Documento.choices,
        verbose_name=_("documento"),
    )

    versao = models.CharField(
        max_length=VERSAO_MAX_LENGTH,
        verbose_name=_("versão"),
        help_text=_("Versão que estava vigente no momento do aceite."),
    )

    aceito_em = models.DateTimeField(
        default=timezone.now,
        editable=False,
        verbose_name=_("aceito em"),
    )

    ip = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name=_("IP de origem"),
        help_text=_("De onde partiu o aceite. Guardado como prova."),
    )

    class Meta:
        verbose_name = _("aceite de termos")
        verbose_name_plural = _("aceites de termos")
        ordering = ["-aceito_em"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "documento", "versao"],
                name="aceite_unico_por_versao",
                violation_error_message=_(
                    "Este documento já foi aceito nesta versão."
                ),
            ),
        ]
        indexes = [
            models.Index(
                fields=["user", "documento"],
                name="aceite_user_doc_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.documento} v{self.versao}"

    @classmethod
    def registrar_vigentes(cls, user, ip=None) -> list[AceiteDeTermos]:
        return cls.objects.bulk_create(
            [
                cls(user=user, documento=documento, versao=vigente.versao, ip=ip)
                for documento, vigente in VIGENTES.items()
            ]
        )

    @classmethod
    def registrar_pendentes(cls, user, ip=None) -> list[AceiteDeTermos]:
        """Registra o aceite apenas dos documentos cuja versão vigente ainda não
        foi aceita pelo usuário. Usado no re-consentimento após um bump."""
        aceitos = set(
            cls.objects.filter(user=user).values_list("documento", "versao")
        )
        novos = [
            cls(user=user, documento=documento, versao=vigente.versao, ip=ip)
            for documento, vigente in VIGENTES.items()
            if (documento, vigente.versao) not in aceitos
        ]
        return cls.objects.bulk_create(novos)


class ConfiguracaoMFA(models.Model):
    """Configuração do segundo fator do usuário. Um método por vez."""

    class Metodo(models.TextChoices):
        APP = "APP", _("Aplicativo autenticador")
        EMAIL = "EMAIL", _("E-mail")

    user = models.OneToOneField(
        "contas.User",
        on_delete=models.CASCADE,
        related_name="mfa",
        verbose_name=_("usuário"),
    )
    ativo = models.BooleanField(default=False, verbose_name=_("ativo"))
    metodo = models.CharField(
        max_length=10,
        choices=Metodo.choices,
        blank=True,
        default="",
        verbose_name=_("método"),
    )
    # Segredo base32 do TOTP. Em branco quando o método é e-mail.
    totp_secret = models.CharField(max_length=64, blank=True, default="")
    confirmado_em = models.DateTimeField(null=True, blank=True)

    # Desafio de e-mail transitório: hash do código atual e sua expiração.
    email_codigo_hash = models.CharField(max_length=128, blank=True, default="")
    email_codigo_expira = models.DateTimeField(null=True, blank=True)

    criado_em = models.DateTimeField(default=timezone.now, editable=False)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("configuração de MFA")
        verbose_name_plural = _("configurações de MFA")

    def __str__(self) -> str:
        estado = "ativo" if self.ativo else "inativo"
        return f"MFA {self.metodo or '—'} ({estado}) de {self.user_id}"

    def limpar_desafio_email(self) -> None:
        self.email_codigo_hash = ""
        self.email_codigo_expira = None
        self.save(update_fields=["email_codigo_hash", "email_codigo_expira"])


class CodigoRecuperacaoMFA(models.Model):
    """Código de recuperação de uso único, guardado em hash."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid7, editable=False)
    user = models.ForeignKey(
        "contas.User",
        on_delete=models.CASCADE,
        related_name="codigos_recuperacao_mfa",
        verbose_name=_("usuário"),
    )
    codigo_hash = models.CharField(max_length=128)
    usado_em = models.DateTimeField(null=True, blank=True)
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = _("código de recuperação de MFA")
        verbose_name_plural = _("códigos de recuperação de MFA")
        indexes = [models.Index(fields=["user", "usado_em"])]

    def __str__(self) -> str:
        return f"recuperação MFA de {self.user_id}"
