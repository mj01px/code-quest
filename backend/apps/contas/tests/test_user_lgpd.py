"""Exclusão de conta acontece em duas fases, nunca de imediato.

A monografia promete exclusão a pedido do titular alcançando também as
submissões. Executar isso na hora seria irreversível, e o pedido pode vir de um
clique errado ou de uma conta invadida. Então `request_deletion` só registra o
pedido e desativa a conta; a anonimização roda depois, por tarefa periódica,
respeitando o prazo de arrependimento.

O ponto que este arquivo protege é o prazo: chamar de novo não pode reiniciar a
contagem, senão bastaria repetir o pedido para adiar a exclusão para sempre.
"""

from django.test import TestCase
from django.utils import timezone

from .helpers import criar_aluno


class PedidoDeExclusaoTest(TestCase):
    def setUp(self):
        self.user = criar_aluno()
        self.user.request_deletion()
        self.user.refresh_from_db()

    def test_registra_o_pedido(self):
        self.assertIsNotNone(self.user.deletion_requested_at)
        self.assertLessEqual(self.user.deletion_requested_at, timezone.now())

    def test_desativa_a_conta_na_hora(self):
        self.assertFalse(self.user.is_active)

    def test_ainda_nao_esta_anonimizado(self):
        self.assertIsNone(self.user.anonymized_at)
        self.assertFalse(self.user.is_anonymized)

    def test_chamada_repetida_nao_reinicia_o_prazo(self):
        primeiro = self.user.deletion_requested_at
        self.user.request_deletion()
        self.user.refresh_from_db()
        self.assertEqual(self.user.deletion_requested_at, primeiro)


class ContaAtivaTest(TestCase):
    def test_conta_nova_nasce_ativa_e_sem_pedido(self):
        user = criar_aluno("intacto")
        self.assertTrue(user.is_active)
        self.assertIsNone(user.deletion_requested_at)
        self.assertIsNone(user.anonymized_at)
