"""Troca de e-mail com senha atual (vetor A1).

Uma sessão roubada sozinha não pode trocar o e-mail: o pedido exige a senha
atual e o 1º link vai para o endereço ANTIGO, que autoriza. Depois, um 2º link
vai ao endereço NOVO, que prova a posse; só ele efetiva a troca. Cada link vale
30 minutos, uma vez só. Até a efetivação, login e 2FA seguem no antigo.
"""

import re
import time
from unittest.mock import patch

from django.core import mail
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.auditoria.models import AcaoAuditoria, RegistroDeAuditoria
from apps.contas.models import ConfiguracaoMFA, User
from apps.contas.senha import gerar_token as gerar_token_senha
from apps.contas.troca_email import gerar_token

from .helpers import SENHA_PADRAO, criar_aluno

NOVO = "novo-endereco@example.com"


def _codigo(resposta) -> str:
    return resposta.data["error"]["details"][0]["code"]


def _token_do_ultimo_email() -> str:
    return re.search(r"confirmar-email\?token=(\S+)", mail.outbox[-1].body).group(1)


class TrocaEmailTest(APITestCase):
    def setUp(self):
        self.usuario = criar_aluno("trocador")
        self.antigo = self.usuario.email
        self.client.force_authenticate(self.usuario)

    def _pedir(self, email=NOVO, senha=SENHA_PADRAO):
        return self.client.post(
            reverse("contas:trocar-email"),
            {"email": email, "senha_atual": senha},
            format="json",
        )

    def _confirmar(self, token):
        return self.client.post(
            reverse("contas:confirmar-troca-email"), {"token": token}, format="json"
        )

    def _token_de_posse(self) -> str:
        """Pede a troca e autoriza pelo endereço antigo; devolve o 2º link."""
        self._pedir()
        self._confirmar(_token_do_ultimo_email())
        return _token_do_ultimo_email()

    def _recarregar(self) -> User:
        return User.objects.get(pk=self.usuario.pk)

    def _registros(self, acao):
        return RegistroDeAuditoria.objects.filter(acao=acao, actor=self.usuario)

    # ------------------------------------------------------------- pedido
    def test_pedido_sem_senha_atual_e_recusado(self):
        r = self.client.post(
            reverse("contas:trocar-email"), {"email": NOVO}, format="json"
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self._recarregar().email_pendente, "")

    def test_senha_errada_nao_grava_nem_envia(self):
        r = self._pedir(senha="nao-e-a-senha-9")

        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(_codigo(r), "senha_incorreta")
        usuario = self._recarregar()
        self.assertEqual(usuario.email, self.antigo)
        self.assertEqual(usuario.email_pendente, "")
        self.assertEqual(len(mail.outbox), 0)
        self.assertFalse(self._registros(AcaoAuditoria.TROCA_EMAIL_SOLICITADA).exists())

    @override_settings(LOGIN_MAX_TENTATIVAS=2)
    def test_senha_atual_errada_conta_no_bloqueio_do_login(self):
        # Sem isto, a sessão roubada testaria senhas aqui sem limite de conta.
        self._pedir(senha="nao-e-a-senha-9")
        self._pedir(senha="nao-e-a-senha-9")

        r = self._pedir()  # senha certa, mas a conta já está bloqueada

        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(_codigo(r), "bloqueado")
        self.assertTrue(self._recarregar().esta_bloqueado)
        self.assertEqual(self._recarregar().email_pendente, "")
        self.assertEqual(len(mail.outbox), 0)

    def test_pedido_grava_pendente_e_avisa_so_o_endereco_antigo(self):
        r = self._pedir()

        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertTrue(r.data["email_enviado"])
        usuario = self._recarregar()
        self.assertEqual(usuario.email, self.antigo)
        self.assertEqual(usuario.email_pendente, NOVO)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [self.antigo])
        self.assertIn(NOVO, mail.outbox[0].body)
        self.assertEqual(self._registros(AcaoAuditoria.TROCA_EMAIL_SOLICITADA).count(), 1)

    # ---------------------------------------------------- etapa 1 (antigo)
    def test_autorizar_pelo_antigo_nao_troca_e_manda_link_ao_novo(self):
        self._pedir()

        r = self._confirmar(_token_do_ultimo_email())

        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["etapa"], "posse")
        usuario = self._recarregar()
        self.assertEqual(usuario.email, self.antigo)
        self.assertEqual(usuario.email_pendente, NOVO)
        self.assertEqual(mail.outbox[-1].to, [NOVO])
        self.assertEqual(self._registros(AcaoAuditoria.TROCA_EMAIL_AUTORIZADA).count(), 1)
        self.assertFalse(self._registros(AcaoAuditoria.TROCA_EMAIL_CONFIRMADA).exists())

    # ------------------------------------------------------ etapa 2 (novo)
    def test_confirmar_pelo_novo_efetiva_limpa_pendente_e_audita(self):
        antes = self._recarregar().email_verified_at

        r = self._confirmar(self._token_de_posse())

        self.assertEqual(r.status_code, status.HTTP_200_OK)
        usuario = self._recarregar()
        self.assertEqual(usuario.email, NOVO)
        self.assertEqual(usuario.email_pendente, "")
        self.assertGreater(usuario.email_verified_at, antes)  # posse provada agora
        self.assertEqual(self._registros(AcaoAuditoria.TROCA_EMAIL_CONFIRMADA).count(), 1)

    def test_link_usado_duas_vezes(self):
        self._pedir()
        autorizacao = _token_do_ultimo_email()
        self._confirmar(autorizacao)
        posse = _token_do_ultimo_email()
        self.assertEqual(self._confirmar(posse).status_code, status.HTTP_200_OK)

        for token in (posse, autorizacao):
            r = self._confirmar(token)
            self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(_codigo(r), "link_ja_usado")
        self.assertEqual(self._recarregar().email, NOVO)
        self.assertEqual(self._registros(AcaoAuditoria.TROCA_EMAIL_CONFIRMADA).count(), 1)

    def _confirmar_posse_depois_de(self, minutos):
        token = self._token_de_posse()
        agora = time.time()
        with patch("django.core.signing.time") as relogio:
            relogio.time.return_value = agora + minutos * 60
            return self._confirmar(token)

    def test_link_expirado_depois_de_30_minutos(self):
        r = self._confirmar_posse_depois_de(31)

        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(_codigo(r), "token_invalido")
        self.assertEqual(self._recarregar().email, self.antigo)
        self.assertFalse(self._registros(AcaoAuditoria.TROCA_EMAIL_CONFIRMADA).exists())

    def test_link_vale_dentro_dos_30_minutos(self):
        r = self._confirmar_posse_depois_de(29)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(self._recarregar().email, NOVO)

    # ------------------------------------------------------------ bordas
    def test_novo_pedido_invalida_o_link_anterior(self):
        self._pedir()
        primeiro = _token_do_ultimo_email()
        self._pedir(email="outro-endereco@example.com")

        r = self._confirmar(primeiro)

        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self._recarregar().email, self.antigo)

    def test_token_de_outro_usuario_e_recusado(self):
        # O outro titular tem uma troca pendente; um link de posse emitido para
        # este usuário, com o mesmo endereço, não a efetiva nem mexe em ninguém.
        outro = criar_aluno("vizinho", email_pendente=NOVO)
        self.client.force_authenticate(outro)

        r = self._confirmar(gerar_token(self.usuario, NOVO, posse=True))

        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        outro.refresh_from_db()
        self.assertEqual(outro.email, "vizinho@example.com")
        self.assertEqual(outro.email_pendente, NOVO)
        self.assertEqual(self._recarregar().email, self.antigo)

    def test_redefinir_a_senha_cancela_a_troca_pendente(self):
        posse = self._token_de_posse()
        nova = "Outra-trilha-de-python-9"
        self.client.post(
            reverse("contas:senha-redefinir"),
            {
                "token": gerar_token_senha(self.usuario),
                "senha": nova,
                "senha_confirmacao": nova,
            },
            format="json",
        )

        r = self._confirmar(posse)

        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        usuario = self._recarregar()
        self.assertEqual(usuario.email, self.antigo)
        self.assertEqual(usuario.email_pendente, "")


