"""O controle de acesso vem do nível de acesso do usuário, não das tabelas de
permissão do Django.

`auth_permission` e `auth_group` não são usados. Quem decide é o `has_perm`:
todo usuário tem exatamente as permissões do seu `nivel_de_acesso` (tabela
dinâmica semeada a partir do catálogo estático em `apps/contas/rbac.py`). Não há
curto-circuito por papel — um admin tem tudo porque o nível "Admin" concede o
catálogo inteiro. Mantemos `has_perm` como interface do Django para que as views
perguntem pela capacidade e não pelo cargo.

Duas regras aqui não são detalhe de implementação e sim exigência escrita:

* O AUTOR nunca publica a própria produção. A monografia diz textualmente que
  "o autor escreve e submete o material, mas nunca publica"; se alguém um dia
  acrescentar `trilhas.publish` ao conjunto do autor, o fluxo editorial inteiro
  perde sentido e o teste quebra.

* Conta inativa não tem permissão nenhuma, nem sendo ADMIN. Sem isso, uma conta
  suspensa seguiria autorizada caso algum caminho de autenticação a deixasse
  passar.
"""

from django.test import TestCase

from apps.contas.models import NivelDeAcesso, User
from apps.contas.rbac import (
    ALL_CODENAMES,
    CATALOG,
    ROLE_PERMISSIONS,
    permissions_for_role,
)

from .helpers import criar_admin, criar_aluno, criar_autor


class CatalogoTest(TestCase):
    def test_codenames_seguem_o_formato_modulo_acao(self):
        for spec in CATALOG:
            with self.subTest(codename=spec.codename):
                modulo, _, acao = spec.codename.partition(".")
                self.assertTrue(modulo and acao)
                self.assertEqual(spec.module, modulo)

    def test_nao_ha_codename_duplicado(self):
        self.assertEqual(len(CATALOG), len(ALL_CODENAMES))

    def test_toda_permissao_tem_rotulo_legivel(self):
        for spec in CATALOG:
            with self.subTest(codename=spec.codename):
                self.assertTrue(spec.label.strip())

    def test_mapa_de_papeis_nao_concede_codename_fora_do_catalogo(self):
        for role, concedidas in ROLE_PERMISSIONS.items():
            with self.subTest(role=role):
                self.assertEqual(concedidas - ALL_CODENAMES, set())

    def test_mapa_de_papeis_e_somente_leitura(self):
        with self.assertRaises(TypeError):
            ROLE_PERMISSIONS["ALUNO"] = frozenset({"usuarios.suspend"})

    def test_papel_desconhecido_falha_fechado(self):
        self.assertEqual(permissions_for_role("PAPEL_INEXISTENTE"), frozenset())


class HierarquiaTest(TestCase):
    def test_cada_papel_contem_estritamente_o_anterior(self):
        aluno = permissions_for_role(User.Role.STUDENT)
        autor = permissions_for_role(User.Role.AUTHOR)
        admin = permissions_for_role(User.Role.ADMIN)
        self.assertLess(aluno, autor)
        self.assertLess(autor, admin)

    def test_admin_detem_o_catalogo_inteiro(self):
        self.assertEqual(permissions_for_role(User.Role.ADMIN), ALL_CODENAMES)


class HasPermPorPapelTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.aluno = criar_aluno()
        cls.autor = criar_autor()
        cls.admin = criar_admin()

    def test_aluno(self):
        self.assertTrue(self.aluno.has_perm("trilhas.view"))
        self.assertTrue(self.aluno.has_perm("submissoes.create"))
        self.assertFalse(self.aluno.has_perm("trilhas.create"))
        self.assertFalse(self.aluno.has_perm("usuarios.suspend"))

    def test_autor_acumula_o_que_o_aluno_tem(self):
        self.assertTrue(self.autor.has_perm("trilhas.view"))
        self.assertTrue(self.autor.has_perm("submissoes.create"))
        self.assertTrue(self.autor.has_perm("trilhas.create"))
        self.assertTrue(self.autor.has_perm("trilhas.view_solution"))

    def test_autor_nunca_publica_a_propria_producao(self):
        self.assertFalse(self.autor.has_perm("trilhas.review"))
        self.assertFalse(self.autor.has_perm("trilhas.publish"))

    def test_admin_tem_o_catalogo_inteiro_pelo_nivel(self):
        self.assertTrue(self.admin.has_perm("trilhas.publish"))
        self.assertTrue(self.admin.has_perm("auditoria.view"))
        # Sem curto-circuito por papel: o admin tem tudo porque o nível "Admin"
        # concede o catálogo inteiro — mas não uma permissão fora dele.
        self.assertFalse(self.admin.has_perm("codename.inexistente"))


class ContaInativaTest(TestCase):
    def test_admin_suspenso_perde_todas_as_permissoes(self):
        admin = criar_admin()
        admin.is_active = False
        self.assertFalse(admin.has_perm("trilhas.publish"))

    def test_reativar_devolve_as_permissoes(self):
        admin = criar_admin("readmitido")
        admin.is_active = False
        admin.is_active = True
        self.assertTrue(admin.has_perm("trilhas.publish"))

    def test_aluno_suspenso_perde_ate_o_basico(self):
        aluno = criar_aluno("suspenso")
        aluno.is_active = False
        self.assertFalse(aluno.has_perm("trilhas.view"))


class CacheDePermissaoTest(TestCase):
    """O cache é chaveado por papel + nível, então se invalida sozinho.

    As permissões vêm do nível de acesso; trocar o nível na mesma instância
    precisa refletir imediatamente, sem invalidação manual.
    """

    def test_promover_de_nivel_na_mesma_instancia_reflete_na_hora(self):
        autor = NivelDeAcesso.objects.get(nome="Autor")
        user = criar_aluno("promovido")
        self.assertFalse(user.has_perm("trilhas.create"))
        user.nivel_de_acesso = autor
        self.assertTrue(user.has_perm("trilhas.create"))

    def test_rebaixar_de_nivel_na_mesma_instancia_reflete_na_hora(self):
        aluno = NivelDeAcesso.objects.get(nome="Aluno")
        user = criar_autor("rebaixado")
        self.assertTrue(user.has_perm("trilhas.create"))
        user.nivel_de_acesso = aluno
        self.assertFalse(user.has_perm("trilhas.create"))

    def test_consultas_repetidas_devolvem_o_mesmo_conjunto(self):
        user = criar_autor("repetido")
        self.assertIs(user.get_role_permissions(), user.get_role_permissions())


class AdminVemDoNivelTest(TestCase):
    """Ser admin da plataforma passou a depender do nível, não do papel."""

    def test_is_platform_admin_segue_o_nivel(self):
        admin = criar_admin("chefe")
        self.assertTrue(admin.is_platform_admin)
        admin.nivel_de_acesso = NivelDeAcesso.objects.get(nome="Aluno")
        self.assertFalse(admin.is_platform_admin)
        self.assertFalse(admin.has_perm("auditoria.view"))

    def test_nivel_customizado_pode_conceder_o_painel(self):
        user = criar_aluno("gerente")
        self.assertFalse(user.is_platform_admin)
        user.nivel_de_acesso = NivelDeAcesso.objects.create(
            nome="suporte", acesso_admin=True
        )
        self.assertTrue(user.is_platform_admin)
