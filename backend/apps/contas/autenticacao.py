from drf_spectacular.extensions import OpenApiAuthenticationExtension
from rest_framework import exceptions
from rest_framework.authentication import CSRFCheck
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from .cookies import ACCESS


class CookieJWTAuthentication(JWTAuthentication):

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


class CookieJWTScheme(OpenApiAuthenticationExtension):
    target_class = "apps.contas.autenticacao.CookieJWTAuthentication"
    name = "cookieAuth"

    def get_security_definition(self, auto_schema):
        return {"type": "apiKey", "in": "cookie", "name": ACCESS}
