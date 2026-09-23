import os
import subprocess
import sys

from apps.correcao.judge0 import Execucao, Judge0Error
from apps.correcao.models import CasoDeTeste, EspecificacaoDeCodigo

CODIGO_CERTO = "def dobro(n):\n    return n * 2\n"
CODIGO_ERRADO = "def dobro(n):\n    return n + 2\n"

# (argumentos, esperado, visível)
CASOS_DOBRO = [
    ([2], 4, True),
    ([0], 0, True),
    ([-3], -6, False),
    ([10], 20, False),
]


def criar_especificacao(exercicio, funcao="dobro", casos=CASOS_DOBRO):
    especificacao = EspecificacaoDeCodigo.objects.create(
        exercicio=exercicio,
        funcao=funcao,
        codigo_inicial=f"def {funcao}(n):\n    ...\n",
    )
    for ordem, (argumentos, esperado, visivel) in enumerate(casos, start=1):
        erro = (
            esperado["erro"]
            if isinstance(esperado, dict) and "erro" in esperado
            else ""
        )
        CasoDeTeste.objects.create(
            especificacao=especificacao,
            ordem=ordem,
            argumentos=argumentos,
            esperado=None if erro else esperado,
            erro_esperado=erro,
            visivel=visivel,
        )
    return especificacao


class ExecutorLocal:
    # Roda o programa num python local
    # so existe nos testes
    def __init__(self):
        self.chamadas = 0

    def executar(self, *, codigo, stdin, linguagem):
        self.chamadas += 1
        try:
            processo = subprocess.run(
                [sys.executable, "-c", codigo],
                input=stdin,
                capture_output=True,
                text=True,
                encoding="utf-8",
                env={**os.environ, "PYTHONUTF8": "1"},
                timeout=10,
            )
        except subprocess.TimeoutExpired:
            return Execucao(status_id=5, stdout="", stderr="", tempo=None, memoria=None)
        return Execucao(
            status_id=3 if processo.returncode == 0 else 11,
            stdout=processo.stdout,
            stderr=processo.stderr,
            tempo=0.01,
            memoria=1024,
        )


class ClienteFixo:
    def __init__(self, execucao):
        self.execucao = execucao
        self.chamadas = 0

    def executar(self, *, codigo, stdin, linguagem):
        self.chamadas += 1
        return self.execucao


class ClienteForaDoAr:
    def executar(self, *, codigo, stdin, linguagem):
        raise Judge0Error("teste")
