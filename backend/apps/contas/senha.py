import hashlib
import logging

from django.conf import settings
from django.core import signing
from django.core.mail import send_mail

logger = logging.getLogger(__name__)

SALT = "contas.redefinicao-senha"

ASSUNTO = "Redefinição de senha na CodeQuest"

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
    corpo = CORPO.format(
        nickname=user.nickname,
        link=montar_link(gerar_token(user)),
        minutos=settings.REDEFINICAO_SENHA_MAX_AGE // 60,
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
        logger.exception("Falha ao enviar redefinicao de senha para %s", user.pk)
        return False

    logger.info("Redefinicao de senha enviada para o usuario %s", user.pk)
    return True