class TrocaEmailLoginE2faTest(APITestCase):
    """Login e 2FA seguem o `email` efetivo, nunca o pendente."""

    def setUp(self):
        self.usuario = criar_aluno("dono")
        self.antigo = self.usuario.email
        ConfiguracaoMFA.objects.create(
            user=self.usuario, ativo=True, metodo=ConfiguracaoMFA.Metodo.EMAIL
        )

    def _login(self, email):
        return self.client.post(
            reverse("contas:login"), {"email": email, "senha": SENHA_PADRAO}, format="json"
        )

    def _confirmar(self, token):
        return self.client.post(
            reverse("contas:confirmar-troca-email"), {"token": token}, format="json"
        )

    def _pedir_e_autorizar(self) -> str:
        """Pedido + etapa 1. Devolve o link de posse, ainda não usado."""
        self.client.force_authenticate(self.usuario)
        self.client.post(
            reverse("contas:trocar-email"),
            {"email": NOVO, "senha_atual": SENHA_PADRAO},
            format="json",
        )
        self.client.force_authenticate(None)
        self._confirmar(_token_do_ultimo_email())
        return _token_do_ultimo_email()

    def test_durante_a_pendencia_o_2fa_vai_para_o_endereco_antigo(self):
        # Mesmo já autorizada pelo antigo, a troca ainda não aconteceu.
        self._pedir_e_autorizar()
        mail.outbox.clear()

        r = self._login(self.antigo)

        self.assertTrue(r.data["mfa_required"])
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [self.antigo])

    def test_apos_confirmar_login_e_2fa_usam_o_novo_email(self):
        self._confirmar(self._pedir_e_autorizar())
        mail.outbox.clear()

        antigo = self._login(self.antigo)
        novo = self._login(NOVO)

        self.assertEqual(antigo.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(novo.status_code, status.HTTP_200_OK)
        self.assertTrue(novo.data["mfa_required"])
        self.assertEqual(mail.outbox[-1].to, [NOVO])
