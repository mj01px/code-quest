from django.utils.dateparse import parse_datetime
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated

from apps.core.permissions import HasPerm

from .models import ACOES_DO_TITULAR, AcaoAuditoria, RegistroDeAuditoria
from .serializers import AtividadeSerializer, RegistroDeAuditoriaSerializer
from .services import registrar


class AuditoriaPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "tamanho"
    max_page_size = 200


class AtividadePagination(PageNumberPagination):
    # Histórico do titular: poucas linhas por página, navegável na interface.
    page_size = 5
    page_size_query_param = "tamanho"
    max_page_size = 50


@extend_schema(
    tags=["auditoria"],
    parameters=[
        OpenApiParameter("acao", str, description="Filtra por código de ação."),
        OpenApiParameter("actor", str, description="Filtra pelo id (UUID) do autor."),
        OpenApiParameter("desde", str, description="Data/hora ISO 8601 (limite inferior)."),
        OpenApiParameter("ate", str, description="Data/hora ISO 8601 (limite superior)."),
    ],
)
class AuditoriaListView(generics.ListAPIView):
    """Consulta à trilha de auditoria. Restrita a quem tem `auditoria.view`.

    A própria consulta é um acesso administrativo e fica registrada.
    """

    serializer_class = RegistroDeAuditoriaSerializer
    permission_classes = [HasPerm("auditoria.view")]
    pagination_class = AuditoriaPagination

    def get_queryset(self):
        consulta = RegistroDeAuditoria.objects.select_related("actor").all()
        params = self.request.query_params

        acao = params.get("acao")
        if acao:
            consulta = consulta.filter(acao=acao)

        actor = params.get("actor")
        if actor:
            consulta = consulta.filter(actor_id=actor)

        desde = parse_datetime(params.get("desde") or "")
        if desde:
            consulta = consulta.filter(created_at__gte=desde)

        ate = parse_datetime(params.get("ate") or "")
        if ate:
            consulta = consulta.filter(created_at__lte=ate)

        return consulta

    def list(self, request, *args, **kwargs):
        registrar(
            AcaoAuditoria.ACESSO_AUDITORIA,
            request=request,
            filtros={
                chave: valor
                for chave, valor in request.query_params.items()
                if chave in {"acao", "actor", "desde", "ate"}
            },
        )
        return super().list(request, *args, **kwargs)


@extend_schema(tags=["auditoria"])
class MinhaAtividadeView(generics.ListAPIView):
    """Histórico do próprio titular — só as ações do usuário autenticado.

    Endpoint distinto do de auditoria (que é de ADMIN): aqui cada um vê apenas
    as suas linhas, filtradas às ações relevantes ao titular. É o direito de
    acesso/transparência da LGPD levado à interface.
    """

    serializer_class = AtividadeSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = AtividadePagination

    def get_queryset(self):
        return RegistroDeAuditoria.objects.filter(
            actor=self.request.user,
            acao__in=ACOES_DO_TITULAR,
        )
