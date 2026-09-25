import re
from datetime import date

from django.core.exceptions import ValidationError
from django.core.validators import MinLengthValidator, RegexValidator
from django.utils.translation import gettext_lazy as _

NICKNAME_MIN_LENGTH = 3
NICKNAME_MAX_LENGTH = 20

# Idade mínima para criar conta por conta própria. Verificada no cadastro pela
# data de nascimento.
IDADE_MINIMA_ANOS = 16


def calcular_idade(nascimento: date, hoje: date | None = None) -> int:
    """Idade em anos completos. Só conta o aniversário depois que ele passou."""
    hoje = hoje or date.today()
    return (
        hoje.year
        - nascimento.year
        - ((hoje.month, hoje.day) < (nascimento.month, nascimento.day))
    )

# Teto do comprimento da senha. Segue o NIST SP 800-63B (aceitar ao menos 64) e
# corta o vetor de negação de serviço em que uma senha gigante forçaria o Argon2
# a gastar CPU/memória à toa. O piso de 8 fica a cargo do MinimumLengthValidator.
SENHA_MAX_LENGTH = 128

# Caracteres aceitos como "especiais" na política de complexidade.
_SENHA_ESPECIAIS = r"!@#$%^&*()\-_=+\[\]{};:'\",.<>?/\\|`~"

nickname_format_validator = RegexValidator(
    regex=r"^[A-Za-z0-9_]+$",
    message=_(
        "O nickname pode conter apenas letras sem acento, números e underscore."
    ),
    code="nickname_invalido",
)

nickname_min_length_validator = MinLengthValidator(
    NICKNAME_MIN_LENGTH,
    message=_("O nickname precisa ter pelo menos %(limit_value)d caracteres."),
)

RESERVED_NICKNAMES = frozenset(
    {
        "admin",
        "administrador",
        "api",
        "auth",
        "avatar",
        "cadastro",
        "conquistas",
        "criatura",
        "criaturas",
        "comunidade",
        "comunidades",
        "entrar",
        "exercicio",
        "exercicios",
        "login",
        "logout",
        "perfil",
        "ranking",
        "registrar",
        "sair",
        "settings",
        "sobre",
        "static",
        "submissao",
        "submissoes",
        "suporte",
        "termos",
        "trilha",
        "trilhas",
        "u",
        "codequest",
        "code_quest",
        "equipe",
        "moderador",
        "oficial",
        "root",
        "sistema",
        "staff",
        "suporte_codequest",
        "eu",
        "me",
        "none",
        "null",
        "undefined",
    }
)


def validate_nickname_not_reserved(value: str) -> None:
    if value.lower() in RESERVED_NICKNAMES:
        raise ValidationError(
            _("Este nickname não está disponível."),
            code="nickname_reservado",
        )


class PasswordComplexityValidator:
    """Exige composição mínima na senha: maiúscula, minúscula, número e um
    caractere especial.

    É o 5º validador da cadeia de AUTH_PASSWORD_VALIDATORS, somando-se aos quatro
    nativos do Django (similaridade, comprimento mínimo, senhas comuns e senha
    puramente numérica). Garante entropia mínima mesmo em senhas curtas.
    """

    def validate(self, password, user=None):
        erros = []
        if not re.search(r"[A-Z]", password):
            erros.append(
                ValidationError(
                    _("A senha deve conter pelo menos uma letra maiúscula."),
                    code="senha_sem_maiuscula",
                )
            )
        if not re.search(r"[a-z]", password):
            erros.append(
                ValidationError(
                    _("A senha deve conter pelo menos uma letra minúscula."),
                    code="senha_sem_minuscula",
                )
            )
        if not re.search(r"[0-9]", password):
            erros.append(
                ValidationError(
                    _("A senha deve conter pelo menos um número."),
                    code="senha_sem_numero",
                )
            )
        if not re.search(f"[{_SENHA_ESPECIAIS}]", password):
            erros.append(
                ValidationError(
                    _("A senha deve conter pelo menos um caractere especial."),
                    code="senha_sem_especial",
                )
            )
        if erros:
            raise ValidationError(erros)

    def get_help_text(self):
        return _(
            "A senha deve conter pelo menos uma letra maiúscula, uma minúscula, "
            "um número e um caractere especial."
        )
