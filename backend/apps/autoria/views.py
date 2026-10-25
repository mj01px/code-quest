from django.db.models import QuerySet
from django.http import Http404
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer
from rest_framework import generics, serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.core.permissions import HasPerm
from apps.trilhas.models import Exercicio, StatusEditorial

from .serializers import ItemEditorialSerializer, SolucaoAutorSerializer
from .services import (
    MODELOS,
    Acao,
    exercicios_para_autoria,
    itens_no_status,
    transicionar,
)

# Escopo próprio: conteúdo sensível não divide balde com `catalogo` nem com
# `eu_progresso`, senão navegar no catálogo afrouxa o limite daqui.
ESCOPO = "autoria"
# O fluxo editorial tem balde próprio também: abrir gabaritos durante a revisão
# gasta `autoria` e não pode travar submeter, aprovar, devolver nem publicar.
ESCOPO_EDITORIAL = "editorial"

PODE_VER_SOLUCAO = HasPerm("trilhas.view_solution")


# A autenticação primária é por cookie. Sem `no-store`, um proxy no caminho
# pode reter o gabarito e servi-lo ao próximo que pedir.
@method_decorator(cache_control(private=True, no_store=True), name="dispatch")
@extend_schema(tags=["autoria"], responses=SolucaoAutorSerializer)
class SolucaoAutorView(generics.RetrieveAPIView[Exercicio]):
    serializer_class = SolucaoAutorSerializer
    permission_classes = [IsAuthenticated, PODE_VER_SOLUCAO]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = ESCOPO
    lookup_url_kwarg = "exercicio_slug"

    def get_queryset(self) -> QuerySet[Exercicio]:
        return exercicios_para_autoria().filter(trilha__slug=self.kwargs["trilha_slug"])

    def get_object(self) -> Exercicio:
        """Devolve o exercício do par trilha/slug, publicado ou não."""
        try:
            exercicio = self.get_queryset().get(slug=self.kwargs["exercicio_slug"])
        except Exercicio.DoesNotExist:
            raise Http404("Exercício não encontrado.") from None

        # Sem esta chamada, uma permissão de objeto acrescentada aqui no futuro
        # nasceria inerte, e o teste estrutural continuaria verde.
        self.check_object_permissions(self.request, exercicio)
        return exercicio


# Base das quatro ações do fluxo editorial, sem rota própria. Comentário e não
# docstring: docstring de view vira a descrição pública no OpenAPI.
# Cada subclasse fixa ação e permissão como atributo de classe, e não por
# `as_view(...)`: a varredura estrutural lê `get_permissions()` da classe.
# A resposta é um dict de dois escalares, sem serializer em `serializers.py`:
# `status` é campo proibido na varredura de serializers públicos.
@extend_schema(
    tags=["autoria"],
    request=None,
    parameters=[
        # Sem isto o schema herda a regex da rota sem parênteses, e a
        # alternância vira `^trilhas` OU `aulas` OU `exercicios$`.
        OpenApiParameter("tipo", str, OpenApiParameter.PATH, enum=list(MODELOS)),
        OpenApiParameter("pk", int, OpenApiParameter.PATH),
    ],
    responses=inline_serializer(
        "TransicaoEditorial",
        {
            "id": serializers.IntegerField(),
            "status_editorial": serializers.ChoiceField(StatusEditorial.choices),
        },
    ),
)
class TransicaoEditorialView(APIView):
    acao: Acao
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = ESCOPO_EDITORIAL

    def post(self, request: Request, tipo: str, pk: str) -> Response:
        # `re_path` entrega texto; a regex da rota já garante só dígitos.
        conteudo = transicionar(MODELOS[tipo], int(pk), self.acao, request)
        return Response({"id": conteudo.pk, "status_editorial": conteudo.status})


class SubmeterRevisaoView(TransicaoEditorialView):
    acao = "submeter"
    permission_classes = [IsAuthenticated, HasPerm("trilhas.submit_review")]


class AprovarView(TransicaoEditorialView):
    acao = "aprovar"
    permission_classes = [IsAuthenticated, HasPerm("trilhas.review")]


class DevolverView(TransicaoEditorialView):
    acao = "devolver"
    permission_classes = [IsAuthenticated, HasPerm("trilhas.review")]


class PublicarView(TransicaoEditorialView):
    acao = "publicar"
    permission_classes = [IsAuthenticated, HasPerm("trilhas.publish")]


# Base das duas filas, sem rota própria. Mesmo balde das ações: a tela lista e
# age na mesma visita, e `autoria` fica reservado ao gabarito.
@extend_schema(tags=["autoria"], responses=ItemEditorialSerializer(many=True))
class FilaEditorialView(APIView):
    status_listado: StatusEditorial
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = ESCOPO_EDITORIAL

    def get(self, request: Request) -> Response:
        itens = itens_no_status(self.status_listado)
        return Response(ItemEditorialSerializer(itens, many=True).data)


class RascunhosView(FilaEditorialView):
    status_listado = StatusEditorial.RASCUNHO
    permission_classes = [IsAuthenticated, HasPerm("trilhas.submit_review")]


class FilaRevisaoView(FilaEditorialView):
    status_listado = StatusEditorial.REVISAO
    permission_classes = [IsAuthenticated, HasPerm("trilhas.review")]
