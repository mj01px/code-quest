"""Painel de usuários do admin: busca por `?q=` e exclusão por anonimização."""

from datetime import date

import pyotp
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from apps.auditoria.models import AcaoAuditoria, RegistroDeAuditoria
from apps.contas.lgpd import anonimizar_conta
from apps.contas.models import (
    CodigoRecuperacaoMFA,
    ConfiguracaoMFA,
    NivelDeAcesso,
    User,
)
from apps.progressao.models import EventoXP, Origem

from .helpers import criar_admin, criar_aluno


class BuscaDeUsuariosTest(APITestCase):
    def setUp(self):
        self.client.force_authenticate(criar_admin())
        monitor = NivelDeAcesso.objects.create(nome="monitoria")
        criar_aluno("maria")
        criar_aluno("joao", nivel_de_acesso=monitor)

    def buscar(self, termo):
        r = self.client.get(reverse("contas:admin-usuarios"), {"q": termo})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        return sorted(u["nickname"] for u in r.data)

    def test_busca_por_nickname_email_e_nivel_sem_caixa(self):
        self.assertEqual(self.buscar("MAR"), ["maria"])
        self.assertEqual(self.buscar("joao@example"), ["joao"])
        self.assertEqual(self.buscar("monitor"), ["joao"])

    def test_sem_termo_lista_todos(self):
        self.assertEqual(self.buscar("  "), ["administrador", "joao", "maria"])


SEGREDO_TOTP = pyotp.random_base32()


