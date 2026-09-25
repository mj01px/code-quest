"""O segundo fator (MFA): ativar por app (TOTP) e por e-mail, o login em dois
passos e os códigos de recuperação.

Amarra o fluxo que o frontend percorre: ativar em Configurações, deslogar e
entrar de novo passando pelo 2º fator. Se alguém quebrar uma rota, o formato do
desafio ou a regra de "a senha sozinha não basta", é aqui que aparece.
"""

import re

import pyotp
from django.core import mail
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.auditoria.models import AcaoAuditoria, RegistroDeAuditoria
from apps.contas import mfa
from apps.contas.cookies import ACCESS
from apps.contas.models import CodigoRecuperacaoMFA, ConfiguracaoMFA

from .helpers import SENHA_PADRAO, criar_aluno


class MfaSetupTest(APITestCase):
    def setUp(self):
        self.usuario = criar_aluno("dobrado")
        self.login = reverse("contas:login")
        self.client.post(
            self.login,
            {"email": self.usuario.email, "senha": SENHA_PADRAO},
            format="json",
        )

    # ------------------------------------------------------------------ app
    def _ativar_app(self):
        r = self.client.post(
            reverse("contas:mfa-iniciar"), {"metodo": "APP"}, format="json"
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        secret = r.data["secret"]
        codigo = pyotp.TOTP(secret).now()
        confirmar = self.client.post(
            reverse("contas:mfa-confirmar"), {"codigo": codigo}, format="json"
        )
        return secret, confirmar

    def test_iniciar_app_devolve_qr_e_segredo_sem_ativar(self):
        r = self.client.post(
            reverse("contas:mfa-iniciar"), {"metodo": "APP"}, format="json"
        )

        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn("secret", r.data)
        self.assertTrue(r.data["qr"].startswith("data:image/svg+xml;base64,"))
        self.assertTrue(r.data["otpauth"].startswith("otpauth://totp/"))
        # Ainda não está ativo: só preparado.
        self.assertFalse(ConfiguracaoMFA.objects.get(user=self.usuario).ativo)

    def test_confirmar_app_ativa_e_devolve_codigos_de_recuperacao(self):
        _, confirmar = self._ativar_app()

        self.assertEqual(confirmar.status_code, status.HTTP_200_OK)
        codigos = confirmar.data["codigos_recuperacao"]
        self.assertEqual(len(codigos), mfa.QTD_RECUPERACAO)
        self.assertTrue(ConfiguracaoMFA.objects.get(user=self.usuario).ativo)
        self.assertEqual(
            CodigoRecuperacaoMFA.objects.filter(user=self.usuario).count(),
            mfa.QTD_RECUPERACAO,
        )
        self.assertTrue(
            RegistroDeAuditoria.objects.filter(
                actor=self.usuario, acao=AcaoAuditoria.MFA_ATIVADO
            ).exists()
        )

    def test_confirmar_com_codigo_errado_nao_ativa(self):
        self.client.post(
            reverse("contas:mfa-iniciar"), {"metodo": "APP"}, format="json"
        )
        r = self.client.post(
            reverse("contas:mfa-confirmar"), {"codigo": "000000"}, format="json"
        )

        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data["error"]["details"][0]["code"], "codigo_invalido")
        self.assertFalse(ConfiguracaoMFA.objects.get(user=self.usuario).ativo)

    def test_status_reflete_o_metodo_ativo(self):
        self._ativar_app()
        r = self.client.get(reverse("contas:mfa"))

        self.assertEqual(r.data, {"ativo": True, "metodo": "APP"})

    # --------------------------------------------------------------- e-mail
    def test_iniciar_email_dispara_codigo(self):
        r = self.client.post(
            reverse("contas:mfa-iniciar"), {"metodo": "EMAIL"}, format="json"
        )

        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertTrue(r.data["email_enviado"])
        self.assertEqual(len(mail.outbox), 1)

    # ------------------------------------------------------------ desativar
    def test_desativar_exige_codigo_valido(self):
        secret, _ = self._ativar_app()

        errado = self.client.post(
            reverse("contas:mfa-desativar"), {"codigo": "000000"}, format="json"
        )
        self.assertEqual(errado.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(ConfiguracaoMFA.objects.get(user=self.usuario).ativo)

        certo = self.client.post(
            reverse("contas:mfa-desativar"),
            {"codigo": pyotp.TOTP(secret).now()},
            format="json",
        )
        self.assertEqual(certo.status_code, status.HTTP_204_NO_CONTENT)
        config = ConfiguracaoMFA.objects.get(user=self.usuario)
        self.assertFalse(config.ativo)
        self.assertEqual(
            CodigoRecuperacaoMFA.objects.filter(user=self.usuario).count(), 0
        )
        self.assertTrue(
            RegistroDeAuditoria.objects.filter(
                actor=self.usuario, acao=AcaoAuditoria.MFA_DESATIVADO
            ).exists()
        )

    # ------------------------------------------- desativar por e-mail (envio)
    def _ativar_email(self):
        self.client.post(
            reverse("contas:mfa-iniciar"), {"metodo": "EMAIL"}, format="json"
        )
        config = ConfiguracaoMFA.objects.get(user=self.usuario)
        codigo = mfa.preparar_desafio_email(config)
        self.client.post(
            reverse("contas:mfa-confirmar"), {"codigo": codigo}, format="json"
        )

    def test_desativar_iniciar_por_email_envia_codigo_que_funciona(self):
        self._ativar_email()
        mail.outbox.clear()

        iniciar = self.client.post(reverse("contas:mfa-desativar-iniciar"))
        self.assertEqual(iniciar.status_code, status.HTTP_200_OK)
        self.assertTrue(iniciar.data["email_enviado"])
        self.assertEqual(len(mail.outbox), 1)

        codigo = re.search(r"\b\d{6}\b", mail.outbox[-1].body).group()
        desativar = self.client.post(
            reverse("contas:mfa-desativar"), {"codigo": codigo}, format="json"
        )
        self.assertEqual(desativar.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(ConfiguracaoMFA.objects.get(user=self.usuario).ativo)

    def test_desativar_iniciar_com_app_nao_envia_email(self):
        self._ativar_app()
        mail.outbox.clear()

        r = self.client.post(reverse("contas:mfa-desativar-iniciar"))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertFalse(r.data["email_enviado"])
        self.assertEqual(len(mail.outbox), 0)

    def test_desativar_iniciar_exige_mfa_ativo(self):
        r = self.client.post(reverse("contas:mfa-desativar-iniciar"))
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)


class LoginComMfaTest(APITestCase):
    def setUp(self):
        self.usuario = criar_aluno("guardiao")
        self.login = reverse("contas:login")
        self.login_mfa = reverse("contas:login-mfa")

    def _credenciais(self):
        return {"email": self.usuario.email, "senha": SENHA_PADRAO}

    def _ativar_totp(self) -> str:
        secret = mfa.gerar_secret()
        ConfiguracaoMFA.objects.create(
            user=self.usuario,
            ativo=True,
            metodo=ConfiguracaoMFA.Metodo.APP,
            totp_secret=secret,
        )
        return secret

    def test_login_com_mfa_nao_libera_sessao_no_passo_1(self):
        self._ativar_totp()

        r = self.client.post(self.login, self._credenciais(), format="json")

        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertTrue(r.data["mfa_required"])
        self.assertEqual(r.data["metodo"], "APP")
        self.assertIn("mfa_token", r.data)
        self.assertNotIn(ACCESS, r.cookies)
        # A senha só passou; o login ainda não se completou.
        self.assertFalse(
            RegistroDeAuditoria.objects.filter(
                actor=self.usuario, acao=AcaoAuditoria.LOGIN_OK
            ).exists()
        )

    def test_login_mfa_aceita_totp_e_emite_sessao(self):
        secret = self._ativar_totp()
        r1 = self.client.post(self.login, self._credenciais(), format="json")

        r2 = self.client.post(
            self.login_mfa,
            {"mfa_token": r1.data["mfa_token"], "codigo": pyotp.TOTP(secret).now()},
            format="json",
        )

        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        self.assertEqual(r2.data["usuario"]["nickname"], "guardiao")
        self.assertTrue(r2.cookies[ACCESS].value)
        self.assertTrue(
            RegistroDeAuditoria.objects.filter(
                actor=self.usuario, acao=AcaoAuditoria.LOGIN_OK
            ).exists()
        )

    def test_login_mfa_recusa_codigo_errado(self):
        self._ativar_totp()
        r1 = self.client.post(self.login, self._credenciais(), format="json")

        r2 = self.client.post(
            self.login_mfa,
            {"mfa_token": r1.data["mfa_token"], "codigo": "000000"},
            format="json",
        )

        self.assertEqual(r2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r2.data["error"]["details"][0]["code"], "codigo_invalido")
        self.assertNotIn(ACCESS, r2.cookies)

    def test_login_mfa_recusa_token_invalido(self):
        self._ativar_totp()

        r = self.client.post(
            self.login_mfa,
            {"mfa_token": "forjado", "codigo": "000000"},
            format="json",
        )

        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data["error"]["details"][0]["code"], "mfa_token_invalido")

    def test_codigo_de_recuperacao_serve_uma_vez_no_login(self):
        self._ativar_totp()
        codigos = mfa.gerar_codigos_recuperacao(self.usuario)

        r1 = self.client.post(self.login, self._credenciais(), format="json")
        usado = self.client.post(
            self.login_mfa,
            {"mfa_token": r1.data["mfa_token"], "codigo": codigos[0]},
            format="json",
        )
        self.assertEqual(usado.status_code, status.HTTP_200_OK)

        # O mesmo código não vale de novo.
        r2 = self.client.post(self.login, self._credenciais(), format="json")
        de_novo = self.client.post(
            self.login_mfa,
            {"mfa_token": r2.data["mfa_token"], "codigo": codigos[0]},
            format="json",
        )
        self.assertEqual(de_novo.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_por_email_dispara_codigo_e_aceita(self):
        config = ConfiguracaoMFA.objects.create(
            user=self.usuario,
            ativo=True,
            metodo=ConfiguracaoMFA.Metodo.EMAIL,
        )
        r1 = self.client.post(self.login, self._credenciais(), format="json")

        self.assertTrue(r1.data["mfa_required"])
        self.assertEqual(len(mail.outbox), 1)

        # Recupera o código atual do desafio direto do modelo, gerando um novo.
        codigo = mfa.preparar_desafio_email(config)
        r2 = self.client.post(
            self.login_mfa,
            {"mfa_token": r1.data["mfa_token"], "codigo": codigo},
            format="json",
        )

        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        self.assertTrue(r2.cookies[ACCESS].value)
