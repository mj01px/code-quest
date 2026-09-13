from django.urls import path

from .views import (
    ConcluirExercicioView,
    IniciarTrilhaView,
    MeuProgressoView,
    MeusExerciciosConcluidosView,
    MinhasTrilhasIniciadasView,
)

app_name = "progressao"

urlpatterns = [
    path("eu/progresso/", MeuProgressoView.as_view(), name="meu-progresso"),
    path(
        "eu/trilhas/",
        MinhasTrilhasIniciadasView.as_view(),
        name="minhas-trilhas-iniciadas",
    ),
    path(
        "trilhas/<slug:trilha_slug>/iniciar/",
        IniciarTrilhaView.as_view(),
        name="iniciar-trilha",
    ),
    path(
        "eu/exercicios-concluidos/",
        MeusExerciciosConcluidosView.as_view(),
        name="meus-exercicios-concluidos",
    ),
    path(
        "exercicios/<slug:trilha_slug>/<slug:exercicio_slug>/concluir/",
        ConcluirExercicioView.as_view(),
        name="concluir-exercicio",
    ),
]
