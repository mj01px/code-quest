from django.http import Http404
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.trilhas.models import Exercicio

from .excecoes import CorretorIndisponivel
from .judge0 import Judge0Error
from .serializers import (
    CorrecaoSerializer,
    EnvioDeCodigoSerializer,
    EspecificacaoSerializer,
)
from .services import especificacao_de, executar_codigo


def codigo_enviado(request):
    dados = request.data
    return dados.get("codigo") if isinstance(dados, dict) else None


def _exercicio(trilha_slug, exercicio_slug):
    return get_object_or_404(
        Exercicio.objects.publicados(),
        trilha__slug=trilha_slug,
        slug=exercicio_slug,
    )


@extend_schema(tags=["correcao"], responses=EspecificacaoSerializer)
class EspecificacaoView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "eu_progresso"

    def get(self, request, trilha_slug, exercicio_slug):
        especificacao = especificacao_de(_exercicio(trilha_slug, exercicio_slug))
        if especificacao is None:
            raise Http404
        return Response(
            EspecificacaoSerializer(especificacao, context={"request": request}).data
        )


@extend_schema(
    tags=["correcao"], request=EnvioDeCodigoSerializer, responses=CorrecaoSerializer
)
class ExecutarCodigoView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "execucao"

    def post(self, request, trilha_slug, exercicio_slug):
        exercicio = _exercicio(trilha_slug, exercicio_slug)
        try:
            correcao = executar_codigo(
                user=request.user,
                exercicio=exercicio,
                codigo=codigo_enviado(request),
            )
        except Judge0Error:
            raise CorretorIndisponivel() from None
        return Response(CorrecaoSerializer(correcao).data)
