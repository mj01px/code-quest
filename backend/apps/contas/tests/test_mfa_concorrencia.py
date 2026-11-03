"""RNF06: código de uso único do 2FA usado por requisições simultâneas.

Cada caso dispara o mesmo código em várias threads, cada uma com sua conexão
ao Postgres. Exatamente uma pode passar.
"""

import pyotp
from django.test import TransactionTestCase

from apps.contas import mfa
from apps.contas.models import ConfiguracaoMFA, User
from apps.contas.tests.helpers import ao_mesmo_tempo, criar_aluno


class CodigoDeUsoUnicoSimultaneoTest(TransactionTestCase):
    def _fixture_teardown(self):
        # sem flush: ele apagaria o RBAC e o catálogo semeados no banco de
        # teste, que é reaproveitado entre execuções (--reuse-db)
        User.objects.filter(email__endswith="@example.com").delete()

    def setUp(self):
        self.user = criar_aluno("mfa_conc")

    def _verificar(self, codigo, permitir_recuperacao=True):
        # usuário relido em cada thread, como numa requisição de verdade
        return lambda: mfa.verificar_codigo(
            User.objects.get(pk=self.user.pk), codigo, permitir_recuperacao
        )

    def test_codigo_de_recuperacao(self):
        ConfiguracaoMFA.objects.create(
            user=self.user, ativo=True, metodo=ConfiguracaoMFA.Metodo.APP,
            totp_secret=pyotp.random_base32(),
        )
        codigo = mfa.gerar_codigos_recuperacao(self.user)[0]

        self.assertEqual(ao_mesmo_tempo(self._verificar(codigo)).count(True), 1)

    def test_totp(self):
        segredo = pyotp.random_base32()
        ConfiguracaoMFA.objects.create(
            user=self.user, ativo=True, metodo=ConfiguracaoMFA.Metodo.APP,
            totp_secret=segredo,
        )
        codigo = pyotp.TOTP(segredo).now()

        resultados = ao_mesmo_tempo(self._verificar(codigo, False))

        self.assertEqual(resultados.count(True), 1)
        # e o código também não volta a valer depois
        self.assertFalse(self._verificar(codigo, False)())

    def test_codigo_por_email(self):
        config = ConfiguracaoMFA.objects.create(
            user=self.user, ativo=True, metodo=ConfiguracaoMFA.Metodo.EMAIL
        )
        codigo = mfa.preparar_desafio_email(config)

        resultados = ao_mesmo_tempo(self._verificar(codigo, False))

        self.assertEqual(resultados.count(True), 1)
