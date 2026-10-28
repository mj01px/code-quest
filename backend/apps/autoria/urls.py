from django.urls import path, re_path

from .views import (
    AprovadosView,
    AprovarSolicitacaoView,
    AprovarView,
    CriarAulaView,
    CriarExercicioView,
    CriarFlashcardView,
    CriarQuestaoView,
    CriarTrilhaView,
    DetalheEditorialView,
    DevolverView,
    FilaRevisaoView,
    FlashcardView,
    MinhaSolicitacaoView,
    PublicarView,
    RascunhosView,
    RascunhoView,
    RejeitarSolicitacaoView,
    SolicitacoesPendentesView,
    SolicitacoesView,
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
    path("autoria/solicitacoes/", SolicitacoesView.as_view(), name="solicitacoes"),
    path(
        "autoria/solicitacoes/minha/",
        MinhaSolicitacaoView.as_view(),
        name="minha-solicitacao",
    ),
    path(
        "admin/solicitacoes/",
        SolicitacoesPendentesView.as_view(),
        name="admin-solicitacoes",
    ),
    path(
        "admin/solicitacoes/<int:pk>/aprovar/",
        AprovarSolicitacaoView.as_view(),
        name="admin-solicitacao-aprovar",
    ),
    path(
        "admin/solicitacoes/<int:pk>/rejeitar/",
        RejeitarSolicitacaoView.as_view(),
        name="admin-solicitacao-rejeitar",
    ),
    path("autoria/trilhas/", CriarTrilhaView.as_view(), name="criar-trilha"),
    path("autoria/aulas/", CriarAulaView.as_view(), name="criar-aula"),
    path("autoria/exercicios/", CriarExercicioView.as_view(), name="criar-exercicio"),
    path("autoria/flashcards/", CriarFlashcardView.as_view(), name="criar-flashcard"),
    path("autoria/flashcards/<int:pk>/", FlashcardView.as_view(), name="flashcard"),
    path("autoria/questoes/", CriarQuestaoView.as_view(), name="criar-questao"),
    path("autoria/rascunhos/", RascunhosView.as_view(), name="rascunhos"),
    path("autoria/aprovados/", AprovadosView.as_view(), name="aprovados"),
    path("autoria/fila-revisao/", FilaRevisaoView.as_view(), name="fila-revisao"),
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
    re_path(rf"{CONTEUDO}/detalhe/$", DetalheEditorialView.as_view(), name="detalhe"),
    # PUT edita e DELETE exclui, os dois só em rascunho.
    re_path(rf"{CONTEUDO}/$", RascunhoView.as_view(), name="rascunho"),
]
