from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):

    message = "Esta ação é restrita a administradores."

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(user and user.is_authenticated and user.is_platform_admin)


def HasPerm(*codenames: str):
    if not codenames:
        raise ValueError("HasPerm exige ao menos um codename.")

    class _HasPerm(BasePermission):
        message = "Você não tem permissão para esta ação."

        def has_permission(self, request, view) -> bool:
            user = request.user
            if not user or not user.is_authenticated:
                return False
            return all(user.has_perm(code) for code in codenames)

    _HasPerm.__name__ = f"HasPerm[{','.join(codenames)}]"
    return _HasPerm


def HasAnyPerm(*codenames: str):
    if not codenames:
        raise ValueError("HasAnyPerm exige ao menos um codename.")

    class _HasAnyPerm(BasePermission):
        message = "Você não tem permissão para esta ação."

        def has_permission(self, request, view) -> bool:
            user = request.user
            if not user or not user.is_authenticated:
                return False
            return any(user.has_perm(code) for code in codenames)

    _HasAnyPerm.__name__ = f"HasAnyPerm[{','.join(codenames)}]"
    return _HasAnyPerm


def IsOwnerOrHasPerm(*codenames: str, owner_field: str = "user"):

    class _IsOwnerOrHasPerm(BasePermission):
        message = "Você não tem permissão para acessar este registro."

        def has_permission(self, request, view) -> bool:
            return bool(request.user and request.user.is_authenticated)

        def has_object_permission(self, request, view, obj) -> bool:
            user = request.user
            if codenames and any(user.has_perm(code) for code in codenames):
                return True
            if obj == user:
                return True
            dono = getattr(obj, owner_field, None)
            return dono is not None and dono == user

    _IsOwnerOrHasPerm.__name__ = f"IsOwnerOrHasPerm[{','.join(codenames)}]"
    return _IsOwnerOrHasPerm
