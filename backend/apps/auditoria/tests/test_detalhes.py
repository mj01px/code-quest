"""`detalhes` traduz o metadata dos eventos críticos para o painel do admin."""

import pyotp
from django.conf import settings
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.auditoria.models import AcaoAuditoria, RegistroDeAuditoria
from apps.contas import mfa
from apps.contas.models import ConfiguracaoMFA
from apps.contas.tests.helpers import criar_aluno


def registro(acao, **metadata):
    return RegistroDeAuditoria(acao=acao, metadata=metadata)


class DetalhesTest(TestCase):
    def test_falha_de_login_diz_o_motivo(self):
        self.assertEqual(
            registro(AcaoAuditoria.LOGIN_FALHA, motivo="credenciais_invalidas").detalhes,
            "Senha incorreta",
        )
        self.assertEqual(
            registro(
                AcaoAuditoria.LOGIN_FALHA,
                motivo="credenciais_invalidas",
                email_desconhecido=True,
            ).detalhes,
            "E-mail não cadastrado",
        )
        self.assertEqual(
            registro(AcaoAuditoria.LOGIN_FALHA, motivo="bloqueado").detalhes,
            "Conta bloqueada por excesso de tentativas",
        )

    def test_nivel_atribuido_diz_de_onde_para_onde(self):
        r = registro(
            AcaoAuditoria.NIVEL_ATRIBUIDO,
            nivel_anterior={"id": "1", "nome": "Aluno"},
            nivel_novo=None,
        )
        self.assertEqual(r.detalhes, "Nível alterado de Aluno para sem nível")

    def test_anonimizacao_diz_quem_pediu(self):
        self.assertEqual(
            registro(AcaoAuditoria.CONTA_ANONIMIZADA, por_admin=True, com_2fa=True).detalhes,
            "Anonimizada pelo painel do admin, com confirmação em duas etapas",
        )
        self.assertEqual(
            registro(AcaoAuditoria.CONTA_ANONIMIZADA).detalhes,
            "Anonimizada a pedido do titular",
        )

    def test_acao_sem_traducao_fica_vazia(self):
        self.assertEqual(registro(AcaoAuditoria.LOGOUT, qualquer="x").detalhes, "")


class FalhaDoSegundoFatorTest(TestCase):
    def test_codigo_2fa_errado_no_login_fica_registrado(self):
        aluno = criar_aluno()
        segredo = pyotp.random_base32()
        ConfiguracaoMFA.objects.create(
            user=aluno, ativo=True, metodo=ConfiguracaoMFA.Metodo.APP, totp_secret=segredo
        )
        certo = pyotp.TOTP(segredo).now()

        r = APIClient().post(
            reverse("contas:login-mfa"),
            {
                "mfa_token": mfa.token_login(aluno),
                "codigo": f"{(int(certo) + 500000) % 1000000:06d}",
            },
            format="json",
        )

        self.assertEqual(r.status_code, 400)
        falha = RegistroDeAuditoria.objects.get(
            acao=AcaoAuditoria.LOGIN_FALHA, actor=aluno
        )
        self.assertEqual(
            falha.detalhes, "Código de verificação em duas etapas incorreto"
        )

    def test_erros_seguidos_no_2fa_bloqueiam_como_a_senha(self):
        aluno = criar_aluno()
        segredo = pyotp.random_base32()
        ConfiguracaoMFA.objects.create(
            user=aluno, ativo=True, metodo=ConfiguracaoMFA.Metodo.APP, totp_secret=segredo
        )
        certo = pyotp.TOTP(segredo).now()
        errado = f"{(int(certo) + 500000) % 1000000:06d}"
        cliente = APIClient()
        url = reverse("contas:login-mfa")

        for _ in range(settings.LOGIN_MAX_TENTATIVAS):
            cliente.post(url, {"mfa_token": mfa.token_login(aluno), "codigo": errado}, format="json")
        # Bloqueado, nem o código certo entra até o prazo passar.
        r = cliente.post(url, {"mfa_token": mfa.token_login(aluno), "codigo": certo}, format="json")

        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.data["error"]["details"][0]["code"], "bloqueado")
