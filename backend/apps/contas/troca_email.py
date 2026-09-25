import hashlib
import logging

from django.conf import settings
from django.core import signing

from apps.contas.email_utils import enviar_email_html

logger = logging.getLogger(__name__)

SALT = "contas.troca-email"

ASSUNTO = "Pedido de troca do e-mail da sua conta na CodeQuest"

TEMPLATE = "contas/troca_email.html"

CORPO = """Olá, {nickname}!

Recebemos um pedido para trocar o e-mail da sua conta na CodeQuest para
{novo_email}. Se foi você, confirme pelo link abaixo:

{link}

O link vale por {minutos} minutos. Se não foi você, não abra o link e troque
sua senha: alguém pode estar usando a sua sessão. Nada muda até o link ser
aberto.

CodeQuest
"""

ASSUNTO_POSSE = "Confirme seu novo e-mail na CodeQuest"

CORPO_POSSE = """Olá, {nickname}!

A troca do e-mail da sua conta na CodeQuest para este endereço já foi
autorizada pelo endereço atual. Falta confirmar que este endereço é seu:

{link}

O link vale por {minutos} minutos. Se não foi você, ignore esta mensagem: nada
muda até alguém abrir o link.

CodeQuest
"""


def _marca(user) -> str:
    return hashlib.sha256(user.email.encode()).hexdigest()[:16]


def gerar_token(user, novo_email: str, posse: bool = False) -> str:
    # `posse` marca o link da 2ª etapa (enviado ao endereço novo). Vai assinado:
    # o link da 1ª etapa não se passa pelo da 2ª.
    return signing.dumps(
        {
            "uid": str(user.pk),
            "email": novo_email,
            "marca": _marca(user),
            "posse": posse,
        },
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


def enviar_troca_email(user, novo_email: str, posse: bool = False) -> bool:
    # Etapa 1 vai para o endereço ATUAL: é o dono dele quem autoriza a troca,
    # e uma sessão roubada sozinha não chega a este link (vetor A1). Etapa 2
    # (`posse`) vai para o NOVO: prova que o endereço é do titular.
    link = montar_link(gerar_token(user, novo_email, posse=posse))
    minutos = settings.TROCA_EMAIL_MAX_AGE // 60
    contexto = {
        "nickname": user.nickname,
        "novo_email": novo_email,
        "posse": posse,
        "link": link,
        "minutos": minutos,
        "botao_texto": "CONFIRMAR NOVO E-MAIL" if posse else "CONFIRMAR TROCA",
        "botao_url": link,
        "nota": f"O link expira em {minutos} minutos",
    }

    try:
        enviar_email_html(
            assunto=ASSUNTO_POSSE if posse else ASSUNTO,
            destinatario=novo_email if posse else user.email,
            template=TEMPLATE,
            contexto=contexto,
            texto_alternativo=(CORPO_POSSE if posse else CORPO).format(
                nickname=user.nickname,
                novo_email=novo_email,
                link=link,
                minutos=minutos,
            ),
        )
    except Exception:
        logger.exception("Falha ao enviar troca de e-mail para o usuario %s", user.pk)
        return False

    logger.info("Troca de e-mail enviada para o usuario %s", user.pk)
    return True
