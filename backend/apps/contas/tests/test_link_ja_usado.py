"""Links de uso único, ao serem reabertos depois de já executados, respondem
com o código `link_ja_usado` — para a interface mostrar 'já feito' em vez de
'link inválido'."""

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.contas.exclusao import gerar_token as gerar_token_exclusao
from apps.contas.lgpd import anonimizar_conta
from apps.contas.senha import gerar_token as gerar_token_senha
from apps.contas.tests.helpers import SENHA_PADRAO, criar_aluno
from apps.contas.troca_email import gerar_token as gerar_token_troca

NOVA_SENHA = "outra-trilha-de-python-9"


def _codigo(resposta) -> str:
    return resposta.data["error"]["details"][0]["code"]


class LinkJaUsadoTest(APITestCase):
    def test_redefinir_senha_ja_usada(self):
        user = criar_aluno("reset-ja")
        token = gerar_token_senha(user)
        # A senha muda (por este ou outro caminho): a marca do token não confere mais.
        user.set_password(NOVA_SENHA)
        user.save(update_fields=["password"])

        resposta = self.client.post(
            reverse("contas:senha-redefinir"),
            {"token": token, "senha": NOVA_SENHA, "senha_confirmacao": NOVA_SENHA},
        )

        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(_codigo(resposta), "link_ja_usado")

    def test_troca_email_ja_feita(self):
        user = criar_aluno("troca-ja")
        token = gerar_token_troca(user, "novo@example.com")
        # O e-mail muda: a marca (hash do e-mail) não confere mais.
        user.email = "ja-mudou@example.com"
        user.save(update_fields=["email"])

        resposta = self.client.post(
            reverse("contas:confirmar-troca-email"), {"token": token}
        )

        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(_codigo(resposta), "link_ja_usado")

    def test_exclusao_de_conta_ja_excluida(self):
        user = criar_aluno("ja-excluida")
        token = gerar_token_exclusao(user)
        anonimizar_conta(user)  # a conta já foi anonimizada

        resposta = self.client.post(
            reverse("contas:excluir-confirmar"),
            {"token": token, "senha": SENHA_PADRAO},
        )

        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(_codigo(resposta), "link_ja_usado")
