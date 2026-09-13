from unittest.mock import patch

from django.core import mail, signing
from django.db import IntegrityError
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken

from apps.contas.models import User
from apps.contas.senha import gerar_token

from .helpers import SENHA_PADRAO, criar_aluno, criar_nao_verificado, payload_aceite

SENHA_NOVA = "outra-trilha-de-java-7"
LOCMEM = "django.core.mail.backends.locmem.EmailBackend"


def _primeiro_codigo(resposta) -> str:
    return resposta.data["error"]["details"][0]["code"]


@override_settings(EMAIL_BACKEND=LOCMEM)
class SenhaEsquecidaTest(APITestCase):
    def setUp(self):
        mail.outbox.clear()
        self.url = reverse("contas:senha-esquecida")

    def test_envia_link_para_conta_existente(self):
        criar_aluno("existente")

        r = self.client.post(
            self.url, {"email": "existente@example.com"}, format="json"
        )

        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(
            "http://localhost:3000/redefinir-senha?token=", mail.outbox[0].body
        )

    def test_email_inexistente_responde_igual_e_nao_envia(self):
        r = self.client.post(
            self.url, {"email": "ninguem@example.com"}, format="json"
        )

        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(len(mail.outbox), 0)

    def test_conta_suspensa_nao_recebe(self):
        usuario = criar_aluno("suspenso")
        usuario.is_active = False
        usuario.save(update_fields=["is_active"])

        r = self.client.post(
            self.url, {"email": "suspenso@example.com"}, format="json"
        )

        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(len(mail.outbox), 0)


