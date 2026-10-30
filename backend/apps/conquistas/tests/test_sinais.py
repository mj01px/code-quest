from unittest import mock

from django.test import TestCase

from apps.clas.tests.helpers import montar_cla
from apps.contas.tests.helpers import criar_aluno
from apps.correcao.models import Veredito
from apps.gamificacao.services import select_starter_creature
from apps.progressao.services import creditar_exercicio, iniciar_trilha
from apps.progressao.tests.test_credito_xp import criar_exercicio

from .helpers import desbloqueadas, submeter


class SinaisTest(TestCase):
    def setUp(self):
        self.user = criar_aluno()

    def test_desbloqueio_so_acontece_depois_do_commit(self):
        with self.captureOnCommitCallbacks(execute=False) as callbacks:
            select_starter_creature(user=self.user, creature_slug="shellby")

        self.assertEqual(desbloqueadas(self.user), set())
        for callback in callbacks:
            callback()
        self.assertEqual(desbloqueadas(self.user), {"ovo-chocado"})

    def test_creditar_exercicio_desbloqueia_pelo_fluxo_real(self):
        with self.captureOnCommitCallbacks(execute=True):
            select_starter_creature(user=self.user, creature_slug="shellby")
        with self.captureOnCommitCallbacks(execute=True):
            creditar_exercicio(user=self.user, exercicio=criar_exercicio())

        self.assertEqual(
            desbloqueadas(self.user), {"ovo-chocado", "hello-world", "explorador"}
        )

    def test_subir_de_nivel_ao_creditar_desbloqueia_level_up(self):
        with self.captureOnCommitCallbacks(execute=True):
            select_starter_creature(user=self.user, creature_slug="shellby")
            for i in range(3):
                creditar_exercicio(
                    user=self.user, exercicio=criar_exercicio(slug=f"ex-{i}")
                )

        self.assertIn("level-up", desbloqueadas(self.user))

    def test_iniciar_trilha_desbloqueia_explorador(self):
        with self.captureOnCommitCallbacks(execute=True):
            iniciar_trilha(user=self.user, trilha=criar_exercicio().trilha)

        self.assertIn("explorador", desbloqueadas(self.user))

    def test_submissao_sem_resultado_nao_agenda_avaliacao(self):
        with self.captureOnCommitCallbacks() as callbacks:
            submeter(self.user, criar_exercicio(), Veredito.ERRO_DE_EXECUCAO, hash="")

        self.assertEqual(callbacks, [])

    def test_submissao_julgada_desbloqueia(self):
        with self.captureOnCommitCallbacks(execute=True):
            submeter(self.user, criar_exercicio())

        self.assertIn("de-primeira", desbloqueadas(self.user))

    def test_falha_ao_avaliar_e_logada_sem_propagar(self):
        # captureOnCommitCallbacks(execute=True) roda callbacks robust pelo
        # mesmo try/except do backend, que loga func.__qualname__. Com
        # functools.partial (sem __qualname__) o log virava AttributeError.
        exercicio = criar_exercicio()
        with (
            mock.patch(
                "apps.conquistas.signals.avaliar_por_id",
                side_effect=RuntimeError("falha simulada"),
            ),
            self.assertLogs("django.test", level="ERROR") as logs,
            self.captureOnCommitCallbacks(execute=True),
        ):
            submeter(self.user, exercicio)

        self.assertIn("falha simulada", logs.output[0])

    def test_entrar_em_cla_desbloqueia(self):
        with self.captureOnCommitCallbacks(execute=True):
            montar_cla(self.user)

        self.assertIn("nao-estou-sozinho", desbloqueadas(self.user))
