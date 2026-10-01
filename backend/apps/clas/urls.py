from django.urls import path

from .views import (
    ClaDetalheView,
    ClasView,
    EntrarNoClaView,
    LiderancaView,
    MembrosView,
    MembroView,
    MeuClaView,
    SairDoClaView,
)

app_name = "clas"

urlpatterns = [
    path("clas/", ClasView.as_view(), name="clas"),
    path("clas/<str:tag>/", ClaDetalheView.as_view(), name="cla-detalhe"),
    path("clas/<str:tag>/entrar/", EntrarNoClaView.as_view(), name="entrar"),
    path("clas/<str:tag>/membros/", MembrosView.as_view(), name="membros"),
    path(
        "clas/<str:tag>/membros/<uuid:membro_id>/",
        MembroView.as_view(),
        name="membro",
    ),
    path("clas/<str:tag>/lideranca/", LiderancaView.as_view(), name="lideranca"),
    path("eu/cla/", MeuClaView.as_view(), name="meu-cla"),
    path("eu/cla/sair/", SairDoClaView.as_view(), name="sair"),
]