class RedefinirSenhaTest(APITestCase):
    def setUp(self):
        self.url = reverse("contas:senha-redefinir")
        self.login = reverse("contas:login")
        self.usuario = criar_aluno("trocador")

    def _redefinir(self, token=None, senha=SENHA_NOVA):
        return self.client.post(
            self.url,
            {
                "token": token or gerar_token(self.usuario),
                "senha": senha,
                "senha_confirmacao": senha,
            },
            format="json",
        )

    def test_troca_a_senha_e_libera_o_login(self):
        r = self._redefinir()
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)

        entrada = self.client.post(
            self.login,
            {"email": "trocador@example.com", "senha": SENHA_NOVA},
            format="json",
        )
        self.assertEqual(entrada.status_code, status.HTTP_200_OK)

    def test_senha_antiga_para_de_valer(self):
        self._redefinir()

        entrada = self.client.post(
            self.login,
            {"email": "trocador@example.com", "senha": SENHA_PADRAO},
            format="json",
        )
        self.assertEqual(entrada.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_so_serve_uma_vez(self):
        token = gerar_token(self.usuario)
        self.assertEqual(
            self._redefinir(token=token).status_code, status.HTTP_204_NO_CONTENT
        )

        r = self._redefinir(token=token, senha="mais-uma-senha-boa-3")

        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(_primeiro_codigo(r), "token_invalido")

    def test_token_adulterado_e_recusado(self):
        r = self._redefinir(token=gerar_token(self.usuario)[:-3] + "xyz")

        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(_primeiro_codigo(r), "token_invalido")

    def test_token_de_outro_proposito_nao_serve(self):
        forjado = signing.dumps(
            {"uid": str(self.usuario.pk), "marca": "x"},
            salt="contas.verificacao-email",
        )

        r = self._redefinir(token=forjado)

        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(_primeiro_codigo(r), "token_invalido")

    def test_senha_fraca_e_recusada(self):
        r = self._redefinir(senha="1234")

        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data["error"]["details"][0]["field"], "senha")

    def test_confirmacao_diferente_e_recusada(self):
        r = self.client.post(
            self.url,
            {
                "token": gerar_token(self.usuario),
                "senha": SENHA_NOVA,
                "senha_confirmacao": "outra-coisa-9",
            },
            format="json",
        )

        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(_primeiro_codigo(r), "senha_diferente")

    def test_redefinir_tambem_confirma_o_email(self):
        pendente = criar_nao_verificado("pendente")

        r = self.client.post(
            self.url,
            {
                "token": gerar_token(pendente),
                "senha": SENHA_NOVA,
                "senha_confirmacao": SENHA_NOVA,
            },
            format="json",
        )

        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        pendente.refresh_from_db()
        self.assertTrue(pendente.email_verificado)

    def test_derruba_as_sessoes_abertas(self):
        self.client.post(
            self.login,
            {"email": "trocador@example.com", "senha": SENHA_PADRAO},
            format="json",
        )

        self._redefinir()

        r = self.client.post(reverse("contas:renovar"), {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertTrue(BlacklistedToken.objects.exists())

    def test_destrava_conta_bloqueada(self):
        self.usuario.locked_until = timezone.now() + timezone.timedelta(minutes=10)
        self.usuario.failed_logins = 4
        self.usuario.save(update_fields=["locked_until", "failed_logins"])

        self._redefinir()

        self.usuario.refresh_from_db()
        self.assertFalse(self.usuario.esta_bloqueado)
        self.assertEqual(self.usuario.failed_logins, 0)


@override_settings(LOGIN_MAX_TENTATIVAS=3, LOGIN_BLOQUEIO_SEGUNDOS=900)
class BloqueioPorContaTest(APITestCase):
    def setUp(self):
        self.url = reverse("contas:login")
        self.usuario = criar_aluno("alvo")

    def _errar(self, vezes=1):
        for _ in range(vezes):
            r = self.client.post(
                self.url,
                {"email": "alvo@example.com", "senha": "nao-e-essa-1"},
                format="json",
            )
        return r

    def test_conta_as_falhas(self):
        self._errar(2)

        self.usuario.refresh_from_db()
        self.assertEqual(self.usuario.failed_logins, 2)
        self.assertFalse(self.usuario.esta_bloqueado)

    def test_bloqueia_no_limite(self):
        self._errar(3)

        self.usuario.refresh_from_db()
        self.assertTrue(self.usuario.esta_bloqueado)

    def test_bloqueado_nao_entra_nem_com_a_senha_certa(self):
        self._errar(3)

        r = self.client.post(
            self.url,
            {"email": "alvo@example.com", "senha": SENHA_PADRAO},
            format="json",
        )

        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotIn("access", r.data)

    def test_bloqueio_nao_revela_que_a_conta_existe(self):
        self._errar(3)
        bloqueada = self.client.post(
            self.url,
            {"email": "alvo@example.com", "senha": SENHA_PADRAO},
            format="json",
        )
        inexistente = self.client.post(
            self.url,
            {"email": "ninguem@example.com", "senha": SENHA_PADRAO},
            format="json",
        )

        self.assertEqual(bloqueada.status_code, inexistente.status_code)
        self.assertEqual(
            bloqueada.data["error"]["message"], inexistente.data["error"]["message"]
        )

    def test_login_valido_zera_o_contador(self):
        self._errar(2)

        self.client.post(
            self.url,
            {"email": "alvo@example.com", "senha": SENHA_PADRAO},
            format="json",
        )

        self.usuario.refresh_from_db()
        self.assertEqual(self.usuario.failed_logins, 0)

    def test_bloqueio_expira(self):
        self._errar(3)
        self.usuario.refresh_from_db()
        self.usuario.locked_until = timezone.now() - timezone.timedelta(seconds=1)
        self.usuario.save(update_fields=["locked_until"])

        r = self.client.post(
            self.url,
            {"email": "alvo@example.com", "senha": SENHA_PADRAO},
            format="json",
        )

        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_email_inexistente_nao_explode(self):
        r = self.client.post(
            self.url,
            {"email": "ninguem@example.com", "senha": "seja-la-o-que-for-2"},
            format="json",
        )

        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)


@override_settings(EMAIL_BACKEND=LOCMEM)
class CadastroNaoEnumeraTest(APITestCase):
    def setUp(self):
        mail.outbox.clear()
        self.url = reverse("contas:registrar")

    def _payload(self, email, nickname):
        return {
            "email": email,
            "nickname": nickname,
            "senha": SENHA_PADRAO,
            **payload_aceite(),
        }

    def test_resposta_e_identica_para_email_novo_e_existente(self):
        criar_aluno("existente")

        novo = self.client.post(
            self.url, self._payload("novo@exemplo.com", "novato"), format="json"
        )
        repetido = self.client.post(
            self.url, self._payload("existente@example.com", "outro"), format="json"
        )

        self.assertEqual(novo.status_code, repetido.status_code)
        self.assertEqual(novo.data, repetido.data)

    def test_email_existente_recebe_aviso_em_vez_de_confirmacao(self):
        criar_aluno("existente")

        self.client.post(
            self.url, self._payload("existente@example.com", "outro"), format="json"
        )

        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Tentativa de cadastro", mail.outbox[0].subject)
        self.assertIn("recuperar-senha", mail.outbox[0].body)

    def test_nao_cria_segunda_conta_nem_mexe_na_existente(self):
        alvo = criar_aluno("existente")
        senha_antes = alvo.password

        self.client.post(
            self.url, self._payload("existente@example.com", "outro"), format="json"
        )

        alvo.refresh_from_db()
        self.assertEqual(User.objects.filter(email="existente@example.com").count(), 1)
        self.assertEqual(alvo.password, senha_antes)
        self.assertFalse(User.objects.filter(nickname="outro").exists())

    def test_corrida_no_email_cai_no_mesmo_caminho(self):
        with patch(
            "apps.contas.serializers.RegistroSerializer.create",
            side_effect=IntegrityError("unique"),
        ):
            r = self.client.post(
                self.url, self._payload("corrida@exemplo.com", "corredor"), format="json"
            )

        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(set(r.data), {"email_enviado"})
