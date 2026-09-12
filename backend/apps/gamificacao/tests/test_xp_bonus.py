"""O bônus de XP por criatura e trilha: tabela, serviço, rota e seed.

O bônus é a única coisa que liga gamificação a trilhas, e liga por linha de
tabela em vez de por domínio derivado: nem todo domínio tem trilha (COMPILADAS
espera a de Java) e nem toda trilha tem criatura (Algoritmos não tem). Os
testes daqui protegem essa escolha nas duas pontas, porque um par derivado do
domínio quebraria em silêncio nos dois casos.

Ausência de linha significa XP neutro, então lista vazia é resposta legítima da
rota e não erro: isso também está testado.
"""

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.contas.tests.helpers import criar_aluno
from apps.gamificacao.models import Creature, UserCreature, XpBonus
from apps.gamificacao.services import select_starter_creature, xp_bonuses_for_user
from apps.progressao.services import creditar_exercicio
from apps.trilhas.models import Aula, Dificuldade, Exercicio, StatusEditorial, Trilha

DOBRO = Decimal("2.00")


def criar_trilha(slug: str, ordem: int = 1) -> Trilha:
    return Trilha.objects.create(
        slug=slug,
        nome=slug.replace("-", " ").title(),
        descricao=f"Descrição de {slug}.",
        ordem=ordem,
        status=StatusEditorial.PUBLICADO,
    )


def criar_exercicio(
    trilha: Trilha, dificuldade=Dificuldade.INICIANTE, slug="ex-1"
) -> Exercicio:
    aula = Aula.objects.get_or_create(
        trilha=trilha,
        slug="aula-1",
        defaults={
            "titulo": "Aula 1",
            "conteudo": "x",
            "status": StatusEditorial.PUBLICADO,
        },
    )[0]
    return Exercicio.objects.create(
        aula=aula,
        titulo="Exercício",
        slug=slug,
        enunciado="x",
        dificuldade=dificuldade,
        status=StatusEditorial.PUBLICADO,
    )


class TabelaTest(TestCase):
    def setUp(self):
        self.trilha = criar_trilha("python")
        self.criatura = Creature.objects.get(pk="slyth")

    def test_multiplicador_neutro_por_padrao(self):
        bonus = XpBonus.objects.create(creature=self.criatura, trilha=self.trilha)
        self.assertEqual(bonus.multiplier, Decimal("1.00"))

    def test_um_bonus_por_par(self):
        XpBonus.objects.create(
            creature=self.criatura, trilha=self.trilha, multiplier=DOBRO
        )
        with self.assertRaises(IntegrityError), transaction.atomic():
            XpBonus.objects.create(creature=self.criatura, trilha=self.trilha)

    def test_mesma_criatura_em_outra_trilha(self):
        outra = criar_trilha("algoritmos", ordem=2)
        XpBonus.objects.create(creature=self.criatura, trilha=self.trilha)
        XpBonus.objects.create(creature=self.criatura, trilha=outra)
        self.assertEqual(self.criatura.xp_bonuses.count(), 2)

    def test_banco_recusa_multiplicador_fora_da_faixa(self):
        for valor in (Decimal("0.50"), Decimal("9.00")):
            with self.subTest(valor=valor):
                with self.assertRaises(IntegrityError), transaction.atomic():
                    XpBonus.objects.create(
                        creature=self.criatura, trilha=self.trilha, multiplier=valor
                    )

    def test_validacao_em_python_tambem_recusa(self):
        bonus = XpBonus(
            creature=self.criatura, trilha=self.trilha, multiplier=Decimal("9.00")
        )
        with self.assertRaises(ValidationError):
            bonus.full_clean()

    def test_apagar_a_trilha_leva_o_bonus_junto(self):
        XpBonus.objects.create(creature=self.criatura, trilha=self.trilha)
        self.trilha.delete()
        self.assertEqual(XpBonus.objects.count(), 0)

    def test_criatura_com_bonus_ainda_pode_ser_escolhida(self):
        # O bônus não pode virar obstáculo para a escolha inicial.
        XpBonus.objects.create(
            creature=self.criatura, trilha=self.trilha, multiplier=DOBRO
        )
        posse = select_starter_creature(user=criar_aluno(), creature_slug="slyth")
        self.assertTrue(posse.is_starter)


class ServicoTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.python = criar_trilha("python")
        cls.logica = criar_trilha("logica-de-programacao", ordem=2)
        XpBonus.objects.create(creature_id="slyth", trilha=cls.python, multiplier=DOBRO)
        XpBonus.objects.create(
            creature_id="shellby", trilha=cls.logica, multiplier=DOBRO
        )

    def test_sem_criatura_nao_ha_bonus(self):
        self.assertEqual(list(xp_bonuses_for_user(user=criar_aluno("sozinho"))), [])

    def test_traz_so_o_bonus_da_criatura_que_o_usuario_tem(self):
        aluno = criar_aluno("cobreiro")
        select_starter_creature(user=aluno, creature_slug="slyth")

        bonus = list(xp_bonuses_for_user(user=aluno))
        self.assertEqual([b.trilha.slug for b in bonus], ["python"])

    def test_soma_as_criaturas_colecionadas(self):
        aluno = criar_aluno("colecionador")
        select_starter_creature(user=aluno, creature_slug="slyth")
        UserCreature.objects.create(user=aluno, creature_id="shellby")

        # Ordenado pela ordem da trilha: python é 1, lógica é 2.
        bonus = list(xp_bonuses_for_user(user=aluno))
        self.assertEqual(
            [b.trilha.slug for b in bonus], ["python", "logica-de-programacao"]
        )

    def test_criatura_de_outro_usuario_nao_vaza(self):
        dono = criar_aluno("dono")
        select_starter_creature(user=dono, creature_slug="slyth")
        self.assertEqual(list(xp_bonuses_for_user(user=criar_aluno("vizinho"))), [])


class RotaTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.url = reverse("gamificacao:meus-bonus")
        cls.trilha = criar_trilha("python")
        XpBonus.objects.create(creature_id="slyth", trilha=cls.trilha, multiplier=DOBRO)

    def test_exige_autenticacao(self):
        self.assertEqual(
            self.client.get(self.url).status_code, status.HTTP_401_UNAUTHORIZED
        )

    def test_sem_criatura_devolve_lista_vazia(self):
        self.client.force_authenticate(criar_aluno("recem_chegado"))
        r = self.client.get(self.url)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(list(r.data), [])

    def test_devolve_o_bonus_com_nome_e_slug_resolvidos(self):
        aluno = criar_aluno("cobreiro")
        select_starter_creature(user=aluno, creature_slug="slyth")
        self.client.force_authenticate(aluno)

        r = self.client.get(self.url)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(
            dict(r.data[0]),
            {
                "criatura": "slyth",
                "criatura_nome": "Slyth",
                "trilha": "python",
                "trilha_nome": "Python",
                "multiplicador": DOBRO,
            },
        )

    def test_nao_aceita_escrita(self):
        self.client.force_authenticate(criar_aluno("curioso"))
        r = self.client.post(self.url, {"multiplicador": "5.00"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class SeedTest(TestCase):
    """O comando existe porque as trilhas vêm de comando, não de migration."""

    @classmethod
    def setUpTestData(cls):
        slugs = [
            "logica-de-programacao",
            "python",
            "javascript-typescript",
            "banco-de-dados",
        ]
        for ordem, slug in enumerate(slugs, start=1):
            criar_trilha(slug, ordem=ordem)

    def test_liga_cada_criatura_a_trilha_do_seu_dominio(self):
        call_command("seed_bonus_xp", verbosity=0)
        pares = {(b.creature_id, b.trilha.slug) for b in XpBonus.objects.all()}
        self.assertEqual(
            pares,
            {
                ("shellby", "logica-de-programacao"),
                ("slyth", "python"),
                ("raposa", "javascript-typescript"),
                ("elefante", "banco-de-dados"),
            },
        )

    def test_dobra_o_xp(self):
        call_command("seed_bonus_xp", verbosity=0)
        self.assertTrue(all(b.multiplier == DOBRO for b in XpBonus.objects.all()))

    def test_dominio_sem_trilha_e_ignorado(self):
        # Blaze é COMPILADAS, e a trilha de Java ainda não existe.
        call_command("seed_bonus_xp", verbosity=0)
        self.assertFalse(XpBonus.objects.filter(creature_id="blaze").exists())

    def test_rodar_de_novo_nao_duplica(self):
        call_command("seed_bonus_xp", verbosity=0)
        antes = XpBonus.objects.count()
        call_command("seed_bonus_xp", verbosity=0)
        self.assertEqual(XpBonus.objects.count(), antes)

    def test_corrige_multiplicador_alterado_a_mao(self):
        call_command("seed_bonus_xp", verbosity=0)
        XpBonus.objects.update(multiplier=Decimal("1.00"))
        call_command("seed_bonus_xp", verbosity=0)
        self.assertTrue(all(b.multiplier == DOBRO for b in XpBonus.objects.all()))


class CreditoComBonusTest(TestCase):
    """O multiplicador do bônus entra no XP creditado, não só na vitrine.

    A rota /eu/bonus/ mostra o selo "2x XP" para o aluno antes de ele resolver
    a fase; se o crédito ignorasse o bônus, a interface estaria prometendo algo
    que o servidor não cumpre.
    """

    def setUp(self):
        self.trilha = criar_trilha("python")
        self.user = criar_aluno()
        select_starter_creature(user=self.user, creature_slug="slyth")

    def test_multiplica_o_xp_creditado(self):
        XpBonus.objects.create(
            creature_id="slyth", trilha=self.trilha, multiplier=DOBRO
        )

        resultado = creditar_exercicio(
            user=self.user,
            exercicio=criar_exercicio(self.trilha, Dificuldade.INICIANTE),
        )

        self.assertEqual(resultado.xp_ganho, 100)

    def test_sem_bonus_credita_o_xp_normal(self):
        resultado = creditar_exercicio(
            user=self.user,
            exercicio=criar_exercicio(self.trilha, Dificuldade.INICIANTE),
        )

        self.assertEqual(resultado.xp_ganho, 50)

    def test_bonus_de_outra_criatura_nao_se_aplica(self):
        XpBonus.objects.create(
            creature_id="shellby", trilha=self.trilha, multiplier=DOBRO
        )

        resultado = creditar_exercicio(
            user=self.user,
            exercicio=criar_exercicio(self.trilha, Dificuldade.INICIANTE),
        )

        self.assertEqual(resultado.xp_ganho, 50)
