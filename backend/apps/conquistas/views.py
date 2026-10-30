from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.core.auth import usuario_atual

from .serializers import ConquistaSerializer
from .services import listar_conquistas, marcar_como_vistas


@extend_schema(tags=["conquistas"], responses=ConquistaSerializer(many=True))
class MinhasConquistasView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "eu_progresso"

    def get(self, request: Request) -> Response:
        itens = listar_conquistas(usuario_atual(request))
        return Response(ConquistaSerializer(itens, many=True).data)


@extend_schema(tags=["conquistas"], request=None, responses={204: None})
class MarcarConquistasVistasView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "eu_progresso"

    def post(self, request: Request) -> Response:
        marcar_como_vistas(usuario_atual(request))
        return Response(status=status.HTTP_204_NO_CONTENT)
