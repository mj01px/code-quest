from django.urls import path

from .views import (
    AdquirirCriaturaView,
    CatalogoCriaturasView,
    CriaturaAtivaView,
    MinhasCriaturasView,
)

app_name = "gamificacao"

urlpatterns = [
    path("criaturas/", CatalogoCriaturasView.as_view(), name="catalogo"),
    path("eu/criaturas/", MinhasCriaturasView.as_view(), name="minhas-criaturas"),
    path(
        "eu/criaturas/adquirir/",
        AdquirirCriaturaView.as_view(),
        name="adquirir-criatura",
    ),
    path("eu/criaturas/ativa/", CriaturaAtivaView.as_view(), name="criatura-ativa"),
]
