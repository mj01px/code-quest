"""Endpoints do painel de RBAC do admin (restritos a administradores).

Catálogo de permissões (leitura), CRUD de níveis de acesso e atribuição de um
nível a um usuário. Tudo protegido por `IsAdmin` — o painel inteiro é do admin.
"""

from django.db.models import Count
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.exceptions import ErrorDetail, ValidationError
from rest_framework.response import Response

from apps.core.permissions import IsAdmin

from .models import NivelDeAcesso, Permissao, User
from .serializers_rbac import (
    AtribuirNivelSerializer,
    NivelDeAcessoSerializer,
    PermissaoSerializer,
    UsuarioAdminSerializer,
)


def _niveis_com_contagem():
    return NivelDeAcesso.objects.annotate(
        qtd_usuarios=Count("usuarios")
    ).prefetch_related("permissoes")


@extend_schema(tags=["admin"])
class PermissaoListView(generics.ListAPIView):
    """Catálogo de permissões concedíveis, para montar a UI de níveis."""

    permission_classes = [IsAdmin]
    serializer_class = PermissaoSerializer
    pagination_class = None
    queryset = Permissao.objects.all()


@extend_schema(tags=["admin"])
class NivelListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdmin]
    serializer_class = NivelDeAcessoSerializer
    pagination_class = None

    def get_queryset(self):
        return _niveis_com_contagem()


@extend_schema(tags=["admin"])
class NivelDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdmin]
    serializer_class = NivelDeAcessoSerializer

    def get_queryset(self):
        return _niveis_com_contagem()

    def perform_destroy(self, instance):
        if instance.sistema:
            raise ValidationError(
                {
                    "detail": ErrorDetail(
                        "Níveis de sistema não podem ser removidos.",
                        code="nivel_sistema",
                    )
                }
            )
        if instance.usuarios.exists():
            raise ValidationError(
                {
                    "detail": ErrorDetail(
                        "Há usuários neste nível. Reatribua-os antes de remover.",
                        code="nivel_em_uso",
                    )
                }
            )
        instance.delete()


@extend_schema(tags=["admin"])
class UsuarioListView(generics.ListAPIView):
    """Todos os usuários com nickname, e-mail, cadastro, papel e nível."""

    permission_classes = [IsAdmin]
    serializer_class = UsuarioAdminSerializer
    pagination_class = None

    def get_queryset(self):
        return User.objects.select_related("nivel_de_acesso").order_by("-created_at")


@extend_schema(tags=["admin"], responses=UsuarioAdminSerializer)
class UsuarioNivelView(generics.GenericAPIView):
    """Atribui (ou remove) o nível de acesso de um usuário."""

    permission_classes = [IsAdmin]
    serializer_class = AtribuirNivelSerializer
    queryset = User.objects.select_related("nivel_de_acesso")

    def patch(self, request, *args, **kwargs):
        usuario = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        novo_nivel = serializer.validated_data["nivel_de_acesso"]

        # Trava de segurança: o admin não pode se rebaixar e ficar trancado fora
        # do painel. Outro admin pode rebaixá-lo; a recuperação final é o
        # createsuperuser, que sempre cai no nível "Admin".
        rebaixaria = novo_nivel is None or not novo_nivel.acesso_admin
        if usuario.pk == request.user.pk and rebaixaria:
            raise ValidationError(
                {
                    "detail": ErrorDetail(
                        "Você perderia o acesso ao painel. Peça a outro "
                        "administrador para mudar o seu nível.",
                        code="auto_rebaixamento",
                    )
                }
            )

        usuario.nivel_de_acesso = novo_nivel
        usuario.save(update_fields=["nivel_de_acesso"])
        usuario.invalidar_cache_permissoes()

        return Response(
            UsuarioAdminSerializer(usuario).data, status=status.HTTP_200_OK
        )
