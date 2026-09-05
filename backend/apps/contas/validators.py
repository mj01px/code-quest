from django.core.exceptions import ValidationError
from django.core.validators import MinLengthValidator, RegexValidator
from django.utils.translation import gettext_lazy as _

NICKNAME_MIN_LENGTH = 3
NICKNAME_MAX_LENGTH = 20

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
