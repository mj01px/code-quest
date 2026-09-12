from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.trilhas.models import Exercicio

from .serializers import (
    ExercicioConcluidoSerializer,
    ProgressoSerializer,
    ResultadoXPSerializer,
)
from .services import (
    creditar_exercicio,
    criatura_ativa,
    exercicios_concluidos,
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


@extend_schema(
    tags=["progressao"],
    parameters=[
        OpenApiParameter(
            name="trilha",
            type=str,
            description="Restringe a lista às conclusões de uma trilha.",
        )
    ],
)
class MeusExerciciosConcluidosView(generics.ListAPIView):
    """A lista que o front usa para marcar exercício feito.

    Escopo de throttle próprio: é lida em toda navegação, então não pode
    dividir orçamento com `catalogo` nem com `conclusao`.
    """

    serializer_class = ExercicioConcluidoSerializer
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "eu_progresso"

    def get_queryset(self):
        return exercicios_concluidos(
            user=self.request.user,
            trilha_slug=self.request.query_params.get("trilha"),
        )
