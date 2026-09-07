"""O fluxo completo que o frontend percorre: cadastrar, entrar, escolher criatura.

Este é o teste que amarra as duas apps. Ele existe porque cada peça já era
testada isoladamente (model, service, RBAC) e mesmo assim nada funcionava do
lado de fora: faltava a camada de serializer, view e url. Se alguém quebrar uma
rota, um nome de campo ou o formato do erro, é aqui que aparece.
"""

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.contas.models import User
from apps.gamificacao.models import UserCreature

from .helpers import SENHA_PADRAO, criar_aluno


class CadastroTest(APITestCase):
    def setUp(self):
        self.url = reverse("contas:registrar")
        self.payload = {
            "email": "Novo@Exemplo.COM",
            "nickname": "novato",
            "senha": SENHA_PADRAO,
            "senha_confirmacao": SENHA_PADRAO,
        }

    def test_cria_conta_e_devolve_tokens(self):
        r = self.client.post(self.url, self.payload, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", r.data)
        self.assertIn("refresh", r.data)
        self.assertEqual(r.data["usuario"]["nickname"], "novato")
        self.assertEqual(r.data["usuario"]["papel"], "ALUNO")

    def test_email_e_normalizado(self):
        self.client.post(self.url, self.payload, format="json")
        self.assertTrue(User.objects.filter(email="novo@exemplo.com").exists())

    def test_nao_devolve_a_senha(self):
        r = self.client.post(self.url, self.payload, format="json")
        self.assertNotIn("senha", r.data.get("usuario", {}))

    def test_email_duplicado(self):
        criar_aluno("existente")
        self.payload["email"] = "existente@example.com"
        r = self.client.post(self.url, self.payload, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data["error"]["details"][0]["code"], "email_em_uso")

    def test_email_duplicado_ignora_caixa(self):
        criar_aluno("existente")
        self.payload["email"] = "EXISTENTE@EXAMPLE.COM"
        r = self.client.post(self.url, self.payload, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data["error"]["details"][0]["code"], "email_em_uso")

    def test_nickname_duplicado_ignora_caixa(self):
        criar_aluno("Kiuev")
        self.payload["nickname"] = "kiuev"
        r = self.client.post(self.url, self.payload, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data["error"]["details"][0]["code"], "nickname_em_uso")

    def test_nickname_reservado(self):
        self.payload["nickname"] = "admin"
        r = self.client.post(self.url, self.payload, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data["error"]["details"][0]["code"], "nickname_reservado")

    def test_senhas_diferentes(self):
        self.payload["senha_confirmacao"] = "outra-coisa-9"
        r = self.client.post(self.url, self.payload, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data["error"]["details"][0]["code"], "senha_diferente")

    def test_senha_fraca(self):
        self.payload["senha"] = self.payload["senha_confirmacao"] = "1234"
        r = self.client.post(self.url, self.payload, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data["error"]["details"][0]["field"], "senha")

    def test_papel_nao_pode_vir_do_cliente(self):
        self.payload["role"] = "ADMIN"
        self.payload["papel"] = "ADMIN"
        r = self.client.post(self.url, self.payload, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.get(nickname="novato").role, User.Role.STUDENT)


class LoginTest(APITestCase):
    def setUp(self):
        self.url = reverse("contas:login")
        self.usuario = criar_aluno("logavel")

    def test_entra_com_credencial_correta(self):
        r = self.client.post(
            self.url,
            {"email": "logavel@example.com", "senha": SENHA_PADRAO},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn("access", r.data)
        self.assertEqual(r.data["usuario"]["nickname"], "logavel")

    def test_email_em_caixa_alta_tambem_entra(self):
        r = self.client.post(
            self.url,
            {"email": "LOGAVEL@EXAMPLE.COM", "senha": SENHA_PADRAO},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_senha_errada(self):
        r = self.client.post(
            self.url,
            {"email": "logavel@example.com", "senha": "nao-e-essa-1"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_conta_suspensa_nao_entra(self):
        self.usuario.is_active = False
        self.usuario.save(update_fields=["is_active"])
        r = self.client.post(
            self.url,
            {"email": "logavel@example.com", "senha": SENHA_PADRAO},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_renova_o_access_com_o_refresh(self):
        login = self.client.post(
            self.url,
            {"email": "logavel@example.com", "senha": SENHA_PADRAO},
            format="json",
        )
        r = self.client.post(
            reverse("contas:renovar"),
            {"refresh": login.data["refresh"]},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn("access", r.data)


class PerfilTest(APITestCase):
    def setUp(self):
        self.url = reverse("contas:eu")
        self.usuario = criar_aluno("perfilado")

    def test_exige_autenticacao(self):
        self.assertEqual(
            self.client.get(self.url).status_code, status.HTTP_401_UNAUTHORIZED
        )

    def test_devolve_o_proprio_perfil_com_as_permissoes(self):
        self.client.force_authenticate(self.usuario)
        r = self.client.get(self.url)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["nickname"], "perfilado")
        self.assertIn("trilhas.view", r.data["permissoes"])
        self.assertNotIn("trilhas.publish", r.data["permissoes"])

    def test_troca_o_nickname(self):
        self.client.force_authenticate(self.usuario)
        r = self.client.patch(self.url, {"nickname": "outro_nick"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.usuario.refresh_from_db()
        self.assertEqual(self.usuario.nickname, "outro_nick")

    def test_nao_troca_o_email(self):
        self.client.force_authenticate(self.usuario)
        self.client.patch(self.url, {"email": "roubado@example.com"}, format="json")
        self.usuario.refresh_from_db()
        self.assertEqual(self.usuario.email, "perfilado@example.com")

    def test_delete_registra_pedido_de_exclusao_sem_apagar(self):
        self.client.force_authenticate(self.usuario)
        r = self.client.delete(self.url)
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.usuario.refresh_from_db()
        self.assertIsNotNone(self.usuario.deletion_requested_at)
        self.assertFalse(self.usuario.is_active)


class CatalogoTest(APITestCase):
    def test_catalogo_e_publico_e_traz_as_cinco_em_ordem(self):
        r = self.client.get(reverse("gamificacao:catalogo"))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        slugs = [c["slug"] for c in r.data]
        self.assertEqual(
            slugs, ["shellby", "slyth", "blaze", "raposa", "elefante"]
        )

    def test_traz_a_ficha_de_cada_criatura(self):
        r = self.client.get(reverse("gamificacao:catalogo"))
        blaze = next(c for c in r.data if c["slug"] == "blaze")
        self.assertEqual(blaze["tipo"], "Backend / Fogo")
        self.assertEqual(blaze["atributo_nome"], "Força")
        self.assertEqual(blaze["atributo_valor"], 5)
        self.assertTrue(blaze["descricao"].strip())

    def test_marca_quais_estao_disponiveis(self):
        r = self.client.get(reverse("gamificacao:catalogo"))
        por_slug = {c["slug"]: c["disponivel"] for c in r.data}
        self.assertTrue(por_slug["shellby"])
        self.assertFalse(por_slug["raposa"])
        self.assertFalse(por_slug["elefante"])

    def test_traz_os_estagios_com_url_de_sprite(self):
        r = self.client.get(reverse("gamificacao:catalogo"))
        criatura = r.data[0]
        self.assertEqual(len(criatura["estagios"]), 3)
        self.assertEqual(criatura["estagios"][0]["sprite"], "/criaturas/shellby_stage_1.png")
        self.assertEqual(criatura["dominio"], "FUNDAMENTOS")


class EscolhaDaCriaturaTest(APITestCase):
    def setUp(self):
        self.url = reverse("gamificacao:minhas-criaturas")
        self.usuario = criar_aluno("escolhedor")
        self.client.force_authenticate(self.usuario)

    def test_exige_autenticacao(self):
        self.client.force_authenticate(None)
        self.assertEqual(
            self.client.post(self.url, {"criatura": "shellby"}, format="json").status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_escolhe_a_inicial(self):
        r = self.client.post(self.url, {"criatura": "shellby"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertTrue(r.data["inicial"])
        self.assertEqual(r.data["estagio_atual"], 1)
        self.assertEqual(r.data["criatura"]["nome"], "Shellby")
        self.assertEqual(r.data["sprite"], "/criaturas/shellby_stage_1.png")

    def test_lista_vazia_antes_de_escolher(self):
        self.assertEqual(self.client.get(self.url).data, [])

    def test_lista_apos_escolher(self):
        self.client.post(self.url, {"criatura": "slyth"}, format="json")
        r = self.client.get(self.url)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["criatura"]["slug"], "slyth")

    def test_criatura_indisponivel(self):
        r = self.client.post(self.url, {"criatura": "raposa"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data["error"]["details"][0]["code"], "criatura_indisponivel")

    def test_criatura_inexistente(self):
        r = self.client.post(self.url, {"criatura": "grifo"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data["error"]["details"][0]["code"], "criatura_inexistente")

    def test_segunda_escolha_e_recusada(self):
        self.client.post(self.url, {"criatura": "shellby"}, format="json")
        r = self.client.post(self.url, {"criatura": "blaze"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data["error"]["details"][0]["code"], "inicial_ja_escolhida")

    def test_nao_ve_criatura_de_outro_usuario(self):
        outro = criar_aluno("vizinho")
        UserCreature.objects.create(user=outro, creature_id="blaze", is_starter=True)
        self.client.post(self.url, {"criatura": "shellby"}, format="json")
        r = self.client.get(self.url)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["criatura"]["slug"], "shellby")


class FormatoDeErroTest(APITestCase):
    def test_erro_segue_o_envelope_com_codigo_e_detalhes(self):
        r = self.client.post(reverse("contas:registrar"), {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", r.data)
        self.assertEqual(r.data["error"]["code"], "validacao")
        campos = {d["field"] for d in r.data["error"]["details"]}
        self.assertEqual(campos, {"email", "nickname", "senha", "senha_confirmacao"})

    def test_nao_autenticado_tambem_usa_o_envelope(self):
        r = self.client.get(reverse("contas:eu"))
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("error", r.data)
        self.assertIn("message", r.data["error"])
