from django.urls import path

from .views import (
    AdminDashboardView,
    AdminLogsView,
    ConcluirExercicioView,
    ConcluirLeituraView,
    ConcluirQuizView,
    IniciarTrilhaView,
    MeuProgressoView,
    MeusExerciciosConcluidosView,
    MinhaSequenciaView,
    MinhasEtapasConcluidasView,
    MinhasTrilhasIniciadasView,
    PassosDaTrilhaView,
    TrilhaAtualView,
)

app_name = "progressao"

urlpatterns = [
    path("eu/progresso/", MeuProgressoView.as_view(), name="meu-progresso"),
    path("admin/dashboard/", AdminDashboardView.as_view(), name="admin-dashboard"),
    path("admin/logs/", AdminLogsView.as_view(), name="admin-logs"),
    path("eu/sequencia/", MinhaSequenciaView.as_view(), name="minha-sequencia"),
    path(
        "eu/trilhas/",
        MinhasTrilhasIniciadasView.as_view(),
        name="minhas-trilhas-iniciadas",
    ),
    path(
        "trilhas/<slug:trilha_slug>/iniciar/",
        IniciarTrilhaView.as_view(),
        name="iniciar-trilha",
    ),
    path(
        "eu/exercicios-concluidos/",
        MeusExerciciosConcluidosView.as_view(),
        name="meus-exercicios-concluidos",
    ),
    path(
        "exercicios/<slug:trilha_slug>/<slug:exercicio_slug>/concluir/",
        ConcluirExercicioView.as_view(),
        name="concluir-exercicio",
    ),
    path(
        "aulas/<slug:trilha_slug>/<slug:aula_slug>/leitura/concluir/",
        ConcluirLeituraView.as_view(),
        name="concluir-leitura",
    ),
    path(
        "aulas/<slug:trilha_slug>/<slug:aula_slug>/quiz/concluir/",
        ConcluirQuizView.as_view(),
        name="concluir-quiz",
    ),
    path(
        "eu/etapas-concluidas/",
        MinhasEtapasConcluidasView.as_view(),
        name="minhas-etapas-concluidas",
    ),
    path(
        "eu/trilhas/<slug:trilha_slug>/passos/",
        PassosDaTrilhaView.as_view(),
        name="passos-da-trilha",
    ),
    path("eu/trilha-atual/", TrilhaAtualView.as_view(), name="trilha-atual"),
]
