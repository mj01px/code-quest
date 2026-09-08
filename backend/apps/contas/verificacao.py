import logging

from django.conf import settings
from django.core import signing
from django.core.mail import send_mail

logger = logging.getLogger(__name__)

SALT = "contas.verificacao-email"

ASSUNTO = "Confirme seu e-mail na CodeQuest"

CORPO = """Olá, {nickname}!

Confirme seu e-mail para liberar o acesso à CodeQuest:

{link}

O link vale por {horas} horas. Se você não criou esta conta, ignore esta mensagem.

CodeQuest
"""


def gerar_token(user) -> str:
    return signing.dumps(str(user.pk), salt=SALT)


def ler_token(token: str) -> str | None:
    try:
        return signing.loads(
            token, salt=SALT, max_age=settings.VERIFICACAO_EMAIL_MAX_AGE
        )
    except signing.BadSignature:
        return None


def montar_link(token: str) -> str:
    return f"{settings.FRONTEND_URL}/verificar-email?token={token}"


def enviar_verificacao(user) -> bool:
    link = montar_link(gerar_token(user))
    corpo = CORPO.format(
        nickname=user.nickname,
        link=link,
        horas=settings.VERIFICACAO_EMAIL_MAX_AGE // 3600,
    )

    try:
        send_mail(
            subject=ASSUNTO,
            message=corpo,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
    except Exception:
        logger.exception("Falha ao enviar verificacao de e-mail para o usuario %s", user.pk)
        return False

    logger.info("Verificacao de e-mail enviada para o usuario %s", user.pk)
    return True
