from typing import Any, cast

from django.db import transaction
from django.db.models import QuerySet
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from drf_spectacular.utils import (
    OpenApiParameter,
    PolymorphicProxySerializer,
    extend_schema,
    inline_serializer,
)
from rest_framework import generics, serializers, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.serializers import BaseSerializer
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.auditoria.services import AcaoAuditoria, registrar
from apps.contas.models import User
from apps.core.permissions import HasAnyPerm, HasPerm
from apps.trilhas.models import Aula, Exercicio, Flashcard, StatusEditorial, Trilha
from apps.trilhas.serializers import AulaSerializer, TrilhaDetalheSerializer

from .models import SolicitacaoAutoria
from .serializers import (
    EDICAO,
    EdicaoFlashcardSerializer,
    ExercicioEditorialSerializer,
    ItemEditorialSerializer,
    NovaAulaSerializer,
    NovaTrilhaSerializer,
    NovoExercicioSerializer,
    NovoFlashcardSerializer,
    RejeicaoSerializer,
    SolicitacaoAdminSerializer,
    SolicitacaoAutoriaSerializer,
    SolucaoAutorSerializer,
)
from .services import (
    MODELOS,
    Acao,
    decidir_solicitacao,
    eh_dono_ou_admin,
    excluir_rascunho,
    exercicios_para_autoria,
    itens_no_status,
    rascunho_editavel,
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
    # Na fila de rascunhos o autor só vê o que criou; o admin vê tudo.
    so_do_autor = False
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = ESCOPO_EDITORIAL

    def get(self, request: Request) -> Response:
        # IsAuthenticated já barrou o anônimo.
        usuario = cast(User, request.user)
        autor = usuario if self.so_do_autor and not usuario.is_platform_admin else None
        itens = itens_no_status(self.status_listado, autor)
        return Response(ItemEditorialSerializer(itens, many=True).data)


class RascunhosView(FilaEditorialView):
    status_listado = StatusEditorial.RASCUNHO
    so_do_autor = True
    permission_classes = [IsAuthenticated, HasPerm("trilhas.submit_review")]


class FilaRevisaoView(FilaEditorialView):
    status_listado = StatusEditorial.REVISAO
    permission_classes = [IsAuthenticated, HasPerm("trilhas.review")]


# Serializer e consulta por tipo, sem filtro de status: ler o rascunho antes de
# agir é o motivo da rota. As relações vêm junto, sem N+1 nas aulas da trilha.
# Os serializers são os do catálogo público, que já deixam `solucao_autor` de
# fora; a varredura transversal de serializers garante isso.
DETALHE: dict[str, tuple[type[serializers.ModelSerializer[Any]], QuerySet[Any]]] = {
    "trilhas": (
        TrilhaDetalheSerializer,
        Trilha.objects.prefetch_related(
            "aulas__pre_requisito", "aulas__exercicios", "aulas__flashcards"
        ),
    ),
    "aulas": (
        AulaSerializer,
        Aula.objects.select_related("pre_requisito").prefetch_related(
            "exercicios", "flashcards"
        ),
    ),
    "exercicios": (
        ExercicioEditorialSerializer,
        Exercicio.objects.select_related("aula", "trilha", "especificacao_codigo"),
    ),
}


@extend_schema(
    tags=["autoria"],
    parameters=[
        OpenApiParameter("tipo", str, OpenApiParameter.PATH, enum=list(MODELOS)),
        OpenApiParameter("pk", int, OpenApiParameter.PATH),
    ],
    responses=PolymorphicProxySerializer(
        component_name="DetalheEditorial",
        serializers=[serializer for serializer, _ in DETALHE.values()],
        resource_type_field_name=None,
    ),
)
class DetalheEditorialView(APIView):
    # Quem envia para revisão lê o próprio rascunho; quem revisa lê a fila.
    permission_classes = [
        IsAuthenticated,
        HasAnyPerm("trilhas.submit_review", "trilhas.review"),
    ]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = ESCOPO_EDITORIAL

    def get(self, request: Request, tipo: str, pk: str) -> Response:
        serializer, consulta = DETALHE[tipo]
        conteudo = get_object_or_404(consulta, pk=int(pk))
        usuario = cast(User, request.user)
        # Quem revisa lê a fila inteira; quem só submete lê o que criou.
        if not usuario.has_perm("trilhas.review") and not eh_dono_ou_admin(
            conteudo, usuario
        ):
            raise PermissionDenied("Você só pode abrir o que criou.")
        return Response(serializer(conteudo).data)


# --- Solicitação de autoria ---
# Pedir é de qualquer usuário logado; por isso estas duas não têm HasPerm, e a
# varredura estrutural as registra como só `IsAuthenticated`.


@extend_schema(tags=["autoria"])
class SolicitacoesView(generics.CreateAPIView[SolicitacaoAutoria]):
    serializer_class = SolicitacaoAutoriaSerializer
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = ESCOPO_EDITORIAL

    def perform_create(self, serializer: BaseSerializer[SolicitacaoAutoria]) -> None:
        serializer.save(usuario=self.request.user)


@extend_schema(tags=["autoria"], responses=SolicitacaoAutoriaSerializer)
class MinhaSolicitacaoView(APIView):
    """A solicitação mais recente do usuário, ou 404 se ele nunca pediu."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = ESCOPO_EDITORIAL

    def get(self, request: Request) -> Response:
        solicitacao = (
            SolicitacaoAutoria.objects.filter(usuario=cast(User, request.user))
            .prefetch_related("areas")
            .first()
        )
        if solicitacao is None:
            raise Http404("Nenhuma solicitação de autoria.")
        return Response(SolicitacaoAutoriaSerializer(solicitacao).data)


PODE_CONCEDER = HasPerm("usuarios.grant_author")


@extend_schema(tags=["admin"])
class SolicitacoesPendentesView(generics.ListAPIView[SolicitacaoAutoria]):
    serializer_class = SolicitacaoAdminSerializer
    permission_classes = [IsAuthenticated, PODE_CONCEDER]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = ESCOPO_EDITORIAL
    pagination_class = None

    def get_queryset(self) -> QuerySet[SolicitacaoAutoria]:
        # Mais antiga primeiro: é a ordem de atendimento da fila.
        return (
            SolicitacaoAutoria.objects.filter(status=SolicitacaoAutoria.Status.PENDENTE)
            .select_related("usuario")
            .prefetch_related("areas")
            .order_by("criado_em")
        )


@extend_schema(tags=["admin"], request=None, responses=SolicitacaoAdminSerializer)
class AprovarSolicitacaoView(APIView):
    permission_classes = [IsAuthenticated, PODE_CONCEDER]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = ESCOPO_EDITORIAL

    def post(self, request: Request, pk: int) -> Response:
        solicitacao = decidir_solicitacao(pk, request, aprovar=True)
        return Response(SolicitacaoAdminSerializer(solicitacao).data)


@extend_schema(
    tags=["admin"], request=RejeicaoSerializer, responses=SolicitacaoAdminSerializer
)
class RejeitarSolicitacaoView(APIView):
    permission_classes = [IsAuthenticated, PODE_CONCEDER]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = ESCOPO_EDITORIAL

    def post(self, request: Request, pk: int) -> Response:
        entrada = RejeicaoSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        solicitacao = decidir_solicitacao(
            pk, request, aprovar=False, motivo=entrada.validated_data["motivo"]
        )
        return Response(SolicitacaoAdminSerializer(solicitacao).data)


# --- Criação de conteúdo ---
# Base das três rotas de criação, sem rota própria. O autor sai da request,
# nunca do corpo, e toda criação vai para a auditoria.
@extend_schema(tags=["autoria"])
class CriarConteudoView(generics.CreateAPIView[Any]):
    permission_classes = [IsAuthenticated, HasPerm("trilhas.create")]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = ESCOPO_EDITORIAL
    tipo: str

    def perform_create(self, serializer: BaseSerializer[Any]) -> None:
        conteudo = serializer.save(autor=self.request.user)
        registrar(
            AcaoAuditoria.CONTEUDO_CRIADO,
            request=self.request,
            alvo=conteudo,
            tipo=self.tipo,
        )


class CriarTrilhaView(CriarConteudoView):
    serializer_class = NovaTrilhaSerializer
    tipo = "trilhas"


class CriarAulaView(CriarConteudoView):
    serializer_class = NovaAulaSerializer
    tipo = "aulas"


class CriarExercicioView(CriarConteudoView):
    serializer_class = NovoExercicioSerializer
    tipo = "exercicios"


# --- Edição e exclusão de rascunho ---
# Mesma permissão de criar: quem não cria não tem o que editar. Dono e status
# são cobrados no serviço, com a linha travada.
@extend_schema(
    tags=["autoria"],
    parameters=[
        OpenApiParameter("tipo", str, OpenApiParameter.PATH, enum=list(MODELOS)),
        OpenApiParameter("pk", int, OpenApiParameter.PATH),
    ],
    request=PolymorphicProxySerializer(
        component_name="EdicaoRascunho",
        serializers=list(EDICAO.values()),
        resource_type_field_name=None,
    ),
    responses=PolymorphicProxySerializer(
        component_name="RascunhoEditado",
        serializers=list(EDICAO.values()),
        resource_type_field_name=None,
    ),
)
class RascunhoView(APIView):
    permission_classes = [IsAuthenticated, HasPerm("trilhas.create")]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = ESCOPO_EDITORIAL

    def put(self, request: Request, tipo: str, pk: str) -> Response:
        with transaction.atomic():
            conteudo = rascunho_editavel(
                MODELOS[tipo], int(pk), cast(User, request.user)
            )
            entrada = EDICAO[tipo](conteudo, data=request.data)
            entrada.is_valid(raise_exception=True)
            entrada.save()
            registrar(
                AcaoAuditoria.CONTEUDO_EDITADO,
                request=request,
                alvo=conteudo,
                tipo=tipo,
            )
        return Response(entrada.data)

    @extend_schema(request=None, responses={204: None})
    def delete(self, request: Request, tipo: str, pk: str) -> Response:
        excluir_rascunho(MODELOS[tipo], int(pk), tipo, request)
        return Response(status=status.HTTP_204_NO_CONTENT)


# Mexer num flashcard é editar a aula: a auditoria registra a aula como alvo.
@extend_schema(tags=["autoria"])
class CriarFlashcardView(generics.CreateAPIView[Flashcard]):
    serializer_class = NovoFlashcardSerializer
    permission_classes = [IsAuthenticated, HasPerm("trilhas.create")]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = ESCOPO_EDITORIAL

    def perform_create(self, serializer: BaseSerializer[Flashcard]) -> None:
        # O lock da aula fecha a corrida com um "submeter" que chegue junto.
        with transaction.atomic():
            aula = cast(Aula, serializer.validated_data["aula"])
            rascunho_editavel(Aula, aula.pk, cast(User, self.request.user))
            flashcard = serializer.save()
            registrar(
                AcaoAuditoria.CONTEUDO_EDITADO,
                request=self.request,
                alvo=aula,
                tipo="aulas",
                flashcard=flashcard.pk,
            )


@extend_schema(
    tags=["autoria"],
    request=EdicaoFlashcardSerializer,
    responses=EdicaoFlashcardSerializer,
)
class FlashcardView(APIView):
    permission_classes = [IsAuthenticated, HasPerm("trilhas.create")]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = ESCOPO_EDITORIAL

    def _editavel(self, pk: int) -> tuple[Flashcard, Aula]:
        # Aula travada antes de ler o card: lido antes, um PUT que perdesse a
        # corrida para um DELETE recriaria o card (UPDATE vazio vira INSERT).
        aula_id = (
            Flashcard.objects.filter(pk=pk).values_list("aula_id", flat=True).first()
        )
        if aula_id is None:
            raise Http404("Flashcard não encontrado.")
        aula = rascunho_editavel(Aula, aula_id, cast(User, self.request.user))
        return get_object_or_404(Flashcard, pk=pk, aula=aula), cast(Aula, aula)

    def put(self, request: Request, pk: int) -> Response:
        with transaction.atomic():
            flashcard, aula = self._editavel(pk)
            entrada = EdicaoFlashcardSerializer(
                flashcard, data=request.data, context={"request": request}
            )
            entrada.is_valid(raise_exception=True)
            entrada.save()
            registrar(
                AcaoAuditoria.CONTEUDO_EDITADO,
                request=request,
                alvo=aula,
                tipo="aulas",
                flashcard=pk,
            )
        return Response(entrada.data)

    @extend_schema(request=None, responses={204: None})
    def delete(self, request: Request, pk: int) -> Response:
        with transaction.atomic():
            flashcard, aula = self._editavel(pk)
            flashcard.delete()
            registrar(
                AcaoAuditoria.CONTEUDO_EDITADO,
                request=request,
                alvo=aula,
                tipo="aulas",
                flashcard=pk,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)
