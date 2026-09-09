import logging

from django.conf import settings

from apps.contas.email_utils import enviar_email_html

logger = logging.getLogger(__name__)

ASSUNTO = "Tentativa de cadastro na CodeQuest"

TEMPLATE = "contas/cadastro_alerta_email.html"

CORPO = """Olá!

Alguém tentou criar uma conta na CodeQuest com este endereço, mas ele já está
em uso. Nenhuma conta nova foi criada e nada mudou na sua.

Se foi você e esqueceu a senha, redefina por aqui:

{link}

Se não foi você, pode ignorar esta mensagem.

CodeQuest
"""


def avisar_tentativa_de_cadastro(email: str) -> bool:
    link = f"{settings.FRONTEND_URL}/recuperar-senha"
    contexto = {
        "link": link,
        "botao_texto": "REDEFINIR SENHA",
        "botao_url": link,
    }

    try:
        enviar_email_html(
            assunto=ASSUNTO,
            destinatario=email,
            template=TEMPLATE,
            contexto=contexto,
            texto_alternativo=CORPO.format(link=link),
        )
    except Exception:
        logger.exception("Falha ao avisar tentativa de cadastro duplicado")
        return False

    logger.info("Aviso de cadastro duplicado enviado")
    return True
