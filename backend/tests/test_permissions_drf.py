"""As permission classes traduzem capacidade em decisão de acesso na API.

Toda view declara explicitamente quem entra. O que este arquivo protege é a
semântica de cada classe, porque errar isso abre acesso em silêncio:

* `HasPerm` exige TODOS os codenames, `HasAnyPerm` exige apenas UM. Trocar um
  pelo outro por engano libera view administrativa para quem tem só metade do
  direito.
* `IsOwnerOrHasPerm` foi escrita sem consultar `role`, seguindo a lição do
  `IsOwnerOrAdmin` do summo-order: a regra é sobre ter o direito de ver tudo,
  não sobre ser administrador.
* Usuário anônimo é barrado em todas elas antes de qualquer consulta a
  permissão.
"""

from django.contrib.auth.models import AnonymousUser
from django.test import TestCase
from rest_framework.test import APIRequestFactory

from apps.core.permissions import HasAnyPerm, HasPerm, IsAdmin, IsOwnerOrHasPerm
from apps.gamificacao.services import select_starter_creature

from .helpers import criar_admin, criar_aluno, criar_autor


class PermissionClassTestCase(TestCase):
    factory = APIRequestFactory()

    def permite(self, classe, user) -> bool:
        request = self.factory.get("/api/v1/qualquer")
        request.user = user
        return classe().has_permission(request, None)

    def permite_objeto(self, classe, user, obj) -> bool:
        request = self.factory.get("/api/v1/qualquer")
        request.user = user
        return classe().has_object_permission(request, None, obj)


class IsAdminTest(PermissionClassTestCase):
    @classmethod
    def setUpTestData(cls):
        cls.aluno = criar_aluno()
        cls.autor = criar_autor()
        cls.admin = criar_admin()

    def test_passa_para_admin(self):
        self.assertTrue(self.permite(IsAdmin, self.admin))

    def test_barra_autor_e_aluno(self):
        self.assertFalse(self.permite(IsAdmin, self.autor))
        self.assertFalse(self.permite(IsAdmin, self.aluno))

    def test_barra_anonimo(self):
        self.assertFalse(self.permite(IsAdmin, AnonymousUser()))


class HasPermTest(PermissionClassTestCase):
    @classmethod
    def setUpTestData(cls):
        cls.aluno = criar_aluno()
        cls.autor = criar_autor()

    def test_passa_com_o_codename_concedido(self):
        self.assertTrue(self.permite(HasPerm("trilhas.create"), self.autor))

    def test_barra_sem_o_codename(self):
        self.assertFalse(self.permite(HasPerm("trilhas.create"), self.aluno))

    def test_exige_todos_os_codenames(self):
        classe = HasPerm("trilhas.create", "trilhas.publish")
        self.assertFalse(self.permite(classe, self.autor))

    def test_any_exige_apenas_um(self):
        classe = HasAnyPerm("trilhas.create", "trilhas.publish")
        self.assertTrue(self.permite(classe, self.autor))

    def test_barra_anonimo(self):
        self.assertFalse(self.permite(HasPerm("trilhas.view"), AnonymousUser()))

    def test_fabrica_sem_codename_estoura_na_definicao(self):
        # Melhor falhar ao importar o módulo da view do que deixar uma
        # permissão que não exige nada passar despercebida em produção.
        with self.assertRaises(ValueError):
            HasPerm()
        with self.assertRaises(ValueError):
            HasAnyPerm()


class IsOwnerOrHasPermTest(PermissionClassTestCase):
    """Usa UserCreature como objeto com dono, que é um caso real do projeto."""

    @classmethod
    def setUpTestData(cls):
        cls.aluno = criar_aluno()
        cls.outro = criar_aluno("outroaluno")
        cls.admin = criar_admin()
        cls.posse = select_starter_creature(user=cls.aluno, creature_slug="shellby")

    def setUp(self):
        self.classe = IsOwnerOrHasPerm("submissoes.view_all")

    def test_dono_acessa_o_proprio_registro(self):
        self.assertTrue(self.permite_objeto(self.classe, self.aluno, self.posse))

    def test_terceiro_sem_permissao_e_barrado(self):
        self.assertFalse(self.permite_objeto(self.classe, self.outro, self.posse))

    def test_quem_tem_o_codename_acessa_qualquer_registro(self):
        self.assertTrue(self.permite_objeto(self.classe, self.admin, self.posse))

    def test_objeto_que_e_o_proprio_usuario_e_reconhecido(self):
        self.assertTrue(self.permite_objeto(self.classe, self.aluno, self.aluno))

    def test_has_permission_exige_apenas_autenticacao(self):
        self.assertTrue(self.permite(self.classe, self.outro))
        self.assertFalse(self.permite(self.classe, AnonymousUser()))
