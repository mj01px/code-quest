"""Comando criar_admin: o admin inicial do deploy, lido do ambiente."""

import os
from io import StringIO
from unittest import mock

from django.core.management import CommandError, call_command
from django.test import TestCase

from apps.contas.models import User

from .helpers import SENHA_PADRAO

AMBIENTE = {
    "ADMIN_EMAIL": "admin@codequest.dev",
    "ADMIN_NICKNAME": "mauro_admin",
    "ADMIN_PASSWORD": SENHA_PADRAO,
}


def rodar(**ambiente: str) -> str:
    saida = StringIO()
    with mock.patch.dict(os.environ, {**AMBIENTE, **ambiente}):
        call_command("criar_admin", stdout=saida)
    return saida.getvalue()


class CriarAdminTest(TestCase):
    def test_cria_admin_verificado_no_nivel_que_libera_o_painel(self):
        rodar()
        admin = User.objects.get(email="admin@codequest.dev")
        self.assertEqual(admin.role, User.Role.ADMIN)
        self.assertTrue(admin.nivel_de_acesso.acesso_admin)
        self.assertIsNotNone(admin.email_verified_at)
        self.assertTrue(admin.check_password(SENHA_PADRAO))

    def test_rodar_de_novo_nao_duplica_nem_troca_a_senha(self):
        rodar()
        saida = rodar(ADMIN_PASSWORD="Outra-senha-forte-9")
        self.assertIn("ja existe", saida)
        self.assertEqual(User.objects.filter(email="admin@codequest.dev").count(), 1)
        admin = User.objects.get(email="admin@codequest.dev")
        self.assertTrue(admin.check_password(SENHA_PADRAO))

    def test_senha_fraca_e_recusada(self):
        with self.assertRaisesMessage(CommandError, "Senha fraca"):
            rodar(ADMIN_PASSWORD="123")
        self.assertFalse(User.objects.exists())

    def test_sem_variaveis_falha(self):
        with self.assertRaises(CommandError):
            rodar(ADMIN_EMAIL="")
