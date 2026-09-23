"""Token e e-mail de confirmação da exclusão de conta.

Mesmo padrão da redefinição de senha: token assinado, de vida curta e de uso
único. A marca deriva do hash da senha, então trocar a senha invalida um link
pendente. Confirmar a exclusão anonimiza a conta na hora (sem prazo).
"""

import hashlib
import logging

from django.conf import settings
from django.core import signing

from apps.contas.email_utils import enviar_email_html

logger = logging.getLogger(__name__)

SALT = "contas.exclusao-conta"

ASSUNTO = "Confirme a exclusão da sua conta na CodeQuest"

TEMPLATE = "contas/exclusao_email.html"

CORPO = """Olá, {nickname}!

Recebemos um pedido para EXCLUIR de vez a sua conta na CodeQuest. Se foi você,
confirme pelo link abaixo (vamos pedir sua senha para ter certeza):

{link}

O link vale por {minutos} minutos. A exclusão é definitiva e não tem como
desfazer. Se não foi você, ignore esta mensagem: nada acontece até alguém abrir
o link e confirmar com a senha.

CodeQuest
"""


def _marca(user) -> str:
    return hashlib.sha256(user.password.encode()).hexdigest()[:16]


def gerar_token(user) -> str:
    return signing.dumps({"uid": str(user.pk), "marca": _marca(user)}, salt=SALT)


def ler_token(token: str) -> dict | None:
    try:
        dados = signing.loads(
            token, salt=SALT, max_age=settings.EXCLUSAO_TOKEN_MAX_AGE
        )
    except signing.BadSignature:
        return None
    if not isinstance(dados, dict) or "uid" not in dados or "marca" not in dados:
        return None
    return dados


def token_confere(dados: dict, user) -> bool:
    return dados["marca"] == _marca(user)


def montar_link(token: str) -> str:
    return f"{settings.FRONTEND_URL}/confirmar-exclusao?token={token}"


def enviar_confirmacao_exclusao(user) -> bool:
    link = montar_link(gerar_token(user))
    minutos = settings.EXCLUSAO_TOKEN_MAX_AGE // 60
    contexto = {
        "nickname": user.nickname,
        "link": link,
        "minutos": minutos,
        "botao_texto": "CONFIRMAR EXCLUSÃO",
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
        logger.exception("Falha ao enviar confirmacao de exclusao para %s", user.pk)
        return False

    logger.info("Confirmacao de exclusao enviada para o usuario %s", user.pk)
    return True
