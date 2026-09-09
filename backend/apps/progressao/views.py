from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.trilhas.models import Exercicio

from .serializers import ProgressoSerializer, ResultadoXPSerializer
from .services import (
    creditar_exercicio,
    criatura_ativa,
    montar_progresso,
    obter_progresso,
)


@extend_schema(tags=["progressao"], responses=ProgressoSerializer)
class MeuProgressoView(generics.GenericAPIView):
    serializer_class = ProgressoSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        ativa = criatura_ativa(request.user)
        # se o usuario nao tiver criatura ativa, morre aqui silenciosamente
        # retornando 204 pra n quebrar o front
        if ativa is None:
            return Response(status=status.HTTP_204_NO_CONTENT)

        progresso = montar_progresso(obter_progresso(ativa))
        return Response(self.get_serializer(progresso).data)


@extend_schema(tags=["progressao"], responses=ResultadoXPSerializer)
class ConcluirExercicioView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "conclusao"

    def post(self, request, trilha_slug, exercicio_slug):
        exercicio = get_object_or_404(
            Exercicio.objects.publicados(),
            trilha__slug=trilha_slug,
            slug=exercicio_slug,
        )

        resultado = creditar_exercicio(user=request.user, exercicio=exercicio)
        # recarrega o estado atualizado da barra
        montar_progresso(resultado.progresso)

        dados = ResultadoXPSerializer(resultado, context={"request": request})
        return Response(dados.data)