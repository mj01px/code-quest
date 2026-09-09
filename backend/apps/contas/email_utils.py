"""Utilitários para envio de e-mails HTML com a identidade visual da CodeQuest.

Mantém o corpo em texto plano como alternativa (multipart/alternative) e embute
o logo via CID, o que funciona de forma confiável na maioria dos clientes de
e-mail sem depender de uma URL pública para a imagem.
"""

from __future__ import annotations

from email.message import MIMEPart
from functools import lru_cache
from pathlib import Path

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

LOGO_CID = "logo_codequest"
_LOGO_PATH = Path(__file__).resolve().parent / "email_assets" / "logo.png"


@lru_cache(maxsize=1)
def _ler_logo() -> bytes | None:
    try:
        return _LOGO_PATH.read_bytes()
    except OSError:
        return None


def enviar_email_html(
    *,
    assunto: str,
    destinatario: str,
    template: str,
    contexto: dict,
    texto_alternativo: str,
) -> None:
    """Envia um e-mail multipart (texto + HTML) com o logo embutido.

    Levanta a exceção do backend em caso de falha (fail_silently=False); quem
    chama decide como tratar.
    """
    contexto = {**contexto, "assunto": assunto}
    corpo_html = render_to_string(template, contexto)

    mensagem = EmailMultiAlternatives(
        subject=assunto,
        body=texto_alternativo,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[destinatario],
    )
    mensagem.attach_alternative(corpo_html, "text/html")

    logo = _ler_logo()
    if logo is not None:
        imagem = MIMEPart()
        imagem.set_content(
            logo,
            maintype="image",
            subtype="png",
            disposition="inline",
            cid=LOGO_CID,
            filename="codequest.png",
        )
        mensagem.attach(imagem)

    mensagem.send(fail_silently=False)
