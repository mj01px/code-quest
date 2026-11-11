from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView

from apps.contas.models import User


class IsAdmin(BasePermission):

    message = "Esta ação é restrita a administradores."

    def has_permission(self, request: Request, view: APIView) -> bool:
        # Anônimo não é User: o isinstance faz o papel do is_authenticated.
        user = request.user
        return isinstance(user, User) and user.is_platform_admin


def HasPerm(*codenames: str) -> type[BasePermission]:
    if not codenames:
        raise ValueError("HasPerm exige ao menos um codename.")

    class _HasPerm(BasePermission):
        message = "Você não tem permissão para esta ação."

        def has_permission(self, request: Request, view: APIView) -> bool:
            user = request.user
            if not isinstance(user, User):
                return False
            return all(user.has_perm(code) for code in codenames)

    _HasPerm.__name__ = f"HasPerm[{','.join(codenames)}]"
    return _HasPerm


def HasAnyPerm(*codenames: str) -> type[BasePermission]:
    if not codenames:
        raise ValueError("HasAnyPerm exige ao menos um codename.")

    class _HasAnyPerm(BasePermission):
        message = "Você não tem permissão para esta ação."

        def has_permission(self, request: Request, view: APIView) -> bool:
            user = request.user
            if not isinstance(user, User):
                return False
            return any(user.has_perm(code) for code in codenames)

    _HasAnyPerm.__name__ = f"HasAnyPerm[{','.join(codenames)}]"
    return _HasAnyPerm


def IsOwnerOrHasPerm(
    *codenames: str, owner_field: str = "user"
) -> type[BasePermission]:

    class _IsOwnerOrHasPerm(BasePermission):
        message = "Você não tem permissão para acessar este registro."

        def has_permission(self, request: Request, view: APIView) -> bool:
            return isinstance(request.user, User)

        def has_object_permission(
            self, request: Request, view: APIView, obj: object
        ) -> bool:
            user = request.user
            if not isinstance(user, User):
                return False
            if codenames and any(user.has_perm(code) for code in codenames):
                return True
            if obj == user:
                return True
            dono = getattr(obj, owner_field, None)
            return dono is not None and dono == user

    _IsOwnerOrHasPerm.__name__ = f"IsOwnerOrHasPerm[{','.join(codenames)}]"
    return _IsOwnerOrHasPerm
