"""
Auxiliares compartilhados pelos testes.

São funções simples em vez de fixtures do pytest de propósito: os testes deste
projeto usam `TestCase` do Django, que roda tanto por `manage.py test` quanto
por `pytest`. Fixture só funcionaria no segundo.
"""

import threading
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor

from django.db import connection
from django.utils import timezone

from apps.contas.documentos import Documento, versao_vigente
from apps.contas.models import User

# Atende à política: maiúscula (T), minúscula, número (8) e especial (-).
SENHA_PADRAO = "Trilha-de-python-8"


def criar_usuario(nickname: str, role: str = User.Role.STUDENT, **extra) -> User:
    """Cria um usuário com e-mail derivado do nickname, já verificado."""
    extra.setdefault("email_verified_at", timezone.now())
    return User.objects.create_user(
        email=f"{nickname}@example.com",
        nickname=nickname,
        password=SENHA_PADRAO,
        role=role,
        **extra,
    )


def criar_nao_verificado(nickname: str = "pendente", **extra) -> User:
    return criar_usuario(nickname, email_verified_at=None, **extra)


def criar_aluno(nickname: str = "aluno", **extra) -> User:
    return criar_usuario(nickname, User.Role.STUDENT, **extra)


def criar_autor(nickname: str = "autor", **extra) -> User:
    return criar_usuario(nickname, User.Role.AUTHOR, **extra)


def criar_admin(nickname: str = "administrador", **extra) -> User:
    return criar_usuario(nickname, User.Role.ADMIN, **extra)


def payload_aceite() -> dict:
    return {
        # Maior de 16 (idade mínima), fixo para o teste ser determinístico.
        "data_nascimento": "2000-01-01",
        "aceite_documentos": True,
        "versao_termos": versao_vigente(Documento.TERMOS),
        "versao_privacidade": versao_vigente(Documento.PRIVACIDADE),
    }


def ao_mesmo_tempo(chamada: Callable[[], object], vezes: int = 5) -> list[object]:
    """Roda a chamada em `vezes` threads soltas juntas, cada uma com sua
    conexão. Devolve o retorno de cada uma, ou a exceção que ela levantou.
    Só faz sentido em TransactionTestCase: no TestCase as threads não enxergam
    os dados da transação do teste."""
    largada = threading.Barrier(vezes)

    def rodar(_: int) -> object:
        try:
            largada.wait()
            return chamada()
        except Exception as erro:
            return erro
        finally:
            connection.close()

    with ThreadPoolExecutor(vezes) as pool:
        return list(pool.map(rodar, range(vezes)))
