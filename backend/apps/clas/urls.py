from django.urls import path

from .views import ClaDetalheView, ClasView, MeuClaView

app_name = "clas"

urlpatterns = [
    path("clas/", ClasView.as_view(), name="clas"),
    path("clas/<str:tag>/", ClaDetalheView.as_view(), name="cla-detalhe"),
    path("eu/cla/", MeuClaView.as_view(), name="meu-cla"),
]
