from django.test import TestCase
from django.utils import timezone

from apps.clas.tests.helpers import dar_nivel, montar_cla
from apps.conquistas.models import Conquista, ConquistaDesbloqueada, Criterio
from apps.conquistas.services import avaliar
from apps.contas.tests.helpers import criar_aluno
from apps.correcao.models import Modo, Veredito
from apps.gamificacao.services import select_starter_creature
from apps.progressao.models import EventoXP, TrilhaIniciada
from apps.progressao.tests.test_credito_xp import criar_exercicio

from .helpers import desbloqueadas, submeter


class CriteriosTest(TestCase):
    def setUp(self):
        self.user = criar_aluno()

    def _concluir(self, quantidade):
        inicio = EventoXP.objects.filter(user=self.user).count()
        for i in range(inicio, inicio + quantidade):
            EventoXP.objects.create(
                user=self.user, exercicio=criar_exercicio(slug=f"ex-{i}"), xp=50
            )

    def test_sem_atividade_nada_desbloqueia(self):
        self.assertEqual(avaliar(self.user), [])
        self.assertEqual(desbloqueadas(self.user), set())

    def test_escolher_criatura_desbloqueia_ovo_chocado(self):
        select_starter_creature(user=self.user, creature_slug="shellby")
        avaliar(self.user)
        self.assertEqual(desbloqueadas(self.user), {"ovo-chocado"})

    def test_metas_de_exercicios_concluidos(self):
        self._concluir(1)
        avaliar(self.user)
        self.assertIn("hello-world", desbloqueadas(self.user))
        self.assertNotIn("aquecendo-os-motores", desbloqueadas(self.user))

        self._concluir(4)
        avaliar(self.user)
        self.assertIn("aquecendo-os-motores", desbloqueadas(self.user))
        self.assertNotIn("engrenando", desbloqueadas(self.user))

        self._concluir(5)
        avaliar(self.user)
        self.assertIn("engrenando", desbloqueadas(self.user))

    def test_ajuste_de_xp_nao_conta_como_exercicio(self):
        EventoXP.objects.create(user=self.user, origem="AJUSTE", xp=500)
        avaliar(self.user)
        self.assertNotIn("hello-world", desbloqueadas(self.user))

    def test_iniciar_trilha_desbloqueia_explorador(self):
        TrilhaIniciada.objects.create(user=self.user, trilha=criar_exercicio().trilha)
        avaliar(self.user)
        self.assertIn("explorador", desbloqueadas(self.user))

    def test_nivel_dois_desbloqueia_level_up(self):
        dar_nivel(self.user, 1)
        avaliar(self.user)
        self.assertNotIn("level-up", desbloqueadas(self.user))

        dar_nivel(self.user, 2)
        avaliar(self.user)
        self.assertIn("level-up", desbloqueadas(self.user))

    def test_executar_codigo_desbloqueia_roda_na_minha_maquina(self):
        submeter(self.user, criar_exercicio(), Veredito.RESPOSTA_ERRADA, Modo.EXECUTAR)
        avaliar(self.user)
        self.assertIn("roda-na-minha-maquina", desbloqueadas(self.user))

    def test_aprovado_no_primeiro_envio_e_de_primeira(self):
        submeter(self.user, criar_exercicio())
        avaliar(self.user)
        self.assertIn("de-primeira", desbloqueadas(self.user))
        self.assertNotIn("debugger", desbloqueadas(self.user))

    def test_aprovado_depois_de_errar_e_debugger(self):
        exercicio = criar_exercicio()
        submeter(self.user, exercicio, Veredito.RESPOSTA_ERRADA)
        submeter(self.user, exercicio)
        avaliar(self.user)
        self.assertIn("debugger", desbloqueadas(self.user))
        self.assertNotIn("de-primeira", desbloqueadas(self.user))

    def test_erro_em_outro_exercicio_nao_conta_para_debugger(self):
        submeter(self.user, criar_exercicio(slug="a"), Veredito.RESPOSTA_ERRADA)
        submeter(self.user, criar_exercicio(slug="b"))
        avaliar(self.user)
        self.assertNotIn("debugger", desbloqueadas(self.user))
        self.assertIn("de-primeira", desbloqueadas(self.user))

    def test_execucao_reprovada_nao_conta_como_envio(self):
        exercicio = criar_exercicio()
        submeter(self.user, exercicio, Veredito.RESPOSTA_ERRADA, Modo.EXECUTAR)
        submeter(self.user, exercicio)
        avaliar(self.user)
        self.assertIn("de-primeira", desbloqueadas(self.user))
        self.assertNotIn("debugger", desbloqueadas(self.user))

    def test_tentativa_sem_resultado_do_judge0_e_ignorada(self):
        exercicio = criar_exercicio()
        submeter(self.user, exercicio, Veredito.ERRO_DE_EXECUCAO, hash="")
        submeter(self.user, exercicio)
        avaliar(self.user)
        self.assertIn("de-primeira", desbloqueadas(self.user))
        self.assertNotIn("debugger", desbloqueadas(self.user))

    def test_entrar_em_cla_desbloqueia_nao_estou_sozinho(self):
        montar_cla(self.user)
        avaliar(self.user)
        self.assertIn("nao-estou-sozinho", desbloqueadas(self.user))

    def test_avalia_so_os_criterios_pedidos(self):
        select_starter_creature(user=self.user, creature_slug="shellby")
        self._concluir(1)
        avaliar(self.user, [Criterio.EXERCICIOS_CONCLUIDOS])
        self.assertEqual(desbloqueadas(self.user), {"hello-world"})

    def test_reavaliar_nao_duplica(self):
        self._concluir(1)
        primeira = avaliar(self.user)
        segunda = avaliar(self.user)
        self.assertEqual([c.slug for c in primeira], ["hello-world"])
        self.assertEqual(segunda, [])
        self.assertEqual(
            ConquistaDesbloqueada.objects.filter(user=self.user).count(), 1
        )

    def test_conquista_inativa_nao_desbloqueia(self):
        Conquista.objects.filter(slug="hello-world").update(ativa=False)
        self._concluir(1)
        avaliar(self.user)
        self.assertNotIn("hello-world", desbloqueadas(self.user))

    def test_conta_inativa_nao_desbloqueia(self):
        self._concluir(1)
        self.user.is_active = False
        self.assertEqual(avaliar(self.user), [])

    def test_conta_anonimizada_nao_desbloqueia(self):
        self._concluir(1)
        self.user.anonymized_at = timezone.now()
        self.assertEqual(avaliar(self.user), [])
