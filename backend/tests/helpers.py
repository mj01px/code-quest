"""
Auxiliares compartilhados pelos testes.

São funções simples em vez de fixtures do pytest de propósito: os testes deste
projeto usam `TestCase` do Django, que roda tanto por `manage.py test` quanto
por `pytest`. Fixture só funcionaria no segundo.
"""

from apps.contas.documentos import Documento, versao_vigente
from apps.contas.models import User

SENHA_PADRAO = "trilha-de-python-8"


def criar_usuario(nickname: str, role: str = User.Role.STUDENT, **extra) -> User:
    """Cria um usuário com e-mail derivado do nickname."""
    return User.objects.create_user(
        email=f"{nickname}@example.com",
        nickname=nickname,
        password=SENHA_PADRAO,
        role=role,
        **extra,
    )


def criar_aluno(nickname: str = "aluno", **extra) -> User:
    return criar_usuario(nickname, User.Role.STUDENT, **extra)


def criar_autor(nickname: str = "autor", **extra) -> User:
    return criar_usuario(nickname, User.Role.AUTHOR, **extra)


def criar_admin(nickname: str = "administrador", **extra) -> User:
    return criar_usuario(nickname, User.Role.ADMIN, **extra)


def payload_aceite() -> dict:
    """
    Bloco de aceite que o cadastro exige, sempre na versão vigente.

    É função e não constante de propósito: os testes mexem no payload, e um
    dicionário compartilhado no módulo vazaria a mudança de um teste no outro.
    """
    return {
        "aceite_documentos": True,
        "versao_termos": versao_vigente(Documento.TERMOS),
        "versao_privacidade": versao_vigente(Documento.PRIVACIDADE),
    }
