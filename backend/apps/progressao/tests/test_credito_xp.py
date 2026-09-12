"""O crédito de XP é a única porta de entrada do progresso.

Os testes aqui cobrem o que não pode falhar por descuido: o valor vir da
dificuldade cadastrada e não de fora, o mesmo exercício pagar uma vez só, e a
criatura evoluir junto quando o nível cruza o limiar do catálogo.
"""

from datetime import timedelta
from unittest import mock

from django.core.exceptions import ValidationError
from django.db import connection
from django.db.models import F
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.utils import timezone

from apps.gamificacao.models import Stage, UserCreature
from apps.gamificacao.services import select_starter_creature
from apps.progressao import services
from apps.progressao.models import EventoXP, ProgressoCriatura
from apps.progressao.services import creditar_exercicio
from apps.trilhas.models import Aula, Dificuldade, Exercicio, StatusEditorial, Trilha
from tests.helpers import criar_aluno


def criar_exercicio(dificuldade=Dificuldade.INICIANTE, slug="ex-1", publicado=True):
    status = StatusEditorial.PUBLICADO if publicado else StatusEditorial.RASCUNHO
    trilha = Trilha.objects.get_or_create(
        slug="python",
        defaults={"nome": "Python", "descricao": "x", "status": StatusEditorial.PUBLICADO},
    )[0]
    aula = Aula.objects.get_or_create(
        trilha=trilha,
        slug="aula-1",
        defaults={"titulo": "Aula 1", "conteudo": "x", "status": StatusEditorial.PUBLICADO},
    )[0]
    return Exercicio.objects.create(
        aula=aula,
        titulo="Exercício",
        slug=slug,
        enunciado="x",
        dificuldade=dificuldade,
        status=status,
    )


class CreditoDeXPTest(TestCase):
    def setUp(self):
        self.user = criar_aluno()
        select_starter_creature(user=self.user, creature_slug="shellby")

    def test_xp_vem_da_dificuldade_do_exercicio(self):
        resultado = creditar_exercicio(
            user=self.user, exercicio=criar_exercicio(Dificuldade.AVANCADO)
        )
        self.assertEqual(resultado.xp_ganho, 200)
        self.assertEqual(resultado.progresso.xp_total, 200)

    def test_exercicio_repetido_nao_paga_de_novo(self):
        exercicio = criar_exercicio()
        creditar_exercicio(user=self.user, exercicio=exercicio)
        segundo = creditar_exercicio(user=self.user, exercicio=exercicio)

        self.assertTrue(segundo.ja_concluido)
        self.assertEqual(segundo.xp_ganho, 0)
        self.assertEqual(segundo.progresso.xp_total, 50)
        self.assertEqual(EventoXP.objects.filter(user=self.user).count(), 1)

    def test_trocar_a_criatura_ativa_nao_libera_o_mesmo_exercicio(self):
        exercicio = criar_exercicio()
        creditar_exercicio(user=self.user, exercicio=exercicio)

        outra = UserCreature.objects.create(
            user=self.user, creature_id="slyth", is_active=False
        )
        UserCreature.objects.filter(user=self.user, is_starter=True).update(
            is_active=False
        )
        outra.is_active = True
        outra.save(update_fields=["is_active"])

        segundo = creditar_exercicio(user=self.user, exercicio=exercicio)
        self.assertTrue(segundo.ja_concluido)
        self.assertEqual(EventoXP.objects.filter(user=self.user).count(), 1)

    def test_o_xp_vai_para_a_criatura_ativa(self):
        creditar_exercicio(user=self.user, exercicio=criar_exercicio())
        ativa = UserCreature.objects.get(user=self.user, is_active=True)
        progresso = ProgressoCriatura.objects.get(user_creature=ativa)
        self.assertEqual(progresso.xp_total, 50)

    def test_exercicio_em_rascunho_nao_credita(self):
        exercicio = criar_exercicio(publicado=False)
        with self.assertRaises(ValidationError):
            creditar_exercicio(user=self.user, exercicio=exercicio)

    def test_conta_inativa_nao_credita(self):
        self.user.is_active = False
        with self.assertRaises(ValidationError) as ctx:
            creditar_exercicio(user=self.user, exercicio=criar_exercicio())
        self.assertIn("usuario", ctx.exception.error_dict)


