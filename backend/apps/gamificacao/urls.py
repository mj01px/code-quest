from django.urls import path

from .views import (
    CatalogoCriaturasView,
    CriaturaAtivaView,
    MeusBonusView,
    MinhasCriaturasView,
)

app_name = "gamificacao"

urlpatterns = [
    path("criaturas/", CatalogoCriaturasView.as_view(), name="catalogo"),
    path("eu/criaturas/", MinhasCriaturasView.as_view(), name="minhas-criaturas"),
    path("eu/criaturas/ativa/", CriaturaAtivaView.as_view(), name="criatura-ativa"),
    path("eu/bonus/", MeusBonusView.as_view(), name="meus-bonus"),
]
