from rest_framework.request import Request

from apps.contas.models import User


def usuario_atual(request: Request) -> User:
    """Devolve `request.user` tipado como `User`, para view autenticada.

    O stub do DRF tipa `request.user` como `AbstractBaseUser | AnonymousUser`.
    `IsAuthenticated` barra o anônimo antes da view, mas o mypy não sabe disso.
    Chamado fora de uma view autenticada, o assert falha e expõe o bug.
    """
    assert isinstance(request.user, User)
    return request.user
