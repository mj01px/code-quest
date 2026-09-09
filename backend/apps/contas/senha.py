import hashlib
import logging

from django.conf import settings
from django.core import signing

from apps.contas.email_utils import enviar_email_html

logger = logging.getLogger(__name__)

SALT = "contas.redefinicao-senha"

ASSUNTO = "Redefinição de senha na CodeQuest"

TEMPLATE = "contas/redefinicao_email.html"

CORPO = """Olá, {nickname}!

Alguém pediu para redefinir a senha da sua conta na CodeQuest. Se foi você,
use o link abaixo:

{link}

O link vale por {minutos} minutos e deixa de funcionar assim que a senha for
trocada. Se não foi você, ignore esta mensagem: nada muda até alguém abrir o
link.

CodeQuest
"""


def _marca(user) -> str:
    return hashlib.sha256(user.password.encode()).hexdigest()[:16]


def gerar_token(user) -> str:
    return signing.dumps({"uid": str(user.pk), "marca": _marca(user)}, salt=SALT)


def ler_token(token: str) -> dict | None:
    try:
        dados = signing.loads(
            token, salt=SALT, max_age=settings.REDEFINICAO_SENHA_MAX_AGE
        )
    except signing.BadSignature:
        return None
    if not isinstance(dados, dict) or "uid" not in dados or "marca" not in dados:
        return None
    return dados


def token_confere(token_dados: dict, user) -> bool:
    return token_dados["marca"] == _marca(user)


def montar_link(token: str) -> str:
    return f"{settings.FRONTEND_URL}/redefinir-senha?token={token}"


def enviar_redefinicao(user) -> bool:
    link = montar_link(gerar_token(user))
    minutos = settings.REDEFINICAO_SENHA_MAX_AGE // 60
    contexto = {
        "nickname": user.nickname,
        "link": link,
        "minutos": minutos,
        "botao_texto": "REDEFINIR SENHA",
        "botao_url": link,
        "nota": f"O link expira em {minutos} minutos",
    }

    try:
        enviar_email_html(
            assunto=ASSUNTO,
            destinatario=user.email,
            template=TEMPLATE,
            contexto=contexto,
            texto_alternativo=CORPO.format(
                nickname=user.nickname, link=link, minutos=minutos
            ),
        )
    except Exception:
        logger.exception("Falha ao enviar redefinicao de senha para %s", user.pk)
        return False

    logger.info("Redefinicao de senha enviada para o usuario %s", user.pk)
    return True
