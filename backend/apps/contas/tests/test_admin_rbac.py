"""Painel de RBAC do admin: catálogo de permissões, CRUD de níveis e a
atribuição de nível a usuários. Tudo restrito a administradores.
"""

from unittest.mock import patch

from django.db.models import ProtectedError
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.auditoria.models import AcaoAuditoria, RegistroDeAuditoria
from apps.contas.models import NivelDeAcesso, Permissao

from .helpers import criar_admin, criar_aluno


class AcessoRestritoTest(APITestCase):
    def test_anonimo_recebe_401(self):
        r = self.client.get(reverse("contas:admin-niveis"))
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_aluno_recebe_403(self):
        self.client.force_authenticate(criar_aluno())
        r = self.client.get(reverse("contas:admin-niveis"))
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_entra(self):
        self.client.force_authenticate(criar_admin())
        r = self.client.get(reverse("contas:admin-niveis"))
        self.assertEqual(r.status_code, status.HTTP_200_OK)


class CatalogoEListasTest(APITestCase):
    def setUp(self):
        self.client.force_authenticate(criar_admin())

    def test_permissoes_lista_o_catalogo(self):
        r = self.client.get(reverse("contas:admin-permissoes"))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data), Permissao.objects.count())
        self.assertEqual(set(r.data[0]), {"codename", "rotulo", "modulo"})

    def test_niveis_trazem_permissoes_por_codename_e_contagem(self):
        r = self.client.get(reverse("contas:admin-niveis"))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        admin = next(n for n in r.data if n["nome"] == "Admin")
        self.assertTrue(admin["sistema"])
        self.assertIn("auditoria.view", admin["permissoes"])
        self.assertGreaterEqual(admin["qtd_usuarios"], 1)

    def test_usuarios_lista_nickname_email_cadastro_e_nivel(self):
        criar_aluno("visivel")
        r = self.client.get(reverse("contas:admin-usuarios"))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        linha = next(u for u in r.data if u["nickname"] == "visivel")
        self.assertEqual(linha["nivel"]["nome"], "Aluno")
        self.assertIn("email", linha)
        self.assertIn("criado_em", linha)


