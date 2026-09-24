"""Exclusão de conta é definitiva e por anonimização.

O fluxo é: o titular pede a exclusão, confirma pelo link do e-mail com a senha,
e a conta é anonimizada na hora (sem prazo de arrependimento). Este arquivo
cobre o efeito de `User.anonimizar()` no próprio modelo; o fluxo de e-mail/token
vive em test_lgpd_direitos.py.
"""

from django.test import TestCase

from .helpers import criar_aluno


class AnonimizarModeloTest(TestCase):
    def setUp(self):
        self.user = criar_aluno()
        self.email_original = self.user.email
        self.mudou = self.user.anonimizar()
        self.user.refresh_from_db()

    def test_embaralha_identidade(self):
        self.assertTrue(self.mudou)
        self.assertNotEqual(self.user.email, self.email_original)
        self.assertNotIn("aluno", self.user.nickname)
        self.assertFalse(self.user.has_usable_password())

    def test_marca_como_anonimizado_e_inativo(self):
        self.assertIsNotNone(self.user.anonymized_at)
        self.assertTrue(self.user.is_anonymized)
        self.assertFalse(self.user.is_active)

    def test_e_idempotente(self):
        # Já anonimizado: chamar de novo não faz nada e devolve False.
        self.assertFalse(self.user.anonimizar())


class ContaAtivaTest(TestCase):
    def test_conta_nova_nasce_ativa_e_sem_pedido(self):
        user = criar_aluno("intacto")
        self.assertTrue(user.is_active)
        self.assertIsNone(user.deletion_requested_at)
        self.assertIsNone(user.anonymized_at)
