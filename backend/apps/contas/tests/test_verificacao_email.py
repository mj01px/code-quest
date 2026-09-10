from datetime import timedelta
from unittest.mock import patch

from django.core import mail, signing
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.contas.cookies import ACCESS
from apps.contas.models import User
from apps.contas.verificacao import SALT, gerar_token

from .helpers import SENHA_PADRAO, criar_aluno, criar_nao_verificado, payload_aceite


def _primeiro_codigo(resposta) -> str:
    return resposta.data["error"]["details"][0]["code"]


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class EnvioNoCadastroTest(APITestCase):
    def setUp(self):
        mail.outbox.clear()
        self.url = reverse("contas:registrar")
        self.payload = {
            "email": "novato@exemplo.com",
            "nickname": "novato",
            "senha": SENHA_PADRAO,
            **payload_aceite(),
        }

    def test_conta_nasce_sem_email_verificado(self):
        self.client.post(self.url, self.payload, format="json")

        usuario = User.objects.get(nickname="novato")
        self.assertIsNone(usuario.email_verified_at)
        self.assertFalse(usuario.email_verificado)

    def test_dispara_um_email_para_o_endereco_cadastrado(self):
        self.client.post(self.url, self.payload, format="json")

        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["novato@exemplo.com"])

    def test_o_email_carrega_o_link_do_frontend_com_token(self):
        self.client.post(self.url, self.payload, format="json")

        corpo = mail.outbox[0].body
        self.assertIn("http://localhost:3000/verificar-email?token=", corpo)

    def test_cadastro_nao_devolve_sessao(self):
        r = self.client.post(self.url, self.payload, format="json")

        self.assertNotIn("access", r.data)
        self.assertNotIn("refresh", r.data)

    def test_smtp_fora_do_ar_nao_derruba_o_cadastro(self):
        with patch(
            "apps.contas.verificacao.enviar_email_html",
            side_effect=OSError("smtp caiu"),
        ):
            r = self.client.post(self.url, self.payload, format="json")

        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertFalse(r.data["email_enviado"])
        self.assertTrue(User.objects.filter(nickname="novato").exists())


class LoginBloqueadoTest(APITestCase):
    def setUp(self):
        self.url = reverse("contas:login")

    def test_nao_entra_com_email_pendente(self):
        criar_nao_verificado("pendente")

        r = self.client.post(
            self.url,
            {"email": "pendente@example.com", "senha": SENHA_PADRAO},
            format="json",
        )

        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(_primeiro_codigo(r), "email_nao_verificado")

    def test_bloqueio_nao_devolve_token(self):
        criar_nao_verificado("pendente")

        r = self.client.post(
            self.url,
            {"email": "pendente@example.com", "senha": SENHA_PADRAO},
            format="json",
        )

        self.assertNotIn("access", r.data)

    def test_senha_errada_em_conta_pendente_nao_revela_o_estado(self):
        criar_nao_verificado("pendente")

        r = self.client.post(
            self.url,
            {"email": "pendente@example.com", "senha": "nao-e-essa-1"},
            format="json",
        )

        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotIn("email_nao_verificado", str(r.data))

    def test_entra_depois_de_verificar(self):
        usuario = criar_nao_verificado("pendente")
        usuario.marcar_email_verificado()

        r = self.client.post(
            self.url,
            {"email": "pendente@example.com", "senha": SENHA_PADRAO},
            format="json",
        )

        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn(ACCESS, r.cookies)


class VerificarEmailTest(APITestCase):
    def setUp(self):
        self.url = reverse("contas:verificar")
        self.usuario = criar_nao_verificado("pendente")

    def test_token_valido_libera_a_conta(self):
        r = self.client.post(
            self.url, {"token": gerar_token(self.usuario)}, format="json"
        )

        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.usuario.refresh_from_db()
        self.assertIsNotNone(self.usuario.email_verified_at)

    def test_token_adulterado_e_recusado(self):
        token = gerar_token(self.usuario)

        r = self.client.post(self.url, {"token": token[:-3] + "xyz"}, format="json")

        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(_primeiro_codigo(r), "token_invalido")
        self.usuario.refresh_from_db()
        self.assertIsNone(self.usuario.email_verified_at)

    def test_token_expirado_e_recusado(self):
        token = gerar_token(self.usuario)

        futuro = timezone.now() + timedelta(days=2)
        with patch("django.core.signing.time.time", return_value=futuro.timestamp()):
            r = self.client.post(self.url, {"token": token}, format="json")

        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(_primeiro_codigo(r), "token_invalido")

    def test_token_de_outro_salt_nao_serve(self):
        forjado = signing.dumps(str(self.usuario.pk), salt="outro-proposito")

        r = self.client.post(self.url, {"token": forjado}, format="json")

        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(_primeiro_codigo(r), "token_invalido")

    def test_token_de_usuario_apagado_e_recusado(self):
        token = gerar_token(self.usuario)
        self.usuario.delete()

        r = self.client.post(self.url, {"token": token}, format="json")

        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(_primeiro_codigo(r), "token_invalido")

    def test_verificar_duas_vezes_nao_muda_a_data(self):
        token = gerar_token(self.usuario)
        self.client.post(self.url, {"token": token}, format="json")
        self.usuario.refresh_from_db()
        primeira = self.usuario.email_verified_at

        r = self.client.post(self.url, {"token": token}, format="json")

        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.usuario.refresh_from_db()
        self.assertEqual(self.usuario.email_verified_at, primeira)

    def test_salt_do_projeto_e_o_esperado(self):
        self.assertEqual(SALT, "contas.verificacao-email")


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class ReenviarVerificacaoTest(APITestCase):
    def setUp(self):
        mail.outbox.clear()
        self.url = reverse("contas:reenviar-verificacao")

    def test_reenvia_para_conta_pendente(self):
        criar_nao_verificado("pendente")

        r = self.client.post(
            self.url, {"email": "pendente@example.com"}, format="json"
        )

        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(len(mail.outbox), 1)

    def test_email_inexistente_responde_igual_e_nao_envia(self):
        r = self.client.post(
            self.url, {"email": "ninguem@example.com"}, format="json"
        )

        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(len(mail.outbox), 0)

    def test_conta_ja_verificada_responde_igual_e_nao_envia(self):
        criar_aluno("verificado")

        r = self.client.post(
            self.url, {"email": "verificado@example.com"}, format="json"
        )

        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(len(mail.outbox), 0)

    def test_caixa_do_email_nao_importa(self):
        criar_nao_verificado("pendente")

        r = self.client.post(
            self.url, {"email": "PENDENTE@EXAMPLE.COM"}, format="json"
        )

        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(len(mail.outbox), 1)
