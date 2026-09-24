from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.auditoria.models import AcaoAuditoria, RegistroDeAuditoria
from apps.auditoria.services import registrar
from apps.contas.tests.helpers import (
    SENHA_PADRAO,
    criar_admin,
    criar_aluno,
)
from apps.gamificacao.services import select_starter_creature


class ServicoAuditoriaTests(TestCase):
    def test_registrar_cria_linha_com_actor(self):
        usuario = criar_aluno()

        registro = registrar(AcaoAuditoria.LOGIN_OK, actor=usuario, motivo="teste")

        self.assertIsNotNone(registro)
        self.assertEqual(RegistroDeAuditoria.objects.count(), 1)
        self.assertEqual(registro.acao, AcaoAuditoria.LOGIN_OK)
        self.assertEqual(registro.actor, usuario)
        self.assertEqual(registro.actor_email_snapshot, usuario.email)
        self.assertEqual(registro.metadata, {"motivo": "teste"})

    def test_registrar_anonimo_fica_sem_actor(self):
        registro = registrar(AcaoAuditoria.LOGIN_FALHA, email_desconhecido=True)

        self.assertIsNone(registro.actor)
        self.assertEqual(registro.actor_email_snapshot, "")
        self.assertTrue(registro.metadata["email_desconhecido"])

    def test_registrar_nunca_propaga_falha(self):
        with patch(
            "apps.auditoria.services.RegistroDeAuditoria.objects.create",
            side_effect=RuntimeError("boom"),
        ):
            registro = registrar(AcaoAuditoria.LOGIN_OK)

        self.assertIsNone(registro)

    def test_registro_e_append_only(self):
        registro = registrar(AcaoAuditoria.LOGOUT)

        registro.acao = AcaoAuditoria.LOGIN_OK
        with self.assertRaises(ValueError):
            registro.save()


class LoginAuditoriaTests(APITestCase):
    def setUp(self):
        self.url = reverse("contas:login")

    def test_login_ok_gera_registro(self):
        usuario = criar_aluno()

        resposta = self.client.post(
            self.url, {"email": usuario.email, "senha": SENHA_PADRAO}
        )

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertTrue(
            RegistroDeAuditoria.objects.filter(
                acao=AcaoAuditoria.LOGIN_OK, actor=usuario
            ).exists()
        )

    def test_login_falha_registra_sem_guardar_a_senha(self):
        usuario = criar_aluno()
        senha_errada = "senha-que-nao-e-a-certa-9"

        resposta = self.client.post(
            self.url, {"email": usuario.email, "senha": senha_errada}
        )

        self.assertEqual(resposta.status_code, status.HTTP_401_UNAUTHORIZED)
        registro = RegistroDeAuditoria.objects.filter(
            acao=AcaoAuditoria.LOGIN_FALHA
        ).first()
        self.assertIsNotNone(registro)
        self.assertEqual(registro.metadata.get("motivo"), "credenciais_invalidas")
        # A senha tentada não pode aparecer em nenhum campo gravado.
        blob = f"{registro.metadata}{registro.actor_email_snapshot}{registro.user_agent}"
        self.assertNotIn(senha_errada, blob)

    def test_login_email_desconhecido_nao_guarda_o_email(self):
        resposta = self.client.post(
            self.url, {"email": "ninguem@example.com", "senha": "qualquer-8"}
        )

        self.assertEqual(resposta.status_code, status.HTTP_401_UNAUTHORIZED)
        registro = RegistroDeAuditoria.objects.filter(
            acao=AcaoAuditoria.LOGIN_FALHA
        ).first()
        self.assertIsNotNone(registro)
        self.assertIsNone(registro.actor)
        self.assertTrue(registro.metadata.get("email_desconhecido"))
        self.assertEqual(registro.actor_email_snapshot, "")


