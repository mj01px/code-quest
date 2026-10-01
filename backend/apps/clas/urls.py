from django.urls import path

from .views import (
    ClaDetalheView,
    ClasView,
    EntrarNoClaView,
    MeuClaView,
    SairDoClaView,
)

app_name = "clas"

urlpatterns = [
    path("clas/", ClasView.as_view(), name="clas"),
    path("clas/<str:tag>/", ClaDetalheView.as_view(), name="cla-detalhe"),
    path("clas/<str:tag>/entrar/", EntrarNoClaView.as_view(), name="entrar"),
    path("eu/cla/", MeuClaView.as_view(), name="meu-cla"),
    path("eu/cla/sair/", SairDoClaView.as_view(), name="sair"),
]