class EvolucaoPeloXPTest(TestCase):
    def setUp(self):
        self.user = criar_aluno()
        select_starter_creature(user=self.user, creature_slug="shellby")

    def _creditar(self, quantidade, dificuldade=Dificuldade.AVANCADO):
        for i in range(quantidade):
            creditar_exercicio(
                user=self.user, exercicio=criar_exercicio(dificuldade, slug=f"ex-{i}")
            )

    def test_nao_evolui_antes_do_limiar(self):
        self._creditar(10)
        ativa = UserCreature.objects.get(user=self.user, is_active=True)
        self.assertEqual(ativa.current_stage, Stage.HATCHLING)

    def test_evolui_ao_cruzar_o_nivel_dez(self):
        self._creditar(23)
        ativa = UserCreature.objects.get(user=self.user, is_active=True)
        self.assertEqual(ativa.current_stage, Stage.JUVENILE)
        self.assertIsNotNone(ativa.evolved_at)

    def test_criatura_atrasada_salta_direto_para_o_estagio_do_nivel(self):
        # `stage_for_level` devolve o MAIOR estágio já alcançado, não o
        # próximo: quem chega ao nível 25 vira ADULTO numa escrita só, sem
        # passar por JOVEM. Sem isso a criatura ficaria um estágio atrás para
        # sempre, porque só há evolução quando o nível sobe.
        #
        # O estado de partida é forçado de propósito: hoje nenhum crédito leva
        # de HATCHLING ao nível 24 (nível 25 exige 30000 XP, crédito máximo é
        # 200). Ele existe no banco no dia em que uma criatura for adquirida
        # por um aluno já adiantado.
        progresso = services.obter_progresso(services.criatura_ativa(self.user))
        ProgressoCriatura.objects.filter(pk=progresso.pk).update(
            xp_total=29900, nivel_id=24
        )
        UserCreature.objects.filter(user=self.user, is_active=True).update(
            current_stage=Stage.HATCHLING, evolved_at=None
        )

        resultado = creditar_exercicio(
            user=self.user,
            exercicio=criar_exercicio(Dificuldade.AVANCADO, slug="ex-salto"),
        )

        ativa = UserCreature.objects.get(user=self.user, is_active=True)
        self.assertTrue(resultado.subiu_de_nivel)
        self.assertTrue(resultado.evoluiu)
        self.assertEqual(ativa.current_stage, Stage.ADULT)
        self.assertIsNotNone(ativa.evolved_at)

    def test_credito_de_um_aluno_nao_toca_o_progresso_de_outro(self):
        # Os dois alunos vivem no mesmo banco dentro deste teste: isolamento
        # provado por coexistência, não por rodarem separados.
        vizinho = criar_aluno("vizinho")
        select_starter_creature(user=vizinho, creature_slug="shellby")
        # A linha de progresso só nasce no primeiro crédito; cria antes para
        # poder comparar o mesmo registro depois.
        antes = services.obter_progresso(services.criatura_ativa(vizinho))
        posse_alheia = UserCreature.objects.get(user=vizinho, is_active=True)

        self._creditar(23)

        depois = ProgressoCriatura.objects.get(user_creature__user=vizinho)
        alheia = UserCreature.objects.get(user=vizinho, is_active=True)
        self.assertEqual(depois.xp_total, antes.xp_total)
        self.assertEqual(depois.nivel_id, antes.nivel_id)
        self.assertEqual(alheia.current_stage, posse_alheia.current_stage)
        self.assertIsNone(alheia.evolved_at)
        self.assertEqual(EventoXP.objects.filter(user=vizinho).count(), 0)