class EndpointAuditoriaTests(APITestCase):
    def setUp(self):
        self.url = reverse("auditoria:lista")

    def test_anonimo_recebe_401(self):
        self.assertEqual(
            self.client.get(self.url).status_code, status.HTTP_401_UNAUTHORIZED
        )

    def test_aluno_sem_permissao_recebe_403(self):
        self.client.force_authenticate(criar_aluno())

        self.assertEqual(
            self.client.get(self.url).status_code, status.HTTP_403_FORBIDDEN
        )

    def test_admin_lista_e_a_consulta_fica_registrada(self):
        admin = criar_admin()
        self.client.force_authenticate(admin)
        registrar(AcaoAuditoria.LOGIN_OK, actor=admin)

        resposta = self.client.get(self.url)

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertIn("results", resposta.data)
        self.assertTrue(
            RegistroDeAuditoria.objects.filter(
                acao=AcaoAuditoria.ACESSO_AUDITORIA, actor=admin
            ).exists()
        )

    def test_filtro_por_acao(self):
        admin = criar_admin()
        self.client.force_authenticate(admin)
        registrar(AcaoAuditoria.LOGIN_OK, actor=admin)

        resposta = self.client.get(self.url, {"acao": AcaoAuditoria.LOGIN_OK})

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        acoes = {linha["acao"] for linha in resposta.data["results"]}
        self.assertEqual(acoes, {AcaoAuditoria.LOGIN_OK})


class MinhaAtividadeTests(APITestCase):
    def setUp(self):
        self.url = reverse("auditoria:minha-atividade")

    def test_exige_autenticacao(self):
        self.assertEqual(
            self.client.get(self.url).status_code, status.HTTP_401_UNAUTHORIZED
        )

    def test_lista_apenas_as_proprias_acoes(self):
        eu = criar_aluno("eu")
        outro = criar_aluno("outro")
        registrar(AcaoAuditoria.LOGIN_OK, actor=eu)
        registrar(AcaoAuditoria.NICKNAME_ALTERADO, actor=eu)
        registrar(AcaoAuditoria.LOGIN_OK, actor=outro)  # não é minha
        self.client.force_authenticate(eu)

        resposta = self.client.get(self.url)

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertEqual(resposta.data["count"], 2)
        acoes = {linha["acao"] for linha in resposta.data["results"]}
        self.assertEqual(
            acoes, {AcaoAuditoria.LOGIN_OK, AcaoAuditoria.NICKNAME_ALTERADO}
        )
        # Vem com rótulo legível para a interface.
        self.assertTrue(all(linha["acao_rotulo"] for linha in resposta.data["results"]))

    def test_nao_mostra_acoes_administrativas(self):
        eu = criar_admin("adm")
        registrar(AcaoAuditoria.LOGIN_OK, actor=eu)
        registrar(AcaoAuditoria.ACESSO_AUDITORIA, actor=eu)  # ação de admin
        self.client.force_authenticate(eu)

        resposta = self.client.get(self.url)

        acoes = {linha["acao"] for linha in resposta.data["results"]}
        self.assertEqual(acoes, {AcaoAuditoria.LOGIN_OK})

    def test_pagina_com_cinco_por_vez(self):
        eu = criar_aluno("paginado")
        for _ in range(7):
            registrar(AcaoAuditoria.LOGIN_OK, actor=eu)
        self.client.force_authenticate(eu)

        primeira = self.client.get(self.url)
        segunda = self.client.get(self.url, {"page": 2})

        self.assertEqual(primeira.data["count"], 7)
        self.assertEqual(len(primeira.data["results"]), 5)
        self.assertIsNotNone(primeira.data["next"])
        self.assertEqual(len(segunda.data["results"]), 2)
        self.assertIsNone(segunda.data["next"])


class InstrumentacaoExtraTests(APITestCase):
    def test_troca_de_nickname_gera_registro(self):
        usuario = criar_aluno("nomeantigo")
        self.client.force_authenticate(usuario)

        resposta = self.client.patch(
            reverse("contas:eu"), {"nickname": "nomenovo"}
        )

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertTrue(
            RegistroDeAuditoria.objects.filter(
                acao=AcaoAuditoria.NICKNAME_ALTERADO, actor=usuario
            ).exists()
        )

    def test_nickname_igual_nao_gera_registro(self):
        usuario = criar_aluno("mesmonome")
        self.client.force_authenticate(usuario)

        self.client.patch(reverse("contas:eu"), {"nickname": "mesmonome"})

        self.assertFalse(
            RegistroDeAuditoria.objects.filter(
                acao=AcaoAuditoria.NICKNAME_ALTERADO
            ).exists()
        )

    def test_adquirir_criatura_gera_registro(self):
        usuario = criar_aluno("colecionador")
        select_starter_creature(user=usuario, creature_slug="shellby")
        self.client.force_authenticate(usuario)

        resposta = self.client.post(
            reverse("gamificacao:adquirir-criatura"), {"criatura": "blaze"}
        )

        self.assertEqual(resposta.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            RegistroDeAuditoria.objects.filter(
                acao=AcaoAuditoria.CRIATURA_ADQUIRIDA, actor=usuario
            ).exists()
        )
