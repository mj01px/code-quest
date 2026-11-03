from django.urls import path

from .views import PerfilPublicoView, RankingMensalView

app_name = "ranking"

urlpatterns = [
    path("ranking/mensal/", RankingMensalView.as_view(), name="mensal"),
    path("perfil/<str:nickname>/", PerfilPublicoView.as_view(), name="perfil"),
]
