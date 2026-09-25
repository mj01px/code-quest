from django.urls import path

from .views import EspecificacaoView, ExecutarCodigoView

app_name = "correcao"

urlpatterns = [
    path(
        "exercicios/<slug:trilha_slug>/<slug:exercicio_slug>/codigo/",
        EspecificacaoView.as_view(),
        name="especificacao",
    ),
    path(
        "exercicios/<slug:trilha_slug>/<slug:exercicio_slug>/executar/",
        ExecutarCodigoView.as_view(),
        name="executar",
    ),
]
