"""O crédito de XP é a única porta de entrada do progresso.

Os testes aqui cobrem o que não pode falhar por descuido: o valor vir da
dificuldade cadastrada e não de fora, o mesmo exercício pagar uma vez só, e a
criatura evoluir junto quando o nível cruza o limiar do catálogo.
"""

from django.core.exceptions import ValidationError
from django.test import TestCase

from apps.gamificacao.models import Stage, UserCreature
from apps.gamificacao.services import select_starter_creature
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