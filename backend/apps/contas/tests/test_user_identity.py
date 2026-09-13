"""O usuário é identificado por e-mail, e exibido por nickname.

Duas armadilhas de caixa alta protegidas aqui.

A primeira é o e-mail. `unique=True` compara byte a byte, então "Ana@x.com" e
"ana@x.com" conviveriam como contas diferentes. Como o login rebaixa o que é
digitado antes de comparar, a conta em caixa alta ficaria inalcançável: não
entraria e não conseguiria redefinir a senha, e a mensagem antienumeração
esconderia o motivo. Por isso o e-mail é rebaixado no `save`, que é o ponto por
onde passam API, shell e comandos de management.

A segunda é o nickname. Ali a caixa digitada PRECISA ser preservada, porque é
identidade pública exibida no ranking, mas dois nicknames que só diferem na
caixa não podem coexistir, senão dá para se passar por outro usuário. A
garantia é um índice único funcional sobre Lower(nickname).
"""

import uuid

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase

from apps.contas.models import User

from .helpers import SENHA_PADRAO, criar_aluno


class CriacaoDeUsuarioTest(TestCase):
    def test_email_e_gravado_em_minusculas(self):
        user = User.objects.create_user(
            email="Kiuev@Example.COM", nickname="Kiuev", password=SENHA_PADRAO
        )
        self.assertEqual(user.email, "kiuev@example.com")

    def test_nickname_preserva_a_caixa_digitada(self):
        user = criar_aluno("Kiuev")
        self.assertEqual(user.nickname, "Kiuev")

    def test_senha_e_hasheada_com_argon2(self):
        user = criar_aluno()
        self.assertTrue(user.password.startswith("argon2"))
        self.assertTrue(user.check_password(SENHA_PADRAO))
        self.assertFalse(user.check_password("senha-errada"))

    def test_chave_primaria_e_uuid_versao_7(self):
        user = criar_aluno()
        self.assertIsInstance(user.id, uuid.UUID)
        self.assertEqual(user.id.version, 7)

    def test_papel_padrao_e_aluno(self):
        self.assertEqual(criar_aluno().role, User.Role.STUDENT)

    def test_usuario_comum_nao_acessa_o_admin_do_django(self):
        user = criar_aluno()
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)

    def test_manager_exige_email_e_nickname(self):
        with self.assertRaises(ValueError):
            User.objects.create_user(email="", nickname="x", password=SENHA_PADRAO)
        with self.assertRaises(ValueError):
            User.objects.create_user(
                email="a@example.com", nickname="", password=SENHA_PADRAO
            )


class UnicidadeInsensivelACaixaTest(TestCase):
    def setUp(self):
        self.existente = criar_aluno("Kiuev")

    def test_nickname_em_caixa_diferente_e_recusado(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            User.objects.create_user(
                email="outro@example.com", nickname="kiuev", password=SENHA_PADRAO
            )

    def test_email_em_caixa_diferente_e_recusado(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            User.objects.create_user(
                email="KIUEV@example.com", nickname="outronick", password=SENHA_PADRAO
            )


class ValidacaoDeNicknameTest(TestCase):
    def _erros(self, nickname):
        prova = User(email="temp@example.com", nickname=nickname)
        with self.assertRaises(ValidationError) as ctx:
            prova.full_clean(exclude=["password"])
        return [e.code for e in ctx.exception.error_dict.get("nickname", [])]

    def test_curto_demais(self):
        self.assertIn("min_length", self._erros("ad"))

    def test_reservado(self):
        self.assertIn("nickname_reservado", self._erros("admin"))

    def test_reservado_ignora_a_caixa(self):
        self.assertIn("nickname_reservado", self._erros("RANKING"))

    def test_recusa_acento_espaco_e_hifen(self):
        for invalido in ("joão", "com espaco", "nick-hifen", "ponto.final"):
            with self.subTest(nickname=invalido):
                self.assertIn("nickname_invalido", self._erros(invalido))

    def test_nickname_valido_passa(self):
        prova = User(email="temp@example.com", nickname="julio_dev")
        prova.full_clean(exclude=["password"])


class SuperusuarioTest(TestCase):
    def setUp(self):
        self.superuser = User.objects.create_superuser(
            email="dev@codequest.local", nickname="devteam", password=SENHA_PADRAO
        )

    def test_recebe_papel_de_admin_do_produto(self):
        self.assertEqual(self.superuser.role, User.Role.ADMIN)
        self.assertTrue(self.superuser.is_platform_admin)

    def test_recebe_acesso_ao_admin_do_django(self):
        self.assertTrue(self.superuser.is_staff)
        self.assertTrue(self.superuser.is_superuser)

    def test_recusa_criacao_sem_os_dois_sinalizadores(self):
        with self.assertRaises(ValueError):
            User.objects.create_superuser(
                email="x@example.com",
                nickname="xis",
                password=SENHA_PADRAO,
                is_staff=False,
            )
