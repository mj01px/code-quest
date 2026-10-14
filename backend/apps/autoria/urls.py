from django.urls import path, re_path

from .views import (
    AprovarView,
    DevolverView,
    PublicarView,
    SolucaoAutorView,
    SubmeterRevisaoView,
)

# Namespace isolado de propósito: a varredura estrutural dos testes exige a
# permissão em toda view daqui, coisa que não dá para fazer em `trilhas`, onde
# há views legitimamente públicas no mesmo módulo.

app_name = "autoria"

# `tipo` restrito na própria rota: valor fora da lista nem chega à view (404).
CONTEUDO = r"^autoria/(?P<tipo>trilhas|aulas|exercicios)/(?P<pk>[0-9]+)"

urlpatterns = [
    path(
        "autoria/exercicios/<slug:trilha_slug>/<slug:exercicio_slug>/solucao/",
        SolucaoAutorView.as_view(),
        name="solucao-autor",
    ),
    re_path(
        rf"{CONTEUDO}/submeter/$", SubmeterRevisaoView.as_view(), name="submeter"
    ),
    re_path(rf"{CONTEUDO}/aprovar/$", AprovarView.as_view(), name="aprovar"),
    re_path(rf"{CONTEUDO}/devolver/$", DevolverView.as_view(), name="devolver"),
    re_path(rf"{CONTEUDO}/publicar/$", PublicarView.as_view(), name="publicar"),
]
