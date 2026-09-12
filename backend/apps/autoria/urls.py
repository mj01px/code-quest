from django.urls import path

from .views import SolucaoAutorView

# Namespace isolado de propósito: a varredura estrutural dos testes exige a
# permissão em toda view daqui, coisa que não dá para fazer em `trilhas`, onde
# há views legitimamente públicas no mesmo módulo.

app_name = "autoria"

urlpatterns = [
    path(
        "autoria/exercicios/<slug:trilha_slug>/<slug:exercicio_slug>/solucao/",
        SolucaoAutorView.as_view(),
        name="solucao-autor",
    ),
]
