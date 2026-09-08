from django.conf import settings

ACCESS = "cq_access"
REFRESH = "cq_refresh"

# Sinalizador sem credencial nenhuma. Existe so para a interface saber que
# provavelmente ha sessao, ja que os cookies de verdade sao httponly e o
# JavaScript nao os enxerga. Nao autentica nada.
SESSAO = "cq_sessao"

CAMINHO_REFRESH = "/api/v1/auth/"


def _segundos(delta) -> int:
    return int(delta.total_seconds())


def gravar_sessao(resposta, access: str, refresh: str | None = None):
    resposta.set_cookie(
        ACCESS,
        access,
        max_age=_segundos(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"]),
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite="Lax",
        path="/",
    )

    resposta.set_cookie(
        SESSAO,
        "1",
        max_age=_segundos(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"]),
        httponly=False,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite="Lax",
        path="/",
    )

    if refresh is not None:
        resposta.set_cookie(
            REFRESH,
            refresh,
            max_age=_segundos(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"]),
            httponly=True,
            secure=settings.AUTH_COOKIE_SECURE,
            samesite="Lax",
            path=CAMINHO_REFRESH,
        )

    return resposta


def limpar_sessao(resposta):
    resposta.delete_cookie(ACCESS, path="/", samesite="Lax")
    resposta.delete_cookie(REFRESH, path=CAMINHO_REFRESH, samesite="Lax")
    resposta.delete_cookie(SESSAO, path="/", samesite="Lax")
    return resposta
