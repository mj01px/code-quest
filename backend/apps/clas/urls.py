from django.urls import path

from .views import (
    AceitarConviteView,
    ClaDetalheView,
    ClasView,
    ConviteView,
    EntrarNoClaView,
    LiderancaView,
    MembrosView,
    MembroView,
    MeuClaView,
    PreviaDoConviteView,
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
    path("clas/<str:tag>/convite/", ConviteView.as_view(), name="convite"),
    path("convites/<str:token>/", PreviaDoConviteView.as_view(), name="previa-convite"),
    path(
        "convites/<str:token>/aceitar/",
        AceitarConviteView.as_view(),
        name="aceitar-convite",
    ),
    path("eu/cla/", MeuClaView.as_view(), name="meu-cla"),
    path("eu/cla/sair/", SairDoClaView.as_view(), name="sair"),
]
