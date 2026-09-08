from django.db.models import Count, Prefetch, Q, QuerySet
from django.http import Http404
from rest_framework import generics
from rest_framework.permissions import AllowAny
from rest_framework.throttling import BaseThrottle, ScopedRateThrottle

from .models import Aula, Exercicio, StatusEditorial, Trilha
from .serializers import (
    ExercicioDetalheSerializer,
    TrilhaDetalheSerializer,
    TrilhaListaSerializer,
)

# Catálogo publicado é leitura pública: AllowAny explícito, escrita devolve 405.
# O escopo "catalogo" liga o limite definido em REST_FRAMEWORK.
#
# `throttle_classes` substitui as classes padrão em vez de somar a elas. Sem
# isso o catálogo também gastaria o balde `anon`, e navegar nas trilhas
# derrubaria as outras rotas públicas do projeto com 429.

PUBLICADO = StatusEditorial.PUBLICADO

ESCOPO = "catalogo"

THROTTLES: list[type[BaseThrottle]] = [ScopedRateThrottle]


class TrilhaListView(generics.ListAPIView[Trilha]):
    serializer_class = TrilhaListaSerializer
    permission_classes = [AllowAny]
    throttle_classes = THROTTLES
    throttle_scope = ESCOPO

    def get_queryset(self) -> QuerySet[Trilha]:
        aula_publicada = Q(aulas__status=PUBLICADO)
        return (
            Trilha.objects.publicados()
            .annotate(
                total_aulas=Count("aulas", filter=aula_publicada, distinct=True),
                total_exercicios=Count(
                    "aulas__exercicios",
                    filter=aula_publicada & Q(aulas__exercicios__status=PUBLICADO),
                    distinct=True,
                ),
            )
            .order_by("ordem", "nome")
        )


class TrilhaDetailView(generics.RetrieveAPIView[Trilha]):
    serializer_class = TrilhaDetalheSerializer
    permission_classes = [AllowAny]
    throttle_classes = THROTTLES
    throttle_scope = ESCOPO
    lookup_field = "slug"

    def get_queryset(self) -> QuerySet[Trilha]:
        exercicios = Prefetch(
            "exercicios",
            queryset=Exercicio.objects.publicados().order_by("ordem", "titulo"),
        )
        aulas = Prefetch(
            "aulas",
            queryset=(
                Aula.objects.publicados()
                .select_related("pre_requisito")
                .prefetch_related(exercicios)
                .order_by("ordem", "titulo")
            ),
        )
        return Trilha.objects.publicados().prefetch_related(aulas)


class ExercicioDetailView(generics.RetrieveAPIView[Exercicio]):
    serializer_class = ExercicioDetalheSerializer
    permission_classes = [AllowAny]
    throttle_classes = THROTTLES
    throttle_scope = ESCOPO

    def get_object(self) -> Exercicio:
        """Devolve o exercício publicado de um par trilha/slug."""
        try:
            return (
                Exercicio.objects.publicados()
                .select_related("aula", "trilha")
                .get(
                    trilha__slug=self.kwargs["trilha_slug"],
                    trilha__status=PUBLICADO,
                    aula__status=PUBLICADO,
                    slug=self.kwargs["exercicio_slug"],
                )
            )
        except Exercicio.DoesNotExist:
            raise Http404("Exercício não encontrado.") from None
