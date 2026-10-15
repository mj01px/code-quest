from django.test import TestCase

from apps.clas.tests.helpers import dar_nivel
from apps.contas.tests.helpers import criar_aluno
from apps.gamificacao.services import adquirir_criatura
from apps.progressao.models import ProgressoCriatura
from apps.progressao.services import maior_nivel_do_usuario


class MaiorNivelTest(TestCase):
    def setUp(self):
        self.user = criar_aluno()

    def test_sem_criatura_e_zero(self):
        self.assertEqual(maior_nivel_do_usuario(self.user), 0)

    def test_criatura_sem_progresso_e_nivel_1(self):
        dar_nivel(self.user, 1)
        ProgressoCriatura.objects.all().delete()
        self.assertEqual(maior_nivel_do_usuario(self.user), 1)

    def test_vale_a_mais_forte_e_nao_a_ativa(self):
        dar_nivel(self.user, 7)
        adquirir_criatura(user=self.user, creature_slug="slyth")
        dar_nivel(self.user, 2, criatura="slyth")
        self.assertEqual(maior_nivel_do_usuario(self.user), 7)

    def test_nao_mistura_usuarios(self):
        dar_nivel(criar_aluno("outro"), 9)
        dar_nivel(self.user, 3)
        self.assertEqual(maior_nivel_do_usuario(self.user), 3)
