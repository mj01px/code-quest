from django.urls import path

from .views import ExercicioDetailView, TrilhaDetailView, TrilhaListView

app_name = "trilhas"

urlpatterns = [
    path("trilhas/", TrilhaListView.as_view(), name="trilha-lista"),
    path("trilhas/<slug:slug>/", TrilhaDetailView.as_view(), name="trilha-detalhe"),
    path(
        "exercicios/<slug:trilha_slug>/<slug:exercicio_slug>/",
        ExercicioDetailView.as_view(),
        name="exercicio-detalhe",
    ),
]