class ExclusaoPeloAdminTest(APITestCase):
    def setUp(self):
        self.admin = criar_admin()
        ConfiguracaoMFA.objects.create(
            user=self.admin,
            ativo=True,
            metodo=ConfiguracaoMFA.Metodo.APP,
            totp_secret=SEGREDO_TOTP,
        )
        self.aluno = criar_aluno()
        self.client.force_authenticate(self.admin)

    def url(self, user):
        return reverse("contas:admin-usuario", args=[user.pk])

    def excluir(self, user, codigo=None):
        corpo = {"totp_code": pyotp.TOTP(SEGREDO_TOTP).now() if codigo is None else codigo}
        return self.client.delete(self.url(user), corpo, format="json")

    def assert_recusado(self, resposta, codigo):
        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(resposta.data["error"]["code"], codigo)
        self.aluno.refresh_from_db()
        self.assertFalse(self.aluno.is_anonymized)

    def test_sem_codigo_2fa_nao_anonimiza(self):
        self.assert_recusado(
            self.client.delete(self.url(self.aluno), format="json"), "totp_invalido"
        )

    def test_codigo_2fa_errado_nao_anonimiza(self):
        certo = pyotp.TOTP(SEGREDO_TOTP).now()
        errado = f"{(int(certo) + 500000) % 1000000:06d}"
        self.assert_recusado(self.excluir(self.aluno, errado), "totp_invalido")

    def test_codigo_de_recuperacao_nao_autoriza_exclusao(self):
        from apps.contas.mfa import gerar_codigos_recuperacao

        recuperacao = gerar_codigos_recuperacao(self.admin)[0]
        self.assert_recusado(self.excluir(self.aluno, recuperacao), "totp_invalido")

    def test_admin_sem_autenticador_nao_exclui(self):
        ConfiguracaoMFA.objects.filter(user=self.admin).update(ativo=False)
        # Instância nova, como numa requisição real: a do setUp guarda `mfa` em cache.
        self.client.force_authenticate(User.objects.get(pk=self.admin.pk))
        self.assert_recusado(self.excluir(self.aluno), "mfa_necessario")

    def test_nao_exclui_outro_admin(self):
        outro = criar_admin("outro_admin")
        r = self.excluir(outro)

        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data["error"]["code"], "alvo_admin")
        outro.refresh_from_db()
        self.assertFalse(outro.is_anonymized)

    def test_admin_nao_exclui_a_propria_conta(self):
        r = self.excluir(self.admin)

        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data["error"]["code"], "auto_exclusao")
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_active)
        self.assertFalse(self.admin.is_anonymized)

    def test_anonimiza_em_vez_de_apagar_e_mantem_progresso(self):
        EventoXP.objects.create(user=self.aluno, xp=50, origem=Origem.AJUSTE)

        r = self.excluir(self.aluno)

        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        aluno = User.objects.get(pk=self.aluno.pk)
        self.assertFalse(aluno.is_active)
        self.assertTrue(aluno.is_anonymized)
        self.assertTrue(aluno.email.endswith("@anonimizado.invalid"))
        self.assertTrue(aluno.nickname.startswith("anon_"))
        self.assertFalse(aluno.has_usable_password())
        self.assertEqual(EventoXP.objects.filter(user=aluno).count(), 1)
        self.assertTrue(
            RegistroDeAuditoria.objects.filter(
                acao=AcaoAuditoria.CONTA_ANONIMIZADA,
                actor=self.admin,
                alvo_id=str(aluno.pk),
            ).exists()
        )

    def test_nao_sobra_pii_derivada_e_sessoes_caem(self):
        User.objects.filter(pk=self.aluno.pk).update(birth_date=date(2000, 1, 1))
        RegistroDeAuditoria.objects.create(
            acao=AcaoAuditoria.LOGIN_OK, actor=self.aluno, ip="10.0.0.1", user_agent="ua"
        )
        ConfiguracaoMFA.objects.create(user=self.aluno, totp_secret="segredo")
        CodigoRecuperacaoMFA.objects.create(user=self.aluno, codigo_hash="h")
        RefreshToken.for_user(self.aluno)

        self.excluir(self.aluno)

        self.assertIsNone(User.objects.get(pk=self.aluno.pk).birth_date)
        self.assertFalse(
            RegistroDeAuditoria.objects.filter(actor=self.aluno)
            .exclude(ip=None, user_agent="")
            .exists()
        )
        self.assertFalse(ConfiguracaoMFA.objects.filter(user=self.aluno).exists())
        self.assertFalse(CodigoRecuperacaoMFA.objects.filter(user=self.aluno).exists())
        self.assertFalse(
            OutstandingToken.objects.filter(
                user=self.aluno, blacklistedtoken__isnull=True
            ).exists()
        )

    def test_inexistente_da_404_e_anonimo_401(self):
        r = self.client.delete(
            reverse("contas:admin-usuario", args=["01a17599-0000-7000-8000-000000000000"])
        )
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

        self.client.force_authenticate(None)
        self.assertEqual(
            self.excluir(self.aluno).status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_mesmo_codigo_nao_autoriza_segunda_exclusao(self):
        codigo = pyotp.TOTP(SEGREDO_TOTP).now()
        outro = criar_aluno("outro")
        self.assertEqual(self.excluir(outro, codigo).status_code, 204)

        self.assert_recusado(self.excluir(self.aluno, codigo), "totp_invalido")

    def test_conta_ja_anonimizada_responde_204_sem_novo_registro(self):
        anonimizar_conta(self.aluno)
        r = self.excluir(self.aluno)

        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            RegistroDeAuditoria.objects.filter(
                acao=AcaoAuditoria.CONTA_ANONIMIZADA, actor=self.admin
            ).exists()
        )

    def test_corpo_que_nao_e_objeto_e_recusado_sem_500(self):
        r = self.client.delete(self.url(self.aluno), [], format="json")
        self.assert_recusado(r, "totp_invalido")

    def test_prova_obrigatoria_diz_qual_admin_pediu(self):
        self.excluir(self.aluno)

        prova = RegistroDeAuditoria.objects.get(
            acao=AcaoAuditoria.CONTA_ANONIMIZADA, actor=self.aluno
        )
        self.assertEqual(prova.metadata, {"por_admin": str(self.admin.pk), "com_2fa": True})
        self.assertEqual(
            prova.detalhes,
            "Anonimizada pelo painel do admin, com confirmação em duas etapas",
        )

    def test_aluno_nao_exclui_ninguem(self):
        self.client.force_authenticate(self.aluno)
        r = self.excluir(self.admin)
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
