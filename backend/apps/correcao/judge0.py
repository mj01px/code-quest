import base64
import json
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass

from django.conf import settings

from .models import Linguagem

LINGUAGENS = {
    Linguagem.PYTHON: 71,
}

# Parametros para ser enviados em toda requisicao garantindo que o codigo respeite a limitacao do plano que escolhemos
# Alem de desligar a internet ai, pro usuario nao usar isso para realizar alguma tentativa maliciosa
LIMITES = {
    "cpu_time_limit": 2,
    "wall_time_limit": 5,
    "memory_limit": 128000,
    "max_file_size": 64,
    "enable_network": False,
}

# Se isso nao for inserido, o cloudfare ta barrando todas requisocoes
USER_AGENT = "code-quest/1.0"

STATUS_EM_ANDAMENTO = {1, 2}
STATUS_ACEITO = 3
STATUS_TEMPO_ESGOTADO = 5
STATUS_ERRO_INTERNO = 13


class Judge0Error(Exception):
    pass


@dataclass(frozen=True)
class Execucao:
    status_id: int
    stdout: str
    stderr: str
    tempo: float | None
    memoria: int | None


def _b64(texto):
    return base64.b64encode(texto.encode()).decode()


def _de_b64(texto):
    if not texto:
        return ""
    try:
        return base64.b64decode(texto).decode(errors="replace")
    except ValueError:
        return texto


class ClienteJudge0:
    def __init__(self, *, url, token, timeout):
        self.url = url.rstrip("/")
        self.timeout = timeout
        if "rapidapi.com" in self.url:
            self.cabecalhos = {
                "X-RapidAPI-Key": token,
                "X-RapidAPI-Host": urllib.parse.urlparse(self.url).netloc,
            }
        else:
            self.cabecalhos = {"X-Auth-Token": token}

    def executar(self, *, codigo, stdin, linguagem):
        corpo = {
            "language_id": LINGUAGENS[linguagem],
            "source_code": _b64(codigo),
            "stdin": _b64(stdin),
            **LIMITES,
        }
        req = urllib.request.Request(
            f"{self.url}/submissions/?base64_encoded=true&wait=true",
            method="POST",
            data=json.dumps(corpo).encode(),
            headers={
                "Content-Type": "application/json",
                "User-Agent": USER_AGENT,
                **self.cabecalhos,
            },
        )

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resposta:
                dados = json.loads(resposta.read())
        except urllib.error.HTTPError as erro:
            raise Judge0Error(f"HTTP {erro.code}") from erro
        except (urllib.error.URLError, TimeoutError, ValueError) as erro:
            raise Judge0Error(str(erro)) from erro

        status = dados.get("status") or {}
        status_id = status.get("id")

        if status_id is None or status_id in STATUS_EM_ANDAMENTO:
            raise Judge0Error("resposta sem resultado")
        if status_id == STATUS_ERRO_INTERNO:
            raise Judge0Error(_de_b64(dados.get("message")) or "erro interno")

        tempo = dados.get("time")
        return Execucao(
            status_id=status_id,
            stdout=_de_b64(dados.get("stdout")),
            stderr=_de_b64(dados.get("stderr")) or _de_b64(dados.get("compile_output")),
            tempo=float(tempo) if tempo is not None else None,
            memoria=dados.get("memory"),
        )


def obter_cliente():
    if not settings.JUDGE0_URL or not settings.JUDGE0_TOKEN:
        raise Judge0Error("JUDGE0_URL ou JUDGE0_TOKEN não configurado")
    return ClienteJudge0(
        url=settings.JUDGE0_URL,
        token=settings.JUDGE0_TOKEN,
        timeout=settings.JUDGE0_TIMEOUT,
    )
