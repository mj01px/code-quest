"""Lógica do segundo fator (MFA): TOTP (app), código por e-mail e códigos de
recuperação. Um método ativo por vez; a recuperação vale para qualquer método.

Reaproveita o padrão de token assinado (verificacao.py), o envio de e-mail
(email_utils) e a auditoria fica a cargo das views.
"""

import base64
import hashlib
import hmac
import logging
import secrets

import pyotp
import qrcode
from django.conf import settings
from django.core import signing
from django.utils import timezone

from apps.contas.email_utils import enviar_email_html

from .models import CodigoRecuperacaoMFA, ConfiguracaoMFA

logger = logging.getLogger(__name__)

SALT_LOGIN = "contas.mfa-login"
QTD_RECUPERACAO = 8
ISSUER = "CodeQuest"

ASSUNTO_EMAIL = "Seu código de acesso na CodeQuest"
TEMPLATE_EMAIL = "contas/mfa_email.html"
CORPO_EMAIL = """Olá, {nickname}!

Seu código de verificação para entrar na CodeQuest é:

{codigo}

Ele vale por {minutos} minutos. Se não foi você tentando entrar, ignore esta
mensagem e troque sua senha por segurança.

CodeQuest
"""


def _hash(valor: str) -> str:
    return hashlib.sha256(valor.strip().encode()).hexdigest()


def _confere(guardado: str, informado: str) -> bool:
    return bool(guardado) and hmac.compare_digest(guardado, _hash(informado))


# ---------------------------------------------------------------- TOTP (app)
def gerar_secret() -> str:
    return pyotp.random_base32()


def uri_provisionamento(user, secret: str) -> str:
    return pyotp.TOTP(secret).provisioning_uri(name=user.email, issuer_name=ISSUER)


def verificar_totp(secret: str, codigo: str) -> bool:
    if not secret:
        return False
    return pyotp.TOTP(secret).verify(codigo.strip(), valid_window=1)


def qr_data_uri(uri: str) -> str:
    """QR em SVG (data: URI), gerado direto da matriz — sem Pillow nem lxml."""
    qr = qrcode.QRCode(border=2, box_size=1)
    qr.add_data(uri)
    qr.make(fit=True)
    matriz = qr.get_matrix()
    lado = len(matriz)
    modulos = "".join(
        f'<rect x="{x}" y="{y}" width="1" height="1"/>'
        for y, linha in enumerate(matriz)
        for x, aceso in enumerate(linha)
        if aceso
    )
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {lado} {lado}" '
        f'shape-rendering="crispEdges"><rect width="{lado}" height="{lado}" '
        f'fill="#ffffff"/><g fill="#000000">{modulos}</g></svg>'
    )
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode()).decode()


# -------------------------------------------------------------- e-mail (OTP)
def _gerar_codigo_email() -> str:
    return f"{secrets.randbelow(10**6):06d}"


def preparar_desafio_email(config: ConfiguracaoMFA) -> str:
    from datetime import timedelta

    codigo = _gerar_codigo_email()
    config.email_codigo_hash = _hash(codigo)
    config.email_codigo_expira = timezone.now() + timedelta(
        seconds=settings.MFA_EMAIL_CODIGO_MAX_AGE
    )
    config.save(update_fields=["email_codigo_hash", "email_codigo_expira"])
    return codigo


def enviar_codigo_email(user, codigo: str) -> bool:
    minutos = settings.MFA_EMAIL_CODIGO_MAX_AGE // 60
    try:
        enviar_email_html(
            assunto=ASSUNTO_EMAIL,
            destinatario=user.email,
            template=TEMPLATE_EMAIL,
            contexto={
                "nickname": user.nickname,
                "codigo": codigo,
                "minutos": minutos,
                "nota": f"O código expira em {minutos} minutos",
            },
            texto_alternativo=CORPO_EMAIL.format(
                nickname=user.nickname, codigo=codigo, minutos=minutos
            ),
        )
    except Exception:
        logger.exception("Falha ao enviar codigo MFA para %s", user.pk)
        return False
    return True


def _verificar_codigo_email(config: ConfiguracaoMFA, codigo: str) -> bool:
    if not config.email_codigo_hash or config.email_codigo_expira is None:
        return False
    if timezone.now() > config.email_codigo_expira:
        return False
    if _confere(config.email_codigo_hash, codigo):
        config.limpar_desafio_email()  # uso único
        return True
    return False


