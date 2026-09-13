from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.trilhas.models import Exercicio, Trilha

from .models import TrilhaIniciada
from .serializers import (
    ExercicioConcluidoSerializer,
    ProgressoSerializer,
    ResultadoXPSerializer,
    TrilhaIniciadaSerializer,
)
from .services import (
    creditar_exercicio,
    criatura_ativa,
    exercicios_concluidos,
    iniciar_trilha,
    montar_progresso,
    obter_progresso,
    trilhas_iniciadas,
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


@extend_schema(tags=["progressao"], responses=TrilhaIniciadaSerializer)
class IniciarTrilhaView(APIView):
    """Marca a trilha como iniciada para o aluno.

    Idempotente: 201 na primeira vez, 200 nas seguintes, e o corpo é o mesmo
    nos dois casos. Repetir o clique não é erro, e devolver 409 obrigaria a
    tela a tratar como falha algo que está certo.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "conclusao"

    def post(self, request, trilha_slug):
        trilha = get_object_or_404(Trilha.objects.publicados(), slug=trilha_slug)

        criada = iniciar_trilha(user=request.user, trilha=trilha)
        marca = TrilhaIniciada.objects.get(user=request.user, trilha=trilha)

        return Response(
            TrilhaIniciadaSerializer(marca).data,
            status=status.HTTP_201_CREATED if criada else status.HTTP_200_OK,
        )


@extend_schema(
    tags=["progressao"],
    responses={200: serializers.ListSerializer(child=serializers.SlugField())},
)
class MinhasTrilhasIniciadasView(APIView):
    """Os slugs das trilhas em que o aluno já entrou.

    Lista enxuta de propósito: a tela só precisa saber se a trilha está na
    lista, e o catálogo com nome e contagem já vem da rota pública.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "eu_progresso"

    def get(self, request):
        return Response(trilhas_iniciadas(user=request.user))


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