class CrudDeNivelTest(APITestCase):
    def setUp(self):
        self.client.force_authenticate(criar_admin())

    def test_cria_nivel_com_subconjunto_de_permissoes(self):
        r = self.client.post(
            reverse("contas:admin-niveis"),
            {
                "nome": "aluno_sem_criatura",
                "descricao": "Aluno sem gamificação.",
                "permissoes": ["trilhas.view"],
            },
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        nivel = NivelDeAcesso.objects.get(nome="aluno_sem_criatura")
        self.assertFalse(nivel.sistema)
        self.assertEqual(
            list(nivel.permissoes.values_list("codename", flat=True)), ["trilhas.view"]
        )

    def test_nome_duplicado_e_recusado(self):
        r = self.client.post(
            reverse("contas:admin-niveis"), {"nome": "Aluno"}, format="json"
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_editar_permissoes_de_um_nivel(self):
        nivel = NivelDeAcesso.objects.create(nome="editavel")
        r = self.client.patch(
            reverse("contas:admin-nivel", kwargs={"pk": nivel.pk}),
            {"permissoes": ["trilhas.view", "submissoes.create"]},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(nivel.permissoes.count(), 2)

    def test_nao_apaga_nivel_de_sistema(self):
        admin = NivelDeAcesso.objects.get(nome="Admin")
        r = self.client.delete(
            reverse("contas:admin-nivel", kwargs={"pk": admin.pk})
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nao_apaga_nivel_com_usuarios(self):
        nivel = NivelDeAcesso.objects.create(nome="ocupado")
        criar_aluno("morador", nivel_de_acesso=nivel)
        r = self.client.delete(
            reverse("contas:admin-nivel", kwargs={"pk": nivel.pk})
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_apaga_nivel_vazio(self):
        nivel = NivelDeAcesso.objects.create(nome="descartavel")
        r = self.client.delete(
            reverse("contas:admin-nivel", kwargs={"pk": nivel.pk})
        )
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(NivelDeAcesso.objects.filter(pk=nivel.pk).exists())


class AtribuirNivelTest(APITestCase):
    def setUp(self):
        self.admin = criar_admin()
        self.client.force_authenticate(self.admin)

    def test_troca_nivel_e_muda_as_permissoes(self):
        alvo = criar_aluno("alvo")
        so_view = NivelDeAcesso.objects.create(nome="so_view")
        so_view.permissoes.set(Permissao.objects.filter(codename="trilhas.view"))

        r = self.client.patch(
            reverse("contas:admin-usuario-nivel", kwargs={"pk": alvo.pk}),
            {"nivel_de_acesso": str(so_view.pk)},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["nivel"]["nome"], "so_view")

        alvo.refresh_from_db()
        self.assertTrue(alvo.has_perm("trilhas.view"))
        # Perdeu o que só o nível Aluno dava.
        self.assertFalse(alvo.has_perm("submissoes.create"))

    def test_remove_nivel_com_null(self):
        alvo = criar_aluno("sem_nivel")
        r = self.client.patch(
            reverse("contas:admin-usuario-nivel", kwargs={"pk": alvo.pk}),
            {"nivel_de_acesso": None},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIsNone(r.data["nivel"])
        alvo.refresh_from_db()
        self.assertIsNone(alvo.nivel_de_acesso)

    def test_rebaixar_outro_admin_via_nivel_remove_o_acesso(self):
        outro = criar_admin("outro_admin")
        self.assertTrue(outro.is_platform_admin)
        aluno = NivelDeAcesso.objects.get(nome="Aluno")

        r = self.client.patch(
            reverse("contas:admin-usuario-nivel", kwargs={"pk": outro.pk}),
            {"nivel_de_acesso": str(aluno.pk)},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)

        outro.refresh_from_db()
        self.assertFalse(outro.is_platform_admin)
        self.assertFalse(outro.has_perm("auditoria.view"))

    def test_nao_posso_rebaixar_a_mim_mesmo(self):
        aluno = NivelDeAcesso.objects.get(nome="Aluno")
        r = self.client.patch(
            reverse("contas:admin-usuario-nivel", kwargs={"pk": self.admin.pk}),
            {"nivel_de_acesso": str(aluno.pk)},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_platform_admin)


# Mesmo ponto de falha usado em apps/auditoria/tests/test_auditoria.py.
GRAVACAO_DA_AUDITORIA = "apps.auditoria.services.RegistroDeAuditoria.objects.create"


class AuditoriaDoPainelTest(APITestCase):
    """Toda mutação do painel deixa rastro, e a falha da auditoria não a derruba."""

    def setUp(self):
        self.admin = criar_admin()
        self.client.force_authenticate(self.admin)

    def _registro(self, acao):
        return RegistroDeAuditoria.objects.get(acao=acao)

    def _sem_registro(self, acao):
        return not RegistroDeAuditoria.objects.filter(acao=acao).exists()

    def _falhando_a_auditoria(self):
        return patch(GRAVACAO_DA_AUDITORIA, side_effect=RuntimeError("banco fora"))

    # criar nível

    def _criar(self):
        return self.client.post(
            reverse("contas:admin-niveis"),
            {"nome": "revisor", "descricao": "Só revisa.", "permissoes": ["trilhas.view"]},
            format="json",
        )

    def test_criar_nivel_registra_ator_e_alvo(self):
        r = self._criar()
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        registro = self._registro(AcaoAuditoria.NIVEL_CRIADO)
        self.assertEqual(registro.actor, self.admin)
        self.assertEqual(registro.alvo_tipo, "niveldeacesso")
        self.assertEqual(registro.alvo_id, str(r.data["id"]))

    def test_criar_nivel_guarda_o_estado_inicial(self):
        self._criar()
        self.assertEqual(
            self._registro(AcaoAuditoria.NIVEL_CRIADO).metadata,
            {
                "nome": "revisor",
                "descricao": "Só revisa.",
                "acesso_admin": False,
                "permissoes": ["trilhas.view"],
            },
        )

    def test_criar_nivel_sobrevive_a_falha_da_auditoria(self):
        with self._falhando_a_auditoria(), self.assertLogs("apps.auditoria", "WARNING"):
            r = self._criar()
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertTrue(NivelDeAcesso.objects.filter(nome="revisor").exists())
        self.assertTrue(self._sem_registro(AcaoAuditoria.NIVEL_CRIADO))

    # editar nível

    def _nivel_editavel(self):
        nivel = NivelDeAcesso.objects.create(nome="editavel", descricao="velha")
        nivel.permissoes.set(Permissao.objects.filter(codename="trilhas.view"))
        return nivel

    def _editar(self, nivel):
        return self.client.patch(
            reverse("contas:admin-nivel", kwargs={"pk": nivel.pk}),
            {"descricao": "nova", "permissoes": ["trilhas.view", "submissoes.create"]},
            format="json",
        )

    def test_editar_nivel_registra_ator_e_alvo(self):
        nivel = self._nivel_editavel()
        r = self._editar(nivel)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        registro = self._registro(AcaoAuditoria.NIVEL_EDITADO)
        self.assertEqual(registro.actor, self.admin)
        self.assertEqual(registro.alvo_tipo, "niveldeacesso")
        self.assertEqual(registro.alvo_id, str(nivel.pk))

    def test_editar_nivel_guarda_antes_e_depois_so_do_que_mudou(self):
        self._editar(self._nivel_editavel())
        self.assertEqual(
            self._registro(AcaoAuditoria.NIVEL_EDITADO).metadata,
            {
                "antes": {"descricao": "velha", "permissoes": ["trilhas.view"]},
                "depois": {
                    "descricao": "nova",
                    "permissoes": ["submissoes.create", "trilhas.view"],
                },
            },
        )

    def test_patch_sem_mudanca_nao_cria_registro(self):
        nivel = self._nivel_editavel()
        r = self.client.patch(
            reverse("contas:admin-nivel", kwargs={"pk": nivel.pk}),
            {"descricao": "velha", "permissoes": ["trilhas.view"]},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertTrue(self._sem_registro(AcaoAuditoria.NIVEL_EDITADO))

    def test_editar_nivel_sobrevive_a_falha_da_auditoria(self):
        nivel = self._nivel_editavel()
        with self._falhando_a_auditoria(), self.assertLogs("apps.auditoria", "WARNING"):
            r = self._editar(nivel)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        nivel.refresh_from_db()
        self.assertEqual(nivel.descricao, "nova")
        self.assertTrue(self._sem_registro(AcaoAuditoria.NIVEL_EDITADO))

    # remover nível

    def _nivel_descartavel(self):
        nivel = NivelDeAcesso.objects.create(nome="descartavel")
        nivel.permissoes.set(Permissao.objects.filter(codename="trilhas.view"))
        return nivel

    def _remover(self, nivel):
        return self.client.delete(reverse("contas:admin-nivel", kwargs={"pk": nivel.pk}))

    def test_remover_nivel_registra_ator_e_alvo(self):
        nivel = self._nivel_descartavel()
        pk = str(nivel.pk)
        r = self._remover(nivel)
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        registro = self._registro(AcaoAuditoria.NIVEL_REMOVIDO)
        self.assertEqual(registro.actor, self.admin)
        self.assertEqual(registro.alvo_tipo, "niveldeacesso")
        self.assertEqual(registro.alvo_id, pk)

    def test_remover_nivel_guarda_o_que_foi_removido(self):
        self._remover(self._nivel_descartavel())
        self.assertEqual(
            self._registro(AcaoAuditoria.NIVEL_REMOVIDO).metadata,
            {
                "nome": "descartavel",
                "descricao": "",
                "acesso_admin": False,
                "permissoes": ["trilhas.view"],
            },
        )

    def test_remover_nivel_sobrevive_a_falha_da_auditoria(self):
        nivel = self._nivel_descartavel()
        with self._falhando_a_auditoria(), self.assertLogs("apps.auditoria", "WARNING"):
            r = self._remover(nivel)
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(NivelDeAcesso.objects.filter(pk=nivel.pk).exists())
        self.assertTrue(self._sem_registro(AcaoAuditoria.NIVEL_REMOVIDO))

    def test_remover_nivel_que_falha_nao_deixa_registro(self):
        # Único caso em que o registro vem antes da ação: o atomic() tem de
        # desfazê-lo se o delete() cair (ex.: PROTECT de um usuário atribuído
        # entre a checagem e o delete).
        nivel = self._nivel_descartavel()
        with patch.object(
            NivelDeAcesso, "delete", side_effect=ProtectedError("em uso", set())
        ), self.assertRaises(ProtectedError):
            self._remover(nivel)
        self.assertTrue(NivelDeAcesso.objects.filter(pk=nivel.pk).exists())
        self.assertTrue(self._sem_registro(AcaoAuditoria.NIVEL_REMOVIDO))

    # atribuir nível a um usuário

    def _atribuir(self, usuario, nivel, **extra):
        return self.client.patch(
            reverse("contas:admin-usuario-nivel", kwargs={"pk": usuario.pk}),
            {"nivel_de_acesso": str(nivel.pk)},
            format="json",
            **extra,
        )

    def test_atribuir_nivel_registra_ator_e_usuario_como_alvo(self):
        alvo = criar_aluno("alvo")
        r = self._atribuir(alvo, NivelDeAcesso.objects.create(nome="so_view"))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        registro = self._registro(AcaoAuditoria.NIVEL_ATRIBUIDO)
        self.assertEqual(registro.actor, self.admin)
        self.assertEqual(registro.alvo_tipo, "user")
        self.assertEqual(registro.alvo_id, str(alvo.pk))

    def test_atribuir_nivel_guarda_nivel_anterior_e_novo(self):
        aluno = NivelDeAcesso.objects.get(nome="Aluno")
        so_view = NivelDeAcesso.objects.create(nome="so_view")
        self._atribuir(criar_aluno("alvo"), so_view)
        self.assertEqual(
            self._registro(AcaoAuditoria.NIVEL_ATRIBUIDO).metadata,
            {
                "nivel_anterior": {"id": str(aluno.pk), "nome": "Aluno"},
                "nivel_novo": {"id": str(so_view.pk), "nome": "so_view"},
            },
        )

    def test_atribuir_nivel_sobrevive_a_falha_da_auditoria(self):
        alvo = criar_aluno("alvo")
        so_view = NivelDeAcesso.objects.create(nome="so_view")
        with self._falhando_a_auditoria(), self.assertLogs("apps.auditoria", "WARNING"):
            r = self._atribuir(alvo, so_view)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        alvo.refresh_from_db()
        self.assertEqual(alvo.nivel_de_acesso, so_view)
        self.assertTrue(self._sem_registro(AcaoAuditoria.NIVEL_ATRIBUIDO))

    def test_falha_real_no_save_da_auditoria_nao_desfaz_a_acao(self):
        # Falha real, não mock: o IP inválido quebra dentro do save() do
        # registro. O save() marca para rollback o atomic() da view; sem o
        # savepoint do registrar(), a troca some com resposta 200.
        alvo = criar_aluno("alvo")
        so_view = NivelDeAcesso.objects.create(nome="so_view")
        with self.assertLogs("apps.auditoria", "WARNING"):
            r = self._atribuir(alvo, so_view, REMOTE_ADDR="nao-e-ip")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        alvo.refresh_from_db()
        self.assertEqual(alvo.nivel_de_acesso, so_view)
        self.assertTrue(self._sem_registro(AcaoAuditoria.NIVEL_ATRIBUIDO))