class IncrementoDeXPTest(TestCase):
    """O XP soma no banco, não em Python sobre um valor já lido.

    Sem thread e sem transação real de propósito: o SQLite ignora o
    `select_for_update`, então concorrência de verdade não é reproduzível aqui.
    O que dá para provar de forma determinística é o invariante que interessa —
    a soma acontece no banco, então uma gravação alheia entre a leitura e a
    escrita não é sobrescrita.
    """

    def setUp(self):
        self.user = criar_aluno()
        select_starter_creature(user=self.user, creature_slug="shellby")

    def _progresso(self):
        return ProgressoCriatura.objects.get(user_creature__user=self.user)

    def test_credito_nao_sobrescreve_xp_gravado_no_meio_do_pedido(self):
        creditar_exercicio(user=self.user, exercicio=criar_exercicio(slug="ex-1"))
        self.assertEqual(self._progresso().xp_total, 50)

        real = services.multiplicador_de_bonus

        def creditar_por_fora(**kwargs):
            # Roda entre a leitura do progresso e a gravação: é o intercalamento
            # que faria o `+=` em Python perder estes 100.
            ProgressoCriatura.objects.filter(user_creature__user=self.user).update(
                xp_total=F("xp_total") + 100
            )
            return real(**kwargs)

        with mock.patch.object(
            services, "multiplicador_de_bonus", creditar_por_fora
        ):
            creditar_exercicio(user=self.user, exercicio=criar_exercicio(slug="ex-2"))

        # 50 do primeiro + 100 gravados por fora + 50 deste crédito.
        self.assertEqual(self._progresso().xp_total, 200)

    def test_o_nivel_acompanha_o_total_relido_do_banco(self):
        # O nível é decidido depois do refresh; se fosse decidido sobre o valor
        # em memória, o XP alheio não contaria para subir de nível.
        real = services.multiplicador_de_bonus

        def creditar_por_fora(**kwargs):
            ProgressoCriatura.objects.filter(user_creature__user=self.user).update(
                xp_total=F("xp_total") + 140
            )
            return real(**kwargs)

        with mock.patch.object(
            services, "multiplicador_de_bonus", creditar_por_fora
        ):
            resultado = creditar_exercicio(
                user=self.user, exercicio=criar_exercicio(slug="ex-1")
            )

        self.assertEqual(resultado.progresso.xp_total, 190)
        self.assertTrue(resultado.subiu_de_nivel)
        self.assertEqual(resultado.progresso.nivel_id, 2)
        self.assertEqual(self._progresso().nivel_id, resultado.progresso.nivel_id)

    def test_a_soma_de_xp_sai_como_expressao_no_sql(self):
        # Independe da ordem das chamadas dentro do serviço: os dois testes
        # acima só pegam a regressão porque a escrita alheia cai entre a leitura
        # e a gravação, e nada além de um comentário fixa essa ordem. Este aqui
        # afirma a decisão de desenho direto no SQL.
        with CaptureQueriesContext(connection) as consultas:
            creditar_exercicio(user=self.user, exercicio=criar_exercicio(slug="ex-1"))

        somas = [
            c["sql"]
            for c in consultas.captured_queries
            if c["sql"].lstrip().upper().startswith("UPDATE")
            and c["sql"].count("xp_total") >= 2
        ]
        self.assertTrue(somas, "a soma de XP tem que acontecer no banco, não em Python")

    def test_credito_sem_subir_de_nivel_atualiza_o_carimbo(self):
        # `atualizado_em` é auto_now e não dispara em update(); é passado à mão
        # no serviço. Sem este teste, remover essa linha ficaria verde e o campo
        # congelaria — e ele é serializado para o front.
        progresso = services.obter_progresso(services.criatura_ativa(self.user))
        # Carimbo jogado para trás em vez de medido agora: comparar dois
        # timezone.now() seguidos depende da resolução do relógio e daria teste
        # instável no Windows.
        passado = timezone.now() - timedelta(hours=1)
        ProgressoCriatura.objects.filter(pk=progresso.pk).update(
            atualizado_em=passado
        )

        # 50 XP fica abaixo dos 100 do nível 2: caminho sem level-up, que é
        # justamente onde não sobra nenhum save() para o auto_now aproveitar.
        creditar_exercicio(user=self.user, exercicio=criar_exercicio(slug="ex-1"))

        progresso.refresh_from_db()
        self.assertEqual(progresso.nivel_id, 1)
        self.assertGreater(progresso.atualizado_em, passado)


