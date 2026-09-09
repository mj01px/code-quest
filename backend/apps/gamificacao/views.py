from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Creature, UserCreature
from .serializers import (
    CriaturaAtivaSerializer,
    CriaturaSerializer,
    EscolhaInicialSerializer,
    MinhaCriaturaSerializer,
)
from .services import definir_criatura_ativa, select_starter_creature


@extend_schema(tags=["criaturas"])
class CatalogoCriaturasView(generics.ListAPIView):
    serializer_class = CriaturaSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        return Creature.objects.prefetch_related("stages").order_by(
            "display_order", "slug"
        )


@extend_schema(tags=["criaturas"])
class MinhasCriaturasView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_serializer_class(self):
        if self.request.method == "POST":
            return EscolhaInicialSerializer
        return MinhaCriaturaSerializer

    def get_queryset(self):
        return (
            UserCreature.objects.select_related("creature")
            .prefetch_related("creature__stages")
            .filter(user=self.request.user)
        )

    def create(self, request, *args, **kwargs):
        entrada = EscolhaInicialSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)

        posse = select_starter_creature(
            user=request.user,
            creature_slug=entrada.validated_data["criatura"],
        )
        saida = MinhaCriaturaSerializer(posse, context=self.get_serializer_context())
        return Response(saida.data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["criaturas"], responses=MinhaCriaturaSerializer)
class CriaturaAtivaView(generics.GenericAPIView):
    serializer_class = CriaturaAtivaSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        ativa = (
            UserCreature.objects.select_related("creature")
            .prefetch_related("creature__stages")
            .filter(user=request.user, is_active=True)
            .first()
        )
        if ativa is None:
            return Response(status=status.HTTP_204_NO_CONTENT)

        saida = MinhaCriaturaSerializer(ativa, context=self.get_serializer_context())
        return Response(saida.data, status=status.HTTP_200_OK)

    def put(self, request, *args, **kwargs):
        entrada = self.get_serializer(data=request.data)
        entrada.is_valid(raise_exception=True)

        posse = definir_criatura_ativa(
            user=request.user,
            creature_slug=entrada.validated_data["criatura"],
        )
        saida = MinhaCriaturaSerializer(posse, context=self.get_serializer_context())
        return Response(saida.data, status=status.HTTP_200_OK)
