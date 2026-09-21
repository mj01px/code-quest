import base64
import io
import json
import urllib.error
from unittest import mock

from django.test import SimpleTestCase, override_settings

from apps.correcao.judge0 import (
    USER_AGENT,
    ClienteJudge0,
    Judge0Error,
    obter_cliente,
)
from apps.correcao.models import Linguagem


def _b64(texto):
    return base64.b64encode(texto.encode()).decode()


def _resposta(dados):
    corpo = io.BytesIO(json.dumps(dados).encode())
    resposta = mock.MagicMock()
    resposta.__enter__.return_value = corpo
    return resposta


ACEITO = {
    "status": {"id": 3, "description": "Accepted"},
    "stdout": _b64("saída\n"),
    "stderr": None,
    "compile_output": None,
    "message": None,
    "time": "0.017",
    "memory": 4056,
}


class ClienteJudge0Test(SimpleTestCase):
    def _executar(self, cliente, resposta):
        with mock.patch("urllib.request.urlopen", return_value=resposta) as urlopen:
            execucao = cliente.executar(
                codigo="print(1)", stdin="[]", linguagem=Linguagem.PYTHON
            )
        return execucao, urlopen.call_args.args[0]

    def test_rapidapi_usa_os_cabecalhos_dela(self):
        cliente = ClienteJudge0(
            url="https://judge0-ce.p.rapidapi.com", token="k", timeout=5
        )
        _, req = self._executar(cliente, _resposta(ACEITO))

        self.assertEqual(req.get_header("X-rapidapi-key"), "k")
        self.assertEqual(req.get_header("X-rapidapi-host"), "judge0-ce.p.rapidapi.com")
        self.assertIsNone(req.get_header("X-auth-token"))

    def test_outra_instancia_usa_x_auth_token(self):
        cliente = ClienteJudge0(url="https://judge0.exemplo.com", token="k", timeout=5)
        _, req = self._executar(cliente, _resposta(ACEITO))

        self.assertEqual(req.get_header("X-auth-token"), "k")

    def test_pedido_leva_user_agent_wait_e_rede_desligada(self):
        cliente = ClienteJudge0(
            url="https://judge0-ce.p.rapidapi.com", token="k", timeout=5
        )
        _, req = self._executar(cliente, _resposta(ACEITO))
        corpo = json.loads(req.data)

        self.assertEqual(req.get_header("User-agent"), USER_AGENT)
        self.assertIn("wait=true", req.full_url)
        self.assertIn("base64_encoded=true", req.full_url)
        self.assertIs(corpo["enable_network"], False)
        self.assertEqual(corpo["language_id"], 71)
        self.assertEqual(base64.b64decode(corpo["source_code"]).decode(), "print(1)")

    def test_resposta_vem_decodificada(self):
        cliente = ClienteJudge0(url="https://x.rapidapi.com", token="k", timeout=5)
        execucao, _ = self._executar(cliente, _resposta(ACEITO))

        self.assertEqual(execucao.status_id, 3)
        self.assertEqual(execucao.stdout, "saída\n")
        self.assertEqual(execucao.stderr, "")
        self.assertEqual(execucao.tempo, 0.017)
        self.assertEqual(execucao.memoria, 4056)

    def test_erro_http_vira_indisponivel(self):
        cliente = ClienteJudge0(url="https://x.rapidapi.com", token="k", timeout=5)
        erro = urllib.error.HTTPError("u", 429, "limite", {}, io.BytesIO(b""))
        with mock.patch("urllib.request.urlopen", side_effect=erro):
            with self.assertRaises(Judge0Error):
                cliente.executar(codigo="", stdin="", linguagem=Linguagem.PYTHON)

    def test_timeout_vira_indisponivel(self):
        cliente = ClienteJudge0(url="https://x.rapidapi.com", token="k", timeout=5)
        with mock.patch("urllib.request.urlopen", side_effect=TimeoutError()):
            with self.assertRaises(Judge0Error):
                cliente.executar(codigo="", stdin="", linguagem=Linguagem.PYTHON)

    def test_erro_interno_do_judge0_vira_indisponivel(self):
        cliente = ClienteJudge0(url="https://x.rapidapi.com", token="k", timeout=5)
        interno = {**ACEITO, "status": {"id": 13, "description": "Internal Error"}}
        with mock.patch("urllib.request.urlopen", return_value=_resposta(interno)):
            with self.assertRaises(Judge0Error):
                cliente.executar(codigo="", stdin="", linguagem=Linguagem.PYTHON)

    def test_resposta_so_com_token_vira_indisponivel(self):
        cliente = ClienteJudge0(url="https://x.rapidapi.com", token="k", timeout=5)
        with mock.patch(
            "urllib.request.urlopen", return_value=_resposta({"token": "abc"})
        ):
            with self.assertRaises(Judge0Error):
                cliente.executar(codigo="", stdin="", linguagem=Linguagem.PYTHON)


class ObterClienteTest(SimpleTestCase):
    @override_settings(JUDGE0_URL="", JUDGE0_TOKEN="")
    def test_sem_configuracao_fica_indisponivel(self):
        with self.assertRaises(Judge0Error):
            obter_cliente()

    @override_settings(
        JUDGE0_URL="https://x.rapidapi.com", JUDGE0_TOKEN="k", JUDGE0_TIMEOUT=3.0
    )
    def test_com_configuracao_monta_o_cliente(self):
        cliente = obter_cliente()
        self.assertEqual(cliente.url, "https://x.rapidapi.com")
        self.assertEqual(cliente.timeout, 3.0)