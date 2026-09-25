import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class AcaoAuditoria(models.TextChoices):
    """Códigos das ações registradas na trilha de auditoria.

    Os quatro últimos (papel e suspensão de conta) seguem sem uso: o painel de
    administração troca o nível de acesso (`NIVEL_ATRIBUIDO`), não o `role`, e
    suspensão ainda não tem endpoint.
    """

    LOGIN_OK = "LOGIN_OK", _("Login bem-sucedido")
    LOGIN_FALHA = "LOGIN_FALHA", _("Falha de login")
    LOGOUT = "LOGOUT", _("Logout")
    CADASTRO = "CADASTRO", _("Conta criada")
    EMAIL_VERIFICADO = "EMAIL_VERIFICADO", _("E-mail verificado")
    SENHA_REDEFINIDA = "SENHA_REDEFINIDA", _("Senha redefinida")
    TROCA_EMAIL_SOLICITADA = "TROCA_EMAIL_SOLICITADA", _("Troca de e-mail solicitada")
    # Etapa 1: o endereço atual aprovou a troca (o IP de quem aprovou fica aqui).
    TROCA_EMAIL_AUTORIZADA = "TROCA_EMAIL_AUTORIZADA", _("Troca de e-mail autorizada")
    TROCA_EMAIL_CONFIRMADA = "TROCA_EMAIL_CONFIRMADA", _("Troca de e-mail confirmada")
    EXCLUSAO_SOLICITADA = "EXCLUSAO_SOLICITADA", _("Exclusão de conta solicitada")
    NICKNAME_ALTERADO = "NICKNAME_ALTERADO", _("Nickname alterado")
    CRIATURA_ADQUIRIDA = "CRIATURA_ADQUIRIDA", _("Criatura adquirida")
    CRIATURA_EVOLUIDA = "CRIATURA_EVOLUIDA", _("Criatura evoluída")
    EXPORTACAO_DADOS = "EXPORTACAO_DADOS", _("Exportação de dados do titular")
    CONSENTIMENTO_ACEITO = "CONSENTIMENTO_ACEITO", _("Consentimento (re)aceito")
    MFA_ATIVADO = "MFA_ATIVADO", _("Verificação em duas etapas ativada")
    MFA_DESATIVADO = "MFA_DESATIVADO", _("Verificação em duas etapas desativada")
    ACESSO_AUDITORIA = "ACESSO_AUDITORIA", _("Consulta à trilha de auditoria")
    CONTA_ANONIMIZADA = "CONTA_ANONIMIZADA", _("Conta anonimizada")
    # Painel de RBAC: nível é o conjunto de permissões, não o `role` do usuário.
    NIVEL_CRIADO = "NIVEL_CRIADO", _("Nível de acesso criado")
    NIVEL_EDITADO = "NIVEL_EDITADO", _("Nível de acesso editado")
    NIVEL_REMOVIDO = "NIVEL_REMOVIDO", _("Nível de acesso removido")
    NIVEL_ATRIBUIDO = "NIVEL_ATRIBUIDO", _("Nível de acesso atribuído a usuário")
    # Definidos para uso futuro (administração):
    PAPEL_CONCEDIDO = "PAPEL_CONCEDIDO", _("Papel concedido")
    PAPEL_REMOVIDO = "PAPEL_REMOVIDO", _("Papel removido")
    CONTA_SUSPENSA = "CONTA_SUSPENSA", _("Conta suspensa")
    CONTA_REATIVADA = "CONTA_REATIVADA", _("Conta reativada")


# Ações que fazem parte do histórico que o próprio titular vê no seu perfil.
# Deixa de fora ações administrativas (consulta à auditoria, gestão de usuários).
ACOES_DO_TITULAR = frozenset(
    {
        AcaoAuditoria.LOGIN_OK,
        AcaoAuditoria.LOGIN_FALHA,
        AcaoAuditoria.LOGOUT,
        AcaoAuditoria.CADASTRO,
        AcaoAuditoria.EMAIL_VERIFICADO,
        AcaoAuditoria.SENHA_REDEFINIDA,
        AcaoAuditoria.TROCA_EMAIL_SOLICITADA,
        AcaoAuditoria.TROCA_EMAIL_AUTORIZADA,
        AcaoAuditoria.TROCA_EMAIL_CONFIRMADA,
        AcaoAuditoria.EXCLUSAO_SOLICITADA,
        AcaoAuditoria.NICKNAME_ALTERADO,
        AcaoAuditoria.CRIATURA_ADQUIRIDA,
        AcaoAuditoria.CRIATURA_EVOLUIDA,
        AcaoAuditoria.EXPORTACAO_DADOS,
        AcaoAuditoria.CONSENTIMENTO_ACEITO,
        AcaoAuditoria.MFA_ATIVADO,
        AcaoAuditoria.MFA_DESATIVADO,
    }
)


class RegistroDeAuditoria(models.Model):
    """Um evento sensível na trilha de auditoria.

    É append-only: uma vez gravado, não pode ser alterado (o save() recusa
    updates). A remoção fica a cargo da purga por retenção (queryset.delete(),
    que não passa pelo save()). Nunca guarda senhas, tokens nem conteúdo
    sensível — apenas metadados não sensíveis em `metadata`.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid7,
        editable=False,
        verbose_name=_("identificador"),
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name=_("registrado em"),
    )

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
        verbose_name=_("autor da ação"),
        help_text=_("Nulo quando anônimo ou após a exclusão do usuário."),
    )

    actor_email_snapshot = models.CharField(
        max_length=254,
        blank=True,
        default="",
        verbose_name=_("e-mail do autor (no momento)"),
        help_text=_("Preserva quem era, mesmo após anonimizar ou excluir a conta."),
    )

    acao = models.CharField(
        max_length=32,
        choices=AcaoAuditoria.choices,
        db_index=True,
        verbose_name=_("ação"),
    )

    alvo_tipo = models.CharField(
        max_length=64,
        blank=True,
        default="",
        verbose_name=_("tipo do alvo"),
    )

    alvo_id = models.CharField(
        max_length=64,
        blank=True,
        default="",
        verbose_name=_("id do alvo"),
    )

    ip = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name=_("IP de origem"),
    )

    user_agent = models.CharField(
        max_length=256,
        blank=True,
        default="",
        verbose_name=_("user agent"),
    )

    metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name=_("metadados"),
        help_text=_("Contexto não sensível da ação (motivo, filtros etc.)."),
    )

    class Meta:
        verbose_name = _("registro de auditoria")
        verbose_name_plural = _("registros de auditoria")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["acao", "-created_at"], name="auditoria_acao_data_idx"),
            models.Index(fields=["actor", "-created_at"], name="auditoria_actor_data_idx"),
        ]

    def __str__(self) -> str:
        quem = self.actor_email_snapshot or "anônimo"
        return f"{self.acao} · {quem} · {self.created_at:%Y-%m-%d %H:%M}"

    def save(self, *args, **kwargs):
        # Append-only: recusa qualquer alteração de um registro já gravado.
        if not self._state.adding:
            raise ValueError(
                "RegistroDeAuditoria é append-only e não pode ser alterado."
            )
        return super().save(*args, **kwargs)