# --------------------------------------------------------- códigos de recuperação
def gerar_codigos_recuperacao(user) -> list[str]:
    CodigoRecuperacaoMFA.objects.filter(user=user).delete()
    codigos = [
        f"{secrets.token_hex(2)}-{secrets.token_hex(2)}"
        for _ in range(QTD_RECUPERACAO)
    ]
    CodigoRecuperacaoMFA.objects.bulk_create(
        [CodigoRecuperacaoMFA(user=user, codigo_hash=_hash(c)) for c in codigos]
    )
    return codigos


def consumir_codigo_recuperacao(user, codigo: str) -> bool:
    alvo = _hash(codigo)
    registro = CodigoRecuperacaoMFA.objects.filter(
        user=user, usado_em__isnull=True, codigo_hash=alvo
    ).first()
    if registro is None:
        return False
    registro.usado_em = timezone.now()
    registro.save(update_fields=["usado_em"])
    return True


# ------------------------------------------------------------ token do login
def token_login(user) -> str:
    return signing.dumps({"uid": str(user.pk)}, salt=SALT_LOGIN)


def ler_token_login(token: str) -> str | None:
    try:
        dados = signing.loads(
            token, salt=SALT_LOGIN, max_age=settings.MFA_LOGIN_TOKEN_MAX_AGE
        )
    except signing.BadSignature:
        return None
    return dados.get("uid") if isinstance(dados, dict) else None


# -------------------------------------------------------------- orquestração
def mfa_ativo(user) -> ConfiguracaoMFA | None:
    config = getattr(user, "mfa", None)
    return config if config is not None and config.ativo else None


def iniciar_desafio_login(user) -> None:
    """No login, se o método for e-mail, dispara o código. TOTP não precisa."""
    config = mfa_ativo(user)
    if config is not None and config.metodo == ConfiguracaoMFA.Metodo.EMAIL:
        enviar_codigo_email(user, preparar_desafio_email(config))


def verificar_codigo(user, codigo: str, permitir_recuperacao: bool = True) -> bool:
    config = getattr(user, "mfa", None)
    if config is None:
        return False

    if config.metodo == ConfiguracaoMFA.Metodo.APP:
        if verificar_totp(config.totp_secret, codigo):
            return True
    elif config.metodo == ConfiguracaoMFA.Metodo.EMAIL:
        if _verificar_codigo_email(config, codigo):
            return True

    return permitir_recuperacao and consumir_codigo_recuperacao(user, codigo)


def iniciar_setup(user, metodo: str) -> dict:
    """Prepara (mas não ativa) o método escolhido. APP devolve o QR/segredo;
    e-mail dispara o primeiro código."""
    config, _ = ConfiguracaoMFA.objects.get_or_create(user=user)
    config.ativo = False
    config.confirmado_em = None
    config.metodo = metodo

    if metodo == ConfiguracaoMFA.Metodo.APP:
        config.totp_secret = gerar_secret()
        config.limpar_desafio_email()  # também salva o resto
        config.save()
        uri = uri_provisionamento(user, config.totp_secret)
        return {"secret": config.totp_secret, "otpauth": uri, "qr": qr_data_uri(uri)}

    # e-mail
    config.totp_secret = ""
    config.save()
    enviado = enviar_codigo_email(user, preparar_desafio_email(config))
    return {"email_enviado": enviado}


def confirmar_setup(user, codigo: str) -> list[str] | None:
    """Confirma o código do método pendente e ativa o MFA. Devolve os códigos
    de recuperação (uma única vez) ou None se o código não bater."""
    config = getattr(user, "mfa", None)
    if config is None or config.ativo:
        return None
    if not verificar_codigo(user, codigo, permitir_recuperacao=False):
        return None

    config.ativo = True
    config.confirmado_em = timezone.now()
    config.save(update_fields=["ativo", "confirmado_em"])
    return gerar_codigos_recuperacao(user)


def desativar(user, codigo: str) -> bool:
    config = mfa_ativo(user)
    if config is None:
        return False
    if not verificar_codigo(user, codigo):
        return False

    config.ativo = False
    config.metodo = ""
    config.totp_secret = ""
    config.limpar_desafio_email()
    config.save(update_fields=["ativo", "metodo", "totp_secret"])
    CodigoRecuperacaoMFA.objects.filter(user=user).delete()
    return True
