from django.urls import path

from .views import MarcarConquistasVistasView, MinhasConquistasView

app_name = "conquistas"

urlpatterns = [
    path("eu/conquistas/", MinhasConquistasView.as_view(), name="minhas-conquistas"),
    path(
        "eu/conquistas/vistas/",
        MarcarConquistasVistasView.as_view(),
        name="marcar-vistas",
    ),
]
