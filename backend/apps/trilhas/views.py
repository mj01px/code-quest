from django.db.models import Count, F, Prefetch, Q, QuerySet
from django.http import Http404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import BaseThrottle
from rest_framework.views import APIView

from .desafios import desafios_publicados, rodizio
from .models import Aula, Exercicio, StatusEditorial, Trilha
from .serializers import (
    DesafioDoDiaSerializer,
    DesafioSerializer,
    ExercicioDetalheSerializer,
    TrilhaDetalheSerializer,
    TrilhaListaSerializer,
)
from .throttling import CatalogoThrottle

# O catálogo exige login: só quem tem conta lê trilhas, exercícios e desafios.
# As telas renderizam no servidor do Next com o cookie do próprio aluno, então
# não existe leitura anônima legítima. Escrita aqui devolve 405; o RBAC de
# `trilhas.view` continua no frontend, e as CAPACIDADES (iniciar trilha,
# concluir exercício) são barradas no backend.
# O escopo "catalogo" liga o limite definido em REST_FRAMEWORK.
#
# `throttle_classes` substitui as classes padrão em vez de somar a elas. Sem
# isso o catálogo também gastaria o balde `anon`, e navegar nas trilhas
# derrubaria as outras rotas públicas do projeto com 429.

PUBLICADO = StatusEditorial.PUBLICADO

ESCOPO = "catalogo"

DIAS_NA_AGENDA = 5

THROTTLES: list[type[BaseThrottle]] = [CatalogoThrottle]


class TrilhaListView(generics.ListAPIView[Trilha]):
    serializer_class = TrilhaListaSerializer
    permission_classes = [IsAuthenticated]
    throttle_classes = THROTTLES
    throttle_scope = ESCOPO

    def get_queryset(self) -> QuerySet[Trilha]:
        aula_publicada = Q(aulas__status=PUBLICADO)
        return (
            Trilha.objects.publicados()
            .filter(desafio=False)
            .annotate(
                total_aulas=Count("aulas", filter=aula_publicada, distinct=True),
                total_exercicios=Count(
                    "aulas__exercicios",
                    filter=aula_publicada & Q(aulas__exercicios__status=PUBLICADO),
                    distinct=True,
                ),
                total_leituras=Count(
                    "aulas",
                    filter=aula_publicada & ~Q(aulas__conteudo=""),
                    distinct=True,
                ),
                total_quizzes=Count(
                    "aulas",
                    filter=aula_publicada & Q(aulas__questoes__isnull=False),
                    distinct=True,
                ),
            )
            .annotate(total_etapas=F("total_leituras") + F("total_quizzes"))
            .order_by("ordem", "nome")
        )


class TrilhaDetailView(generics.RetrieveAPIView[Trilha]):
    serializer_class = TrilhaDetalheSerializer
    permission_classes = [IsAuthenticated]
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
                .prefetch_related(exercicios, "flashcards", "questoes")
                .order_by("ordem", "titulo")
            ),
        )
        return Trilha.objects.publicados().select_related("autor").prefetch_related(aulas)


class ExercicioDetailView(generics.RetrieveAPIView[Exercicio]):
    serializer_class = ExercicioDetalheSerializer
    permission_classes = [IsAuthenticated]
    throttle_classes = THROTTLES
    throttle_scope = ESCOPO

    def get_object(self) -> Exercicio:
        """Devolve o exercício publicado de um par trilha/slug."""
        try:
            return (
                Exercicio.objects.publicados()
                .select_related("aula", "trilha")
                .prefetch_related("alternativas")
                .get(
                    trilha__slug=self.kwargs["trilha_slug"],
                    trilha__status=PUBLICADO,
                    aula__status=PUBLICADO,
                    slug=self.kwargs["exercicio_slug"],
                )
            )
        except Exercicio.DoesNotExist:
            raise Http404("Exercício não encontrado.") from None


class DesafiosView(generics.ListAPIView[Exercicio]):
    serializer_class = DesafioSerializer
    permission_classes = [IsAuthenticated]
    throttle_classes = THROTTLES
    throttle_scope = ESCOPO
    pagination_class = None

    def get_queryset(self) -> QuerySet[Exercicio]:
        return desafios_publicados()


@extend_schema(responses=DesafioDoDiaSerializer)
class DesafioDeHojeView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = THROTTLES
    throttle_scope = ESCOPO

    def get(self, request: Request) -> Response:
        dia = timezone.localdate()
        agenda = rodizio(dia, DIAS_NA_AGENDA)
        dados: dict[str, object] = {
            "dia": dia,
            "desafio": agenda[0][1] if agenda else None,
            "proximos": [
                {"dia": data, "slug": desafio.slug, "titulo": desafio.titulo}
                for data, desafio in agenda[1:]
            ],
        }
        return Response(DesafioDoDiaSerializer(dados).data)

