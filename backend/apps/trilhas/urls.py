from django.urls import path

from .views import (
    DesafioDeHojeView,
    DesafiosView,
    ExercicioDetailView,
    TrilhaDetailView,
    TrilhaListView,
)

app_name = "trilhas"

urlpatterns = [
    path("trilhas/", TrilhaListView.as_view(), name="trilha-lista"),
    path("desafios/", DesafiosView.as_view(), name="desafios"),
    path("desafios/hoje/", DesafioDeHojeView.as_view(), name="desafio-de-hoje"),
    path("trilhas/<slug:slug>/", TrilhaDetailView.as_view(), name="trilha-detalhe"),
    path(
        "exercicios/<slug:trilha_slug>/<slug:exercicio_slug>/",
        ExercicioDetailView.as_view(),
        name="exercicio-detalhe",
    ),
]
