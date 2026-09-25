from django.urls import path

from .views_rbac import (
    NivelDetailView,
    NivelListCreateView,
    PermissaoListView,
    UsuarioListView,
    UsuarioNivelView,
)

from .views import (
    AceitarConsentimentosView,
    ConfirmarExclusaoView,
    ConfirmarTrocaEmailView,
    ConsentimentosView,
    CsrfView,
    DocumentosLegaisView,
    EuView,
    ExportarDadosView,
    LoginMfaView,
    LoginView,
    MfaConfirmarView,
    MfaDesativarIniciarView,
    MfaDesativarView,
    MfaIniciarView,
    MfaStatusView,
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
    path("auth/login/mfa/", LoginMfaView.as_view(), name="login-mfa"),
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
    path("auth/eu/mfa/", MfaStatusView.as_view(), name="mfa"),
    path("auth/eu/mfa/iniciar/", MfaIniciarView.as_view(), name="mfa-iniciar"),
    path("auth/eu/mfa/confirmar/", MfaConfirmarView.as_view(), name="mfa-confirmar"),
    path(
        "auth/eu/mfa/desativar/iniciar/",
        MfaDesativarIniciarView.as_view(),
        name="mfa-desativar-iniciar",
    ),
    path("auth/eu/mfa/desativar/", MfaDesativarView.as_view(), name="mfa-desativar"),
    # --- Painel de RBAC (admin) ---
    path(
        "auth/admin/permissoes/",
        PermissaoListView.as_view(),
        name="admin-permissoes",
    ),
    path("auth/admin/niveis/", NivelListCreateView.as_view(), name="admin-niveis"),
    path(
        "auth/admin/niveis/<uuid:pk>/",
        NivelDetailView.as_view(),
        name="admin-nivel",
    ),
    path("auth/admin/usuarios/", UsuarioListView.as_view(), name="admin-usuarios"),
    path(
        "auth/admin/usuarios/<uuid:pk>/nivel/",
        UsuarioNivelView.as_view(),
        name="admin-usuario-nivel",
    ),
    path("auth/eu/email/", TrocarEmailView.as_view(), name="trocar-email"),
    path(
        "auth/eu/email/confirmar/",
        ConfirmarTrocaEmailView.as_view(),
        name="confirmar-troca-email",
    ),
]
