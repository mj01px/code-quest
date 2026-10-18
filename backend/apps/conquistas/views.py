from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .serializers import ConquistaSerializer
from .services import listar_conquistas, marcar_como_vistas


@extend_schema(tags=["conquistas"], responses=ConquistaSerializer(many=True))
class MinhasConquistasView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "eu_progresso"

    def get(self, request):
        itens = listar_conquistas(request.user)
        return Response(ConquistaSerializer(itens, many=True).data)


@extend_schema(tags=["conquistas"], request=None, responses={204: None})
class MarcarConquistasVistasView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "eu_progresso"

    def post(self, request):
        marcar_como_vistas(request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)
