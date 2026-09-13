from django.db.models import QuerySet
from django.http import Http404
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from drf_spectacular.utils import extend_schema
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle

from apps.core.permissions import HasPerm
from apps.trilhas.models import Exercicio

from .serializers import SolucaoAutorSerializer
from .services import exercicios_para_autoria

# Escopo próprio: conteúdo sensível não divide balde com `catalogo` nem com
# `eu_progresso`, senão navegar no catálogo afrouxa o limite daqui.
ESCOPO = "autoria"

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
