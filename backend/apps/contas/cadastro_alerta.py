import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)

ASSUNTO = "Tentativa de cadastro na CodeQuest"

CORPO = """Olá!

Alguém tentou criar uma conta na CodeQuest com este endereço, mas ele já está
em uso. Nenhuma conta nova foi criada e nada mudou na sua.

Se foi você e esqueceu a senha, redefina por aqui:

{link}

Se não foi você, pode ignorar esta mensagem.

CodeQuest
"""


def avisar_tentativa_de_cadastro(email: str) -> bool:
    corpo = CORPO.format(link=f"{settings.FRONTEND_URL}/recuperar-senha")

    try:
        send_mail(
            subject=ASSUNTO,
            message=corpo,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
    except Exception:
        logger.exception("Falha ao avisar tentativa de cadastro duplicado")
        return False

    logger.info("Aviso de cadastro duplicado enviado")
    return True
