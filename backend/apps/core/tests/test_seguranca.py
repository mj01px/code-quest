"""Regressões da auditoria pré-banca (2026-11-14)."""

import json
import zlib
from typing import Any

from django.contrib.auth.models import AnonymousUser
from django.test import SimpleTestCase, TestCase
from django.urls import get_resolver
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory
from rest_framework.views import APIView

# Toda view que responde sem login. Rota nova que aceite anônimo reprova aqui
# até entrar na lista, ou seja, até alguém decidir que ela é pública.
PUBLICAS = {
    "CsrfView",
    "DocumentosLegaisView",
    "RegistrarView",
    "VerificarEmailView",
    "ReenviarVerificacaoView",
    "SenhaEsquecidaView",
    "RedefinirSenhaView",
    "LoginView",
    "LoginMfaView",
    "RenovarView",
    "SairView",
    "ConfirmarExclusaoView",
    "ConfirmarTrocaEmailView",
    "CatalogoCriaturasView",
    "TrilhaListView",
    "DesafiosView",
    "DesafioDeHojeView",
    "TrilhaDetailView",
    "ExercicioDetailView",
}


def _views(no: Any) -> list[type[APIView]]:
    filhos = getattr(no, "url_patterns", None)
    if filhos is not None:
        return [v for filho in filhos for v in _views(filho)]
    cls = getattr(no.callback, "cls", None)
    # Swagger e schema só existem com API_DOCS=True (desligado em produção).
    if cls is None or cls.__module__.startswith("drf_spectacular"):
        return []
    return [cls]


class RotasPublicasTest(SimpleTestCase):
    def test_so_a_lista_conhecida_responde_sem_login(self) -> None:
        pedido = Request(APIRequestFactory().get("/"))
        pedido.user = AnonymousUser()
        abertas = set()
        for cls in _views(get_resolver()):
            view = cls()
            view.request = pedido
            if all(p.has_permission(pedido, view) for p in view.get_permissions()):
                abertas.add(cls.__name__)

        self.assertEqual(abertas, PUBLICAS)


class CharsetDoCorpoTest(TestCase):
    def test_codec_de_compressao_no_charset_e_recusado(self) -> None:
        # GHSA-3547-9m27-7rxg (DRF < 3.18.2): `charset=zlib_codec` fazia o
        # parser inflar o corpo em memória, sem login e além do limite de upload.
        corpo = zlib.compress(json.dumps({"email": "a@b.co", "password": "x"}).encode())

        resposta = self.client.generic(
            "POST",
            "/api/v1/auth/login/",
            data=corpo,
            content_type="application/json; charset=zlib_codec",
        )

        self.assertEqual(resposta.status_code, 400)
        self.assertEqual(resposta.json()["error"]["code"], "parse_error")
