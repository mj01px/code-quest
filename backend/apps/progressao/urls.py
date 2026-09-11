from django.urls import path

from .views import (
    ConcluirExercicioView,
    MeuProgressoView,
    MeusExerciciosConcluidosView,
)

app_name = "progressao"

urlpatterns = [
    path("eu/progresso/", MeuProgressoView.as_view(), name="meu-progresso"),
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
