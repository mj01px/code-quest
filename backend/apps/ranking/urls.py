from django.urls import path

from .views import RankingMensalView

app_name = "ranking"

urlpatterns = [
    path("ranking/mensal/", RankingMensalView.as_view(), name="mensal"),
]
