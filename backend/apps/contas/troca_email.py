import hashlib
import logging

from django.conf import settings
from django.core import signing

from apps.contas.email_utils import enviar_email_html

logger = logging.getLogger(__name__)

SALT = "contas.troca-email"

ASSUNTO = "Confirme seu novo e-mail na CodeQuest"

TEMPLATE = "contas/troca_email.html"

CORPO = """Olá, {nickname}!

Recebemos um pedido para trocar o e-mail da sua conta na CodeQuest para este
endereço. Se foi você, confirme pelo link abaixo:

{link}

O link vale por {horas} horas. Se não foi você, ignore esta mensagem: nada muda
até alguém abrir o link.

CodeQuest
"""


def _marca(user) -> str:
    return hashlib.sha256(user.email.encode()).hexdigest()[:16]


def gerar_token(user, novo_email: str) -> str:
    return signing.dumps(
        {"uid": str(user.pk), "email": novo_email, "marca": _marca(user)},
        salt=SALT,
    )


def ler_token(token: str) -> dict | None:
    try:
        dados = signing.loads(token, salt=SALT, max_age=settings.TROCA_EMAIL_MAX_AGE)
    except signing.BadSignature:
        return None
    if not isinstance(dados, dict):
        return None
    if "uid" not in dados or "email" not in dados or "marca" not in dados:
        return None
    return dados


def token_confere(dados: dict, user) -> bool:
    return dados["marca"] == _marca(user)


def montar_link(token: str) -> str:
    return f"{settings.FRONTEND_URL}/confirmar-email?token={token}"


def enviar_troca_email(user, novo_email: str) -> bool:
    link = montar_link(gerar_token(user, novo_email))
    horas = settings.TROCA_EMAIL_MAX_AGE // 3600
    contexto = {
        "nickname": user.nickname,
        "link": link,
        "horas": horas,
        "botao_texto": "CONFIRMAR NOVO E-MAIL",
        "botao_url": link,
        "nota": f"O link expira em {horas} horas",
    }

    try:
        enviar_email_html(
            assunto=ASSUNTO,
            destinatario=novo_email,
            template=TEMPLATE,
            contexto=contexto,
            texto_alternativo=CORPO.format(
                nickname=user.nickname, link=link, horas=horas
            ),
        )
    except Exception:
        logger.exception("Falha ao enviar troca de e-mail para o usuario %s", user.pk)
        return False

    logger.info("Troca de e-mail enviada para o usuario %s", user.pk)
    return True
