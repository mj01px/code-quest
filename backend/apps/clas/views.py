from django.core.exceptions import ValidationError
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import HasPerm

from .serializers import (
    ClaSerializer,
    ConviteGeradoSerializer,
    CriarClaSerializer,
    EditarClaSerializer,
    MembroSerializer,
    MeuClaSerializer,
    MudarCargoSerializer,
    PreviaDoConviteSerializer,
    TransferirLiderancaSerializer,
)
from .services import (
    aceitar_convite,
    buscar_clas,
    criar_cla,
    editar_cla,
    entrar_no_cla,
    expulsar,
    gerar_convite,
    listar_membros,
    meu_cla,
    montar_link_de_convite,
    mudar_cargo,
    obter_cla_visivel,
    revogar_convite,
    sair_do_cla,
    transferir_lideranca,
    ver_convite,
)

PODE_CRIAR_CLA = HasPerm("comunidades.create")
PODE_ENTRAR_EM_CLA = HasPerm("comunidades.join")

BUSCA_MAX_LENGTH = 50


class ClaPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "tamanho"
    max_page_size = 50


@extend_schema(tags=["clas"])
class ClasView(generics.ListAPIView):
    serializer_class = ClaSerializer
    pagination_class = ClaPagination

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), PODE_CRIAR_CLA()]
        return [IsAuthenticated()]

    def get_queryset(self):
        busca = self.request.query_params.get("busca", "")
        if len(busca) > BUSCA_MAX_LENGTH:
            raise ValidationError(
                {"busca": ValidationError("Busca longa demais.", code="busca_longa")}
            )
        return buscar_clas(busca)

    @extend_schema(
        parameters=[
            OpenApiParameter("busca", str, description="Parte do nome ou a tag."),
        ],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(request=CriarClaSerializer, responses=ClaSerializer)
    def post(self, request, *args, **kwargs):
        entrada = CriarClaSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)

        cla = criar_cla(user=request.user, **entrada.validated_data)
        saida = ClaSerializer(cla, context=self.get_serializer_context())
        return Response(saida.data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["clas"], responses=ClaSerializer)
class ClaDetalheView(generics.GenericAPIView):
    serializer_class = ClaSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request, tag, *args, **kwargs):
        cla = obter_cla_visivel(user=request.user, tag=tag)
        return Response(self.get_serializer(cla).data)

    @extend_schema(request=EditarClaSerializer)
    def patch(self, request, tag, *args, **kwargs):
        entrada = EditarClaSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)

        cla = editar_cla(user=request.user, tag=tag, dados=entrada.validated_data)
        return Response(self.get_serializer(cla).data)


@extend_schema(tags=["clas"], request=None, responses={201: MeuClaSerializer})
class EntrarNoClaView(generics.GenericAPIView):
    serializer_class = MeuClaSerializer
    permission_classes = [IsAuthenticated, PODE_ENTRAR_EM_CLA]

    def post(self, request, tag, *args, **kwargs):
        entrar_no_cla(user=request.user, tag=tag)
        saida = self.get_serializer(meu_cla(request.user))
        return Response(saida.data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["clas"], responses=MeuClaSerializer)
class MeuClaView(generics.GenericAPIView):
    serializer_class = MeuClaSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        membro = meu_cla(request.user)
        if membro is None:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(self.get_serializer(membro).data)


@extend_schema(tags=["clas"], request=None, responses={204: None})
class SairDoClaView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        sair_do_cla(user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["clas"])
class MembrosView(generics.ListAPIView):
    serializer_class = MembroSerializer
    permission_classes = [IsAuthenticated]
    # limite de 50 por clã, não precisa paginar
    pagination_class = None

    def get_queryset(self):
        return listar_membros(user=self.request.user, tag=self.kwargs["tag"])


@extend_schema(tags=["clas"], responses=MembroSerializer)
class MembroView(generics.GenericAPIView):
    serializer_class = MembroSerializer
    permission_classes = [IsAuthenticated]

    @extend_schema(request=MudarCargoSerializer)
    def patch(self, request, tag, membro_id, *args, **kwargs):
        entrada = MudarCargoSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)

        membro = mudar_cargo(
            user=request.user,
            tag=tag,
            membro_id=membro_id,
            cargo=entrada.validated_data["cargo"],
        )
        return Response(self.get_serializer(membro).data)

    @extend_schema(responses={204: None})
    def delete(self, request, tag, membro_id, *args, **kwargs):
        expulsar(user=request.user, tag=tag, membro_id=membro_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    tags=["clas"], request=TransferirLiderancaSerializer, responses=MembroSerializer
)
class LiderancaView(generics.GenericAPIView):
    serializer_class = MembroSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, tag, *args, **kwargs):
        entrada = TransferirLiderancaSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)

        novo_lider = transferir_lideranca(
            user=request.user,
            tag=tag,
            membro_id=entrada.validated_data["membro_id"],
        )
        return Response(self.get_serializer(novo_lider).data)


@extend_schema(tags=["clas"])
class ConviteView(generics.GenericAPIView):
    serializer_class = ConviteGeradoSerializer
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses={201: ConviteGeradoSerializer})
    def post(self, request, tag, *args, **kwargs):
        convite, token = gerar_convite(user=request.user, tag=tag)
        saida = self.get_serializer(
            {
                "token": token,
                "link": montar_link_de_convite(token),
                "expira_em": convite.expira_em,
            }
        )
        return Response(saida.data, status=status.HTTP_201_CREATED)

    @extend_schema(responses={204: None})
    def delete(self, request, tag, *args, **kwargs):
        revogar_convite(user=request.user, tag=tag)
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["clas"], responses=PreviaDoConviteSerializer)
class PreviaDoConviteView(generics.GenericAPIView):
    serializer_class = PreviaDoConviteSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request, token, *args, **kwargs):
        return Response(self.get_serializer(ver_convite(token)).data)


@extend_schema(tags=["clas"], request=None, responses={201: MeuClaSerializer})
class AceitarConviteView(generics.GenericAPIView):
    serializer_class = MeuClaSerializer
    permission_classes = [IsAuthenticated, PODE_ENTRAR_EM_CLA]

    def post(self, request, token, *args, **kwargs):
        aceitar_convite(user=request.user, token=token)
        saida = self.get_serializer(meu_cla(request.user))
        return Response(saida.data, status=status.HTTP_201_CREATED)
