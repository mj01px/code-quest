from django.urls import path

from .views import (
    AceitarConsentimentosView,
    ConfirmarExclusaoView,
    ConfirmarTrocaEmailView,
    ConsentimentosView,
    CsrfView,
    DocumentosLegaisView,
    EuView,
    ExportarDadosView,
    LoginView,
    RedefinirSenhaView,
    ReenviarVerificacaoView,
    RegistrarView,
    RenovarView,
    SairView,
    SenhaEsquecidaView,
    SolicitarExclusaoView,
    TrocarEmailView,
    VerificarEmailView,
)

app_name = "contas"

urlpatterns = [
    path("auth/csrf/", CsrfView.as_view(), name="csrf"),
    path("auth/documentos/", DocumentosLegaisView.as_view(), name="documentos"),
    path("auth/registrar/", RegistrarView.as_view(), name="registrar"),
    path("auth/verificar/", VerificarEmailView.as_view(), name="verificar"),
    path(
        "auth/verificar/reenviar/",
        ReenviarVerificacaoView.as_view(),
        name="reenviar-verificacao",
    ),
    path("auth/senha/esquecida/", SenhaEsquecidaView.as_view(), name="senha-esquecida"),
    path("auth/senha/redefinir/", RedefinirSenhaView.as_view(), name="senha-redefinir"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/renovar/", RenovarView.as_view(), name="renovar"),
    path("auth/sair/", SairView.as_view(), name="sair"),
    path("auth/eu/", EuView.as_view(), name="eu"),
    path("auth/eu/excluir/", SolicitarExclusaoView.as_view(), name="excluir"),
    path(
        "auth/eu/excluir/confirmar/",
        ConfirmarExclusaoView.as_view(),
        name="excluir-confirmar",
    ),
    path("auth/eu/exportar/", ExportarDadosView.as_view(), name="exportar"),
    path(
        "auth/eu/consentimentos/",
        ConsentimentosView.as_view(),
        name="consentimentos",
    ),
    path(
        "auth/eu/consentimentos/aceitar/",
        AceitarConsentimentosView.as_view(),
        name="consentimentos-aceitar",
    ),
    path("auth/eu/email/", TrocarEmailView.as_view(), name="trocar-email"),
    path(
        "auth/eu/email/confirmar/",
        ConfirmarTrocaEmailView.as_view(),
        name="confirmar-troca-email",
    ),
]
