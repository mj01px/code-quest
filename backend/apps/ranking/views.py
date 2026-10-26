from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .serializers import RankingMensalSerializer
from .services import ranking_mensal


@extend_schema(tags=["ranking"], responses=RankingMensalSerializer)
class RankingMensalView(APIView):
    """Top 10 do mês corrente e a posição de quem pediu.

    A leitura também fecha o pódio do mês anterior na primeira vez que
    alguém abre o ranking depois da virada.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "ranking"

    def get(self, request):
        return Response(RankingMensalSerializer(ranking_mensal(request.user)).data)

