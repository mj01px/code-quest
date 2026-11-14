from collections.abc import Callable

from django.http import HttpRequest, HttpResponse, JsonResponse


class RecusarNul:
    """Responde 400 a byte NUL na URL (caminho ou query string).

    O PostgreSQL recusa NUL em texto: `?busca=%00` ou `/perfil/%00/` chegavam à
    consulta e estouravam como 500. No corpo o DRF já barra (CharField).
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        if "\x00" in request.path or "%00" in request.META.get("QUERY_STRING", ""):
            return JsonResponse(
                {
                    "error": {
                        "code": "requisicao_invalida",
                        "message": "Requisição inválida.",
                        "details": [],
                    }
                },
                status=400,
            )
        return self.get_response(request)
