from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import HasPerm

from .serializers import (
    ClaSerializer,
    CriarClaSerializer,
    EditarClaSerializer,
    MeuClaSerializer,
)
from .services import criar_cla, editar_cla, meu_cla, obter_cla_visivel

PODE_CRIAR_CLA = HasPerm("comunidades.create")


@extend_schema(tags=["clas"], request=CriarClaSerializer, responses=ClaSerializer)
class ClasView(generics.GenericAPIView):
    serializer_class = CriarClaSerializer
    permission_classes = [IsAuthenticated, PODE_CRIAR_CLA]

    def post(self, request, *args, **kwargs):
        entrada = self.get_serializer(data=request.data)
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


@extend_schema(tags=["clas"], responses=MeuClaSerializer)
class MeuClaView(generics.GenericAPIView):
    serializer_class = MeuClaSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        membro = meu_cla(request.user)
        if membro is None:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(self.get_serializer(membro).data)