class NivelEEstagioNaoRegridemTest(TestCase):
    """Nível e estágio também são escritas de valor absoluto lido antes.

    Mesma classe de bug do `xp_total`: o serviço lê o progresso e a criatura no
    começo do pedido e grava um valor calculado sobre essa leitura. Se outro
    pedido subiu mais nesse meio-tempo, o `save()` rebaixa a conta. Os testes
    injetam a gravação alheia em `nivel_para_xp`, que é chamado exatamente entre
    o refresh do XP e a gravação do nível.

    `subiu_de_nivel` e `evoluiu` passam a significar "foi este pedido que
    subiu", não "o nível subiu por perto". Quem dispara a requisição é quem vê
    a animação.
    """

    def setUp(self):
        self.user = criar_aluno()
        select_starter_creature(user=self.user, creature_slug="shellby")

    def _progresso(self):
        return ProgressoCriatura.objects.get(user_creature__user=self.user)

    def _ativa(self):
        return UserCreature.objects.get(user=self.user, is_active=True)

    def _partir_de(self, *, xp_total, nivel_id):
        """A linha de progresso só nasce no primeiro crédito; cria antes."""
        progresso = services.obter_progresso(services.criatura_ativa(self.user))
        ProgressoCriatura.objects.filter(pk=progresso.pk).update(
            xp_total=xp_total, nivel_id=nivel_id
        )

    def _injetar_antes_da_gravacao(self, efeito):
        """Roda `efeito` entre o refresh do XP e a gravação do nível."""
        real = services.nivel_para_xp

        def envolvido(xp_total):
            efeito()
            return real(xp_total)

        return mock.patch.object(services, "nivel_para_xp", envolvido)

    def test_nivel_nao_regride_para_o_valor_lido_antes(self):
        def outro_pedido_subiu_mais():
            ProgressoCriatura.objects.filter(user_creature__user=self.user).update(
                xp_total=F("xp_total") + 100, nivel_id=3
            )

        with self._injetar_antes_da_gravacao(outro_pedido_subiu_mais):
            resultado = creditar_exercicio(
                user=self.user,
                exercicio=criar_exercicio(Dificuldade.AVANCADO, slug="ex-1"),
            )

        # 200 XP resolvem para o nível 2, mas o banco já está no 3.
        self.assertEqual(self._progresso().nivel_id, 3)
        self.assertEqual(resultado.progresso.nivel_id, 3)
        self.assertFalse(resultado.subiu_de_nivel)

    def test_estagio_nao_regride_para_o_valor_lido_antes(self):
        self._partir_de(xp_total=4400, nivel_id=9)
        carimbo = timezone.now() - timedelta(days=1)

        def outro_pedido_evoluiu_mais():
            UserCreature.objects.filter(user=self.user, is_active=True).update(
                current_stage=Stage.ADULT, evolved_at=carimbo
            )

        with self._injetar_antes_da_gravacao(outro_pedido_evoluiu_mais):
            resultado = creditar_exercicio(
                user=self.user,
                exercicio=criar_exercicio(Dificuldade.AVANCADO, slug="ex-1"),
            )

        # O nível 10 pede o estágio 2, mas a criatura já está no 3.
        ativa = self._ativa()
        self.assertTrue(resultado.subiu_de_nivel)
        self.assertEqual(ativa.current_stage, Stage.ADULT)
        self.assertEqual(ativa.evolved_at, carimbo)
        self.assertFalse(resultado.evoluiu)

    def test_estagio_ja_alcancado_nao_reescreve_o_carimbo(self):
        # Caso mais comum que o anterior: dois exercícios seguidos cruzam o
        # limiar, o primeiro evolui, e o segundo não pode reportar `evoluiu`
        # nem carimbar `evolved_at` de novo — seria uma segunda animação.
        self._partir_de(xp_total=4400, nivel_id=9)
        carimbo = timezone.now() - timedelta(days=1)
        UserCreature.objects.filter(user=self.user, is_active=True).update(
            current_stage=Stage.JUVENILE, evolved_at=carimbo
        )

        resultado = creditar_exercicio(
            user=self.user,
            exercicio=criar_exercicio(Dificuldade.AVANCADO, slug="ex-1"),
        )

        ativa = self._ativa()
        self.assertTrue(resultado.subiu_de_nivel)
        self.assertEqual(ativa.current_stage, Stage.JUVENILE)
        self.assertEqual(ativa.evolved_at, carimbo)
        self.assertFalse(resultado.evoluiu)

    def test_quem_sobe_de_fato_continua_reportando_a_subida(self):
        # A contrapartida dos três acima: sem corrida, o pedido que grava o
        # nível novo é o que devolve `subiu_de_nivel` e `evoluiu`.
        self._partir_de(xp_total=4400, nivel_id=9)

        resultado = creditar_exercicio(
            user=self.user,
            exercicio=criar_exercicio(Dificuldade.AVANCADO, slug="ex-1"),
        )

        ativa = self._ativa()
        self.assertTrue(resultado.subiu_de_nivel)
        self.assertTrue(resultado.evoluiu)
        self.assertEqual(self._progresso().nivel_id, 10)
        self.assertEqual(ativa.current_stage, Stage.JUVENILE)
        self.assertIsNotNone(ativa.evolved_at)

    def test_perder_a_corrida_do_nivel_nao_deixa_a_barra_negativa(self):
        # Ramo em que outro pedido subiu mais: `nivel` vem do banco, e o
        # `xp_total` tem que vir da mesma leitura. Recarregar só um dos dois
        # mistura dois momentos e `montar_progresso` devolve xp_no_nivel < 0.
        self._partir_de(xp_total=500, nivel_id=1)

        def outro_pedido_subiu_mais():
            ProgressoCriatura.objects.filter(user_creature__user=self.user).update(
                xp_total=1050, nivel_id=5
            )

        with self._injetar_antes_da_gravacao(outro_pedido_subiu_mais):
            resultado = creditar_exercicio(
                user=self.user,
                exercicio=criar_exercicio(Dificuldade.AVANCADO, slug="ex-1"),
            )

        self.assertFalse(resultado.subiu_de_nivel)
        progresso = services.montar_progresso(resultado.progresso)
        self.assertEqual(progresso.nivel_id, 5)
        self.assertEqual(progresso.xp_total, 1050)
        self.assertGreaterEqual(progresso.xp_no_nivel, 0)
