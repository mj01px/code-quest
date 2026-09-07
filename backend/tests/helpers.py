"""
Auxiliares compartilhados pelos testes.

São funções simples em vez de fixtures do pytest de propósito: os testes deste
projeto usam `TestCase` do Django, que roda tanto por `manage.py test` quanto
por `pytest`. Fixture só funcionaria no segundo.
"""

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
