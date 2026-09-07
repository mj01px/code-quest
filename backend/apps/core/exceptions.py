from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import exceptions
from rest_framework.exceptions import ErrorDetail
from rest_framework.views import exception_handler as drf_exception_handler


def _converter(exc):
    if not isinstance(exc, DjangoValidationError):
        return exc

    if hasattr(exc, "error_dict"):
        detalhe = {
            campo: [
                ErrorDetail(mensagem, code=erro.code or "invalido")
                for erro in erros
                for mensagem in erro.messages
            ]
            for campo, erros in exc.error_dict.items()
        }
    else:
        detalhe = [
            ErrorDetail(mensagem, code=getattr(exc, "code", None) or "invalido")
            for mensagem in exc.messages
        ]
    return exceptions.ValidationError(detalhe)


def _achatar(dados, prefixo=""):
    achatados = []
    if isinstance(dados, dict):
        for campo, erros in dados.items():
            caminho = f"{prefixo}.{campo}" if prefixo else str(campo)
            achatados.extend(_achatar(erros, caminho))
    elif isinstance(dados, list):
        for erro in dados:
            achatados.extend(_achatar(erro, prefixo))
    else:
        achatados.append(
            {
                "field": prefixo or None,
                "code": getattr(dados, "code", "invalido"),
                "message": str(dados),
            }
        )
    return achatados


def manipulador(exc, context):
    resposta = drf_exception_handler(_converter(exc), context)
    if resposta is None:
        return None

    dados = resposta.data
    if isinstance(dados, dict) and set(dados) == {"detail"}:
        detalhe = dados["detail"]
        resposta.data = {
            "error": {
                "code": getattr(detalhe, "code", "erro"),
                "message": str(detalhe),
                "details": [],
            }
        }
        return resposta

    detalhes = _achatar(dados)
    resposta.data = {
        "error": {
            "code": "validacao",
            "message": detalhes[0]["message"] if detalhes else "Requisição inválida.",
            "details": detalhes,
        }
    }
    return resposta
