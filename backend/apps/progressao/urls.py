from django.urls import path

from .views import ConcluirExercicioView, MeuProgressoView

app_name = "progressao"

urlpatterns = [
    path("eu/progresso/", MeuProgressoView.as_view(), name="meu-progresso"),
    path(
        "exercicios/<slug:trilha_slug>/<slug:exercicio_slug>/concluir/",
        ConcluirExercicioView.as_view(),
        name="concluir-exercicio",
    ),
]