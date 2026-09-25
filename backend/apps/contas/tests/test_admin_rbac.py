"""Painel de RBAC do admin: catálogo de permissões, CRUD de níveis e a
atribuição de nível a usuários. Tudo restrito a administradores.
"""

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.contas.models import NivelDeAcesso, Permissao, User

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
