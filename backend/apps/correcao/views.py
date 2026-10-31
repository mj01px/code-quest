from django.db.models import Q
from django.http import Http404
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle, UserRateThrottle
from rest_framework.views import APIView

from apps.core.auth import usuario_atual
from apps.core.permissions import HasPerm
from apps.trilhas.models import Exercicio, StatusEditorial

from .excecoes import CorretorIndisponivel
from .judge0 import Judge0Error
from .serializers import (
    CorrecaoSerializer,
    EnvioDeCodigoSerializer,
    EspecificacaoSerializer,
)
from .services import especificacao_de, executar_codigo

# Ler a especificação e submeter código ao Judge0 é capacidade do RBAC, não só
# de login. `concluir/` com correção automática reusa esta mesma guarda.
PODE_SUBMETER_CODIGO = HasPerm("submissoes.create")


# Rajada por usuário de tudo que chama o Judge0. `concluir/` com correção
# automática divide o balde com `executar/`, então o botão Enviar não é mais o
# caminho frouxo. O teto do dia (por usuário e global) conta só chamadas pagas,
# no banco: services._checar_cota_diaria.
# ponytail: LocMemCache é por processo; com N workers a rajada vira N vezes a
# declarada. Redis no CACHES resolve sem mexer aqui; os tetos do dia não sofrem.
class Judge0PorMinuto(UserRateThrottle):
    scope = "judge0"


def codigo_enviado(request: Request) -> object:
    dados = request.data
    return dados.get("codigo") if isinstance(dados, dict) else None


def _exercicio(request: Request, trilha_slug: str, exercicio_slug: str) -> Exercicio:
    # O não publicado só abre para quem o testa na prévia editorial: o autor
    # dele, quem revisa e o admin. Para o resto, 404 como se não existisse.
    usuario = usuario_atual(request)
    visiveis = Exercicio.objects.all()
    if not (usuario.is_platform_admin or usuario.has_perm("trilhas.review")):
        visiveis = visiveis.filter(
            Q(status=StatusEditorial.PUBLICADO) | Q(autor=usuario)
        )
    return get_object_or_404(visiveis, trilha__slug=trilha_slug, slug=exercicio_slug)


@extend_schema(tags=["correcao"], responses=EspecificacaoSerializer)
class EspecificacaoView(APIView):
    permission_classes = [IsAuthenticated, PODE_SUBMETER_CODIGO]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "eu_progresso"

    def get(self, request: Request, trilha_slug: str, exercicio_slug: str) -> Response:
        especificacao = especificacao_de(
            _exercicio(request, trilha_slug, exercicio_slug)
        )
        if especificacao is None:
            raise Http404
        return Response(
            EspecificacaoSerializer(especificacao, context={"request": request}).data
        )


@extend_schema(
    tags=["correcao"], request=EnvioDeCodigoSerializer, responses=CorrecaoSerializer
)
class ExecutarCodigoView(APIView):
    permission_classes = [IsAuthenticated, PODE_SUBMETER_CODIGO]
    throttle_classes = [Judge0PorMinuto]

    def post(
        self, request: Request, trilha_slug: str, exercicio_slug: str
    ) -> Response:
        exercicio = _exercicio(request, trilha_slug, exercicio_slug)
        try:
            correcao = executar_codigo(
                user=usuario_atual(request),
                exercicio=exercicio,
                codigo=codigo_enviado(request),
            )
        except Judge0Error:
            raise CorretorIndisponivel() from None
        return Response(CorrecaoSerializer(correcao).data)
