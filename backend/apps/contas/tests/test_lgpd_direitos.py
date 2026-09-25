from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.auditoria.models import AcaoAuditoria, RegistroDeAuditoria
from apps.auditoria.services import registrar
from apps.contas.documentos import Documento
from apps.contas.exclusao import gerar_token
from apps.contas.lgpd import anonimizar_conta
from apps.contas.models import AceiteDeTermos, User
from apps.contas.tests.helpers import SENHA_PADRAO, criar_aluno


class ExportacaoTests(APITestCase):
    def setUp(self):
        self.url = reverse("contas:exportar")

    def test_exige_autenticacao(self):
        self.assertEqual(
            self.client.get(self.url).status_code, status.HTTP_401_UNAUTHORIZED
        )

    def test_exporta_todas_as_secoes_e_audita(self):
        usuario = criar_aluno("titular")
        AceiteDeTermos.registrar_vigentes(usuario, ip="127.0.0.1")
        self.client.force_authenticate(usuario)

        resposta = self.client.get(self.url)

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        for chave in ("perfil", "aceites", "trilhas_iniciadas", "xp", "criaturas", "atividade"):
            self.assertIn(chave, resposta.data)
        self.assertEqual(resposta.data["perfil"]["email"], usuario.email)
        self.assertEqual(len(resposta.data["aceites"]), 2)
        self.assertTrue(
            RegistroDeAuditoria.objects.filter(
                acao=AcaoAuditoria.EXPORTACAO_DADOS, actor=usuario
            ).exists()
        )


class AnonimizacaoTests(TestCase):
    def test_anonimizacao_apaga_pii_e_preserva_prova(self):
        usuario = criar_aluno("apagavel")
        email_original = usuario.email
        registrar(AcaoAuditoria.LOGIN_OK, actor=usuario)
        AceiteDeTermos.registrar_vigentes(usuario, ip="200.1.2.3")

        anonimizado = anonimizar_conta(usuario)

        usuario.refresh_from_db()
        self.assertTrue(anonimizado)
        self.assertTrue(usuario.is_anonymized)
        self.assertNotEqual(usuario.email, email_original)
        self.assertNotIn("apagavel", usuario.nickname)
        # PII derivada some; a prova de aceite (documento/versão) permanece.
        self.assertFalse(
            RegistroDeAuditoria.objects.filter(actor=usuario)
            .exclude(actor_email_snapshot="")
            .exists()
        )
        aceites = AceiteDeTermos.objects.filter(user=usuario)
        self.assertEqual(aceites.count(), 2)
        self.assertTrue(all(a.ip is None for a in aceites))
        self.assertTrue(
            RegistroDeAuditoria.objects.filter(
                acao=AcaoAuditoria.CONTA_ANONIMIZADA, actor=usuario
            ).exists()
        )

    def test_anonimizacao_nao_conclui_se_a_auditoria_falhar(self):
        # O registro é prova obrigatória: sem ele, nada da anonimização fica.
        usuario = criar_aluno("sem-prova")
        email_original = usuario.email
        AceiteDeTermos.registrar_vigentes(usuario, ip="200.1.2.3")

        with patch(
            "apps.auditoria.models.RegistroDeAuditoria.objects.create",
            side_effect=RuntimeError("banco fora"),
        ), self.assertRaises(RuntimeError):
            anonimizar_conta(usuario)

        usuario = User.objects.get(pk=usuario.pk)
        self.assertFalse(usuario.is_anonymized)
        self.assertTrue(usuario.is_active)
        self.assertEqual(usuario.email, email_original)
        self.assertTrue(
            all(a.ip == "200.1.2.3" for a in AceiteDeTermos.objects.filter(user=usuario))
        )

    def test_anonimizacao_e_idempotente(self):
        usuario = criar_aluno("uma-vez")
        self.assertTrue(anonimizar_conta(usuario))
        self.assertFalse(anonimizar_conta(User.objects.get(pk=usuario.pk)))


class ReconsentimentoTests(APITestCase):
    def setUp(self):
        self.status_url = reverse("contas:consentimentos")
        self.aceitar_url = reverse("contas:consentimentos-aceitar")

    def test_sem_pendencia_quando_versoes_estao_em_dia(self):
        usuario = criar_aluno("em-dia")
        AceiteDeTermos.registrar_vigentes(usuario)
        self.client.force_authenticate(usuario)

        resposta = self.client.get(self.status_url)

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertTrue(all(item["pendente"] is False for item in resposta.data))

    def test_bump_gera_pendencia_e_reaceite_resolve(self):
        usuario = criar_aluno("desatualizado")
        # Aceitou uma versão antiga dos Termos; Privacidade nunca aceita.
        AceiteDeTermos.objects.create(
            user=usuario, documento=Documento.TERMOS, versao="0.9"
        )
        self.client.force_authenticate(usuario)

        antes = self.client.get(self.status_url).data
        pendentes = {i["documento"] for i in antes if i["pendente"]}
        self.assertEqual(pendentes, {Documento.TERMOS, Documento.PRIVACIDADE})

        self.client.post(self.aceitar_url)

        depois = self.client.get(self.status_url).data
        self.assertTrue(all(i["pendente"] is False for i in depois))
        self.assertTrue(
            RegistroDeAuditoria.objects.filter(
                acao=AcaoAuditoria.CONSENTIMENTO_ACEITO, actor=usuario
            ).exists()
        )


class ExclusaoFluxoTests(APITestCase):
    def setUp(self):
        self.solicitar_url = reverse("contas:excluir")
        self.confirmar_url = reverse("contas:excluir-confirmar")

    def test_solicitar_exige_autenticacao(self):
        self.assertEqual(
            self.client.post(self.solicitar_url).status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_solicitar_envia_email_e_nao_mexe_na_conta(self):
        usuario = criar_aluno("quero-sair")
        self.client.force_authenticate(usuario)

        resposta = self.client.post(self.solicitar_url)

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertTrue(resposta.data["email_enviado"])
        usuario.refresh_from_db()
        # Nada muda ainda: a conta segue ativa e não anonimizada.
        self.assertTrue(usuario.is_active)
        self.assertFalse(usuario.is_anonymized)
        self.assertTrue(
            RegistroDeAuditoria.objects.filter(
                acao=AcaoAuditoria.EXCLUSAO_SOLICITADA, actor=usuario
            ).exists()
        )

    def test_confirmar_com_token_e_senha_anonimiza_na_hora(self):
        usuario = criar_aluno("adeus")
        token = gerar_token(usuario)

        resposta = self.client.post(
            self.confirmar_url, {"token": token, "senha": SENHA_PADRAO}
        )

        self.assertEqual(resposta.status_code, status.HTTP_204_NO_CONTENT)
        usuario.refresh_from_db()
        self.assertTrue(usuario.is_anonymized)

    def test_confirmar_com_senha_errada_recusa(self):
        usuario = criar_aluno("com-senha-errada")
        token = gerar_token(usuario)

        resposta = self.client.post(
            self.confirmar_url, {"token": token, "senha": "senha-que-nao-e-8"}
        )

        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.get(pk=usuario.pk).is_anonymized)

    def test_confirmar_com_token_invalido_recusa(self):
        usuario = criar_aluno("token-ruim")

        resposta = self.client.post(
            self.confirmar_url, {"token": "nao-e-token", "senha": SENHA_PADRAO}
        )

        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.get(pk=usuario.pk).is_anonymized)
