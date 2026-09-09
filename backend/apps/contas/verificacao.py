import logging

from django.conf import settings
from django.core import signing

from apps.contas.email_utils import enviar_email_html

logger = logging.getLogger(__name__)

SALT = "contas.verificacao-email"

ASSUNTO = "Confirme seu e-mail na CodeQuest"

TEMPLATE = "contas/verificacao_email.html"

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
    horas = settings.VERIFICACAO_EMAIL_MAX_AGE // 3600
    contexto = {
        "nickname": user.nickname,
        "link": link,
        "horas": horas,
        "botao_texto": "ATIVAR MINHA CONTA",
        "botao_url": link,
        "nota": f"O link expira em {horas} horas",
    }

    try:
        enviar_email_html(
            assunto=ASSUNTO,
            destinatario=user.email,
            template=TEMPLATE,
            contexto=contexto,
            texto_alternativo=CORPO.format(nickname=user.nickname, link=link, horas=horas),
        )
    except Exception:
        logger.exception("Falha ao enviar verificacao de e-mail para o usuario %s", user.pk)
        return False

    logger.info("Verificacao de e-mail enviada para o usuario %s", user.pk)
    return True
