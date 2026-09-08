from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.contas.cookies import ACCESS, CAMINHO_REFRESH, REFRESH, SESSAO

from .helpers import SENHA_PADRAO, criar_aluno


class CookieDeSessaoTest(APITestCase):
    def setUp(self):
        self.login = reverse("contas:login")
        self.usuario = criar_aluno("sessionado")

    def _entrar(self):
        return self.client.post(
            self.login,
            {"email": "sessionado@example.com", "senha": SENHA_PADRAO},
            format="json",
        )

    def test_login_nao_devolve_token_no_corpo(self):
        r = self._entrar()

        self.assertEqual(set(r.data), {"usuario"})
        self.assertNotIn("access", str(r.data))

    def test_cookies_sao_httponly(self):
        r = self._entrar()

        self.assertTrue(r.cookies[ACCESS]["httponly"])
        self.assertTrue(r.cookies[REFRESH]["httponly"])

    def test_cookies_sao_samesite_lax(self):
        r = self._entrar()

        self.assertEqual(r.cookies[ACCESS]["samesite"], "Lax")
        self.assertEqual(r.cookies[REFRESH]["samesite"], "Lax")

    def test_refresh_fica_restrito_as_rotas_de_auth(self):
        r = self._entrar()

        self.assertEqual(r.cookies[REFRESH]["path"], CAMINHO_REFRESH)
        self.assertEqual(r.cookies[ACCESS]["path"], "/")

    def test_cookie_autentica_sem_cabecalho(self):
        self._entrar()

        r = self.client.get(reverse("contas:eu"))

        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["nickname"], "sessionado")

    def test_sem_cookie_nao_autentica(self):
        r = self.client.get(reverse("contas:eu"))

        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_sair_limpa_os_cookies(self):
        self._entrar()

        r = self.client.post(reverse("contas:sair"), {}, format="json")

        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(r.cookies[ACCESS].value, "")
        self.assertEqual(r.cookies[REFRESH].value, "")

    def test_sair_invalida_o_refresh(self):
        self._entrar()
        self.client.post(reverse("contas:sair"), {}, format="json")

        r = self.client.post(reverse("contas:renovar"), {}, format="json")

        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_sair_sem_sessao_nao_quebra(self):
        r = self.client.post(reverse("contas:sair"), {}, format="json")

        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)


class CsrfTest(APITestCase):
    def setUp(self):
        self.usuario = criar_aluno("csrfado")
        self.rigoroso = APIClient(enforce_csrf_checks=True)
        self.rigoroso.post(
            reverse("contas:login"),
            {"email": "csrfado@example.com", "senha": SENHA_PADRAO},
            format="json",
        )

    def test_get_com_cookie_passa_sem_token_csrf(self):
        r = self.rigoroso.get(reverse("contas:eu"))

        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_escrita_com_cookie_e_sem_token_csrf_e_barrada(self):
        r = self.rigoroso.patch(
            reverse("contas:eu"), {"nickname": "invadido"}, format="json"
        )

        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.usuario.refresh_from_db()
        self.assertEqual(self.usuario.nickname, "csrfado")

    def test_escrita_passa_com_o_token_csrf(self):
        self.rigoroso.get(reverse("contas:csrf"))
        token = self.rigoroso.cookies["csrftoken"].value

        r = self.rigoroso.patch(
            reverse("contas:eu"),
            {"nickname": "renomeado"},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )

        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.usuario.refresh_from_db()
        self.assertEqual(self.usuario.nickname, "renomeado")

    def test_endpoint_de_csrf_entrega_o_cookie(self):
        r = self.rigoroso.get(reverse("contas:csrf"))

        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertIn("csrftoken", r.cookies)

    def test_cookie_csrf_e_legivel_pelo_javascript(self):
        r = self.rigoroso.get(reverse("contas:csrf"))

        self.assertFalse(r.cookies["csrftoken"]["httponly"])


class SinalizadorDeSessaoTest(APITestCase):
    def setUp(self):
        self.usuario = criar_aluno("sinalizado")

    def _entrar(self):
        return self.client.post(
            reverse("contas:login"),
            {"email": "sinalizado@example.com", "senha": SENHA_PADRAO},
            format="json",
        )

    def test_login_marca_o_sinalizador(self):
        r = self._entrar()

        self.assertEqual(r.cookies[SESSAO].value, "1")

    def test_sinalizador_e_legivel_pelo_javascript(self):
        r = self._entrar()

        self.assertFalse(r.cookies[SESSAO]["httponly"])

    def test_sinalizador_nao_carrega_credencial(self):
        r = self._entrar()

        self.assertEqual(r.cookies[SESSAO].value, "1")
        self.assertNotIn(".", r.cookies[SESSAO].value)

    def test_sinalizador_sozinho_nao_autentica(self):
        self._entrar()
        del self.client.cookies[ACCESS]

        r = self.client.get(reverse("contas:eu"))

        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_sair_apaga_o_sinalizador(self):
        self._entrar()

        r = self.client.post(reverse("contas:sair"), {}, format="json")

        self.assertEqual(r.cookies[SESSAO].value, "")
