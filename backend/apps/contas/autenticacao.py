from django.conf import settings
from drf_spectacular.extensions import OpenApiAuthenticationExtension
from rest_framework import exceptions
from rest_framework.authentication import CSRFCheck
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from .cookies import ACCESS
from .documentos import status_consentimentos

ROTAS_SEM_ACEITE = frozenset(
    {
        "contas:sair",
        "contas:renovar",
        "contas:consentimentos",
        "contas:consentimentos-aceitar",
        "contas:exportar",
        "contas:excluir",
        "contas:excluir-confirmar",
        "auditoria:minha-atividade",
    }
)
ROTAS_SO_LEITURA_SEM_ACEITE = frozenset({"contas:eu"})
LEITURA = frozenset({"GET", "HEAD", "OPTIONS"})


class ConsentimentoPendente(exceptions.PermissionDenied):
    default_detail = (
        "Os Termos de Uso ou a Política de Privacidade foram atualizados. "
        "Aceite a nova versão para continuar usando a CodeQuest."
    )
    default_code = "consentimento_pendente"


def _view_publica(request) -> bool:
    view = (getattr(request, "parser_context", None) or {}).get("view")
    return any(
        isinstance(permissao, type) and issubclass(permissao, AllowAny)
        for permissao in getattr(view, "permission_classes", ())
    )


def _rota_liberada(request) -> bool:
    if _view_publica(request):
        return True
    rota = getattr(request, "resolver_match", None)
    if rota is None:
        return False
    if rota.view_name in ROTAS_SO_LEITURA_SEM_ACEITE:
        return request.method in LEITURA
    return rota.view_name in ROTAS_SEM_ACEITE


def exigir_consentimento(request, user) -> None:
    if not settings.CONSENTIMENTO_OBRIGATORIO or user is None:
        return
    if _rota_liberada(request):
        return
    if any(situacao["pendente"] for situacao in status_consentimentos(user)):
        raise ConsentimentoPendente()


class ExigeConsentimentoMixin:
    def authenticate(self, request):
        resultado = super().authenticate(request)
        if resultado is not None:
            exigir_consentimento(request, resultado[0])
        return resultado


class HeaderJWTAuthentication(ExigeConsentimentoMixin, JWTAuthentication):
    pass


class _CookieJWTAuthentication(JWTAuthentication):

    def authenticate(self, request):
        bruto = request.COOKIES.get(ACCESS)
        if not bruto:
            return None

        try:
            token = self.get_validated_token(bruto)
        except (InvalidToken, TokenError):
            return None

        self._exigir_csrf(request)
        return self.get_user(token), token

    def _exigir_csrf(self, request):
        def sem_resposta(_):
            return None

        checagem = CSRFCheck(sem_resposta)
        checagem.process_request(request)
        motivo = checagem.process_view(request, None, (), {})
        if motivo:
            raise exceptions.PermissionDenied(
                "Falha na verificação CSRF. Recarregue a página e tente de novo."
            )


class CookieJWTAuthentication(ExigeConsentimentoMixin, _CookieJWTAuthentication):
    pass


class CookieJWTScheme(OpenApiAuthenticationExtension):
    target_class = "apps.contas.autenticacao.CookieJWTAuthentication"
    name = "cookieAuth"

    def get_security_definition(self, auto_schema):
        return {"type": "apiKey", "in": "cookie", "name": ACCESS}
