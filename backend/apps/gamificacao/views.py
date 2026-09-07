from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Creature, UserCreature
from .serializers import (
    CriaturaSerializer,
    EscolhaInicialSerializer,
    MinhaCriaturaSerializer,
)
from .services import select_starter_creature


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
