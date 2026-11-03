from drf_spectacular.utils import extend_schema
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.core.auth import usuario_atual

from .serializers import PerfilPublicoSerializer, RankingMensalSerializer
from .services import perfil_publico, ranking_mensal


@extend_schema(tags=["ranking"], responses=RankingMensalSerializer)
class RankingMensalView(APIView):
    """Top 10 do mês corrente e a posição de quem pediu.

    A leitura também fecha o pódio do mês anterior na primeira vez que
    alguém abre o ranking depois da virada.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "ranking"

    def get(self, request: Request) -> Response:
        dados = ranking_mensal(usuario_atual(request))
        return Response(RankingMensalSerializer(dados).data)



@extend_schema(tags=["ranking"], responses=PerfilPublicoSerializer)
class PerfilPublicoView(APIView):
    """RF37: perfil público de um aluno, aberto a partir do ranking e dos clãs."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "ranking"

    def get(self, request: Request, nickname: str) -> Response:
        perfil = perfil_publico(nickname)
        if perfil is None:
            raise NotFound("Perfil não encontrado.")
        return Response(PerfilPublicoSerializer(perfil).data)
