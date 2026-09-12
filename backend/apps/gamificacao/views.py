from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

# Evoluir depende do nível, que mora em progressão. O import é só de serviço,
# e progressão não importa views daqui: não há ciclo.
from apps.progressao.services import evoluir_criatura

from .models import Creature, UserCreature
from .serializers import (
    AquisicaoCriaturaSerializer,
    BonusXpSerializer,
    CriaturaAtivaSerializer,
    CriaturaSerializer,
    EscolhaInicialSerializer,
    EvolucaoSerializer,
    MinhaCriaturaSerializer,
)
from .services import (
    adquirir_criatura,
    definir_criatura_ativa,
    select_starter_creature,
    xp_bonuses_for_user,
)


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
        # `progresso` entra no select_related porque o serializer lê o nível de
        # cada criatura: sem ele, a listagem faz uma consulta por linha.
        return (
            UserCreature.objects.select_related("creature", "progresso")
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
class AdquirirCriaturaView(generics.GenericAPIView):
    serializer_class = AquisicaoCriaturaSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        entrada = self.get_serializer(data=request.data)
        entrada.is_valid(raise_exception=True)

        posse = adquirir_criatura(
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
            UserCreature.objects.select_related("creature", "progresso")
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


@extend_schema(tags=["criaturas"], responses=EvolucaoSerializer)
class EvoluirCriaturaView(generics.GenericAPIView):
    """Sobe a criatura um estágio, a pedido do aluno.

    Um estágio por chamada, sempre: quem chega ao nível final ainda em filhote
    precisa apertar duas vezes, e vê as duas formas. A resposta diz de onde
    para onde foi, que é o que a animação precisa para escolher os sprites.
    """

    serializer_class = MinhaCriaturaSerializer
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "conclusao"

    def post(self, request, creature_slug):
        posse = get_object_or_404(
            UserCreature.objects.select_related(
                "creature", "progresso"
            ).prefetch_related("creature__stages"),
            user=request.user,
            creature__slug=creature_slug,
        )

        posse, partiu_de, evoluiu = evoluir_criatura(user=request.user, posse=posse)

        contexto = self.get_serializer_context()
        return Response(
            {
                "evoluiu": evoluiu,
                "estagio_anterior": partiu_de,
                "criatura": MinhaCriaturaSerializer(posse, context=contexto).data,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["criaturas"])
class MeusBonusView(generics.ListAPIView):
    """Bônus de XP que valem para as criaturas do usuário autenticado.

    Lista vazia é resposta normal: quem não tem criatura, ou tem uma sem trilha
    correspondente, joga com XP neutro.
    """

    serializer_class = BonusXpSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return xp_bonuses_for_user(user=self.request.user)
