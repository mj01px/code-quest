"""Regressões da auditoria pré-banca (2026-11-14)."""

import json
import re
import zlib
from pathlib import Path
from typing import Any

from django.contrib.auth.models import AnonymousUser
from django.test import SimpleTestCase, TestCase
from django.urls import get_resolver, resolve
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory
from rest_framework.views import APIView

RAIZ = Path(__file__).resolve().parents[4]

# Toda view que responde sem login. Rota nova que aceite anônimo reprova aqui
# até entrar na lista, ou seja, até alguém decidir que ela é pública.
# Só autenticação e documentos legais. O catálogo (trilhas, exercícios,
# desafios, criaturas) exige login desde 2026-11-16.
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


class ApiNavegavelTest(TestCase):
    def test_html_da_api_so_existe_com_debug(self) -> None:
        # Red team 2026-11-14: com DEBUG=False a API ainda respondia HTML
        # (formulários e docstrings) a quem pedisse `Accept: text/html`.
        from config import settings as modulo

        navegavel = any(
            "Browsable" in r
            for r in modulo.REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"]
        )
        # `modulo.DEBUG` é o valor do ambiente; o runner só zera o do wrapper.
        self.assertEqual(navegavel, modulo.DEBUG)

        resposta = self.client.get("/api/v1/trilhas/", HTTP_ACCEPT="text/html")
        if not modulo.DEBUG:  # a CI roda assim, como a produção
            self.assertEqual(resposta.status_code, 406)


class InfraDeDeployTest(SimpleTestCase):
    """Guardas dos arquivos de deploy (auditoria de infraestrutura 2026-11-14)."""

    def _ler(self, caminho: str) -> str:
        arquivo = RAIZ / caminho
        if not arquivo.exists():  # imagem Docker: só `backend/` é copiado
            self.skipTest(f"{caminho} fora do alcance")
        return arquivo.read_text(encoding="utf-8")

    def test_sondas_de_saude_usam_rota_publica(self) -> None:
        # 2026-11-16: o catálogo passou a exigir login e o healthcheck batia em
        # /trilhas/. Com 401 o backend ficaria "unhealthy" e o compose nunca
        # subiria frontend e nginx. Sonda de saúde só em rota pública.
        sondas = {
            "backend/Dockerfile": r"urlopen\('http://127\.0\.0\.1:8000(/api/[^']*)'",
            ".github/workflows/ci.yml": r"curl -sf http://127\.0\.0\.1:8000(/api/\S*)",
        }
        for arquivo, padrao in sondas.items():
            with self.subTest(arquivo=arquivo):
                caminhos = re.findall(padrao, self._ler(arquivo))
                self.assertTrue(caminhos, f"sonda não encontrada em {arquivo}")
                for caminho in caminhos:
                    view = resolve(caminho).func.view_class  # type: ignore[attr-defined]
                    self.assertIn(view.__name__, PUBLICAS, caminho)

    def test_so_o_nginx_publica_porta_para_a_internet(self) -> None:
        compose = self._ler("docker-compose.yml")
        portas = re.findall(r'^\s*-\s*"([\d.:]+)"\s*$', compose, re.M)

        self.assertIn("127.0.0.1:5432:5432", portas)  # o banco, só no loopback
        for porta in portas:
            if porta not in ("80:80", "443:443"):
                self.assertTrue(porta.startswith("127.0.0.1:"), porta)

    def test_exemplo_de_producao_e_seguro_e_sem_segredo(self) -> None:
        linhas = self._ler(".env.prod.example").splitlines()
        env = dict(
            linha.split("=", 1) for linha in linhas if "=" in linha and linha[0] != "#"
        )

        self.assertEqual(env["DEBUG"], "False")
        self.assertEqual(env["AUTH_COOKIE_SECURE"], "True")
        self.assertEqual(env["API_DOCS"], "False")
        self.assertNotIn("*", env["ALLOWED_HOSTS"])
        for chave, valor in env.items():
            if re.search(r"PASSWORD|SECRET|TOKEN", chave):
                self.assertTrue(valor == "" or valor.startswith("troque"), chave)

    def test_nginx_forca_https_e_nao_repassa_ip_forjado(self) -> None:
        nginx = self._ler("deploy/nginx.conf")

        porta_80 = next(b for b in nginx.split("server {") if "listen 80" in b)
        self.assertIn("return 301 https://", porta_80)
        self.assertNotIn("proxy_pass", porta_80)
        self.assertIn("Strict-Transport-Security", nginx)
        # O throttle por IP confia no último item do X-Forwarded-For.
        self.assertIn("proxy_set_header X-Forwarded-For $remote_addr;", nginx)
        self.assertNotIn("$proxy_add_x_forwarded_for", nginx)


class ByteNulNaUrlTest(TestCase):
    def test_nul_no_caminho_ou_na_query_vira_400(self) -> None:
        # Red team 2026-11-14: o PostgreSQL recusa NUL em texto e estas rotas
        # devolviam 500 a qualquer usuário logado.
        from apps.contas.tests.helpers import criar_aluno

        self.client.force_login(criar_aluno("fuzz"))
        for url in (
            "/api/v1/clas/?busca=%00",
            "/api/v1/eu/exercicios-concluidos/?trilha=%00",
            "/api/v1/clas/%00/",
            "/api/v1/perfil/%00/",
        ):
            with self.subTest(url=url):
                resposta = self.client.get(url)
                self.assertEqual(resposta.status_code, 400)
                self.assertEqual(
                    resposta.json()["error"]["code"], "requisicao_invalida"
                )


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
