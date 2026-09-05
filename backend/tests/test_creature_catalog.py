"""O catálogo de criaturas existe em todo ambiente logo depois do migrate.

Ele é semeado por data migration, e não por fixture, porque é pré-requisito do
cadastro: sem criatura disponível ninguém cria conta. Fixture também não roda
no banco de teste, e é justamente aqui que ela precisaria rodar.

A regra estrutural protegida é "uma criatura por domínio". Se a criatura
representasse linguagem em vez de domínio, o aluno da cobra ficaria
descaracterizado ao cursar Java e cada tecnologia nova exigiria criatura nova.

A tabela de nível para estágio testa as bordas exatas dos limiares, que é onde
erro de comparação (`<` no lugar de `<=`) se esconde.
"""

from django.test import TestCase

from apps.gamificacao.models import Creature, CreatureStage, Stage
from apps.gamificacao.services import list_selectable_creatures


class SeedTest(TestCase):
    def test_cinco_criaturas_e_quinze_estagios(self):
        self.assertEqual(Creature.objects.count(), 5)
        self.assertEqual(CreatureStage.objects.count(), 15)

    def test_toda_criatura_tem_os_tres_estagios(self):
        for criatura in Creature.objects.prefetch_related("stages"):
            with self.subTest(criatura=criatura.slug):
                estagios = sorted(s.stage for s in criatura.stages.all())
                self.assertEqual(estagios, [1, 2, 3])

    def test_uma_criatura_por_dominio(self):
        dominios = list(Creature.objects.values_list("domain", flat=True))
        self.assertEqual(len(dominios), len(set(dominios)))

    def test_todo_estagio_aponta_para_um_sprite(self):
        for estagio in CreatureStage.objects.all():
            with self.subTest(estagio=str(estagio)):
                self.assertTrue(estagio.sprite.endswith(".png"))
                self.assertNotIn(" ", estagio.sprite)


class DisponibilidadeTest(TestCase):
    def test_so_as_criaturas_com_arte_aparecem_na_escolha(self):
        slugs = {c.slug for c in list_selectable_creatures()}
        self.assertEqual(slugs, {"shellby", "slyth", "blaze"})

    def test_raposa_e_elefante_existem_mas_estao_indisponiveis(self):
        # Elas precisam existir no catálogo desde já, porque a trilha do
        # domínio delas é prevista; o que falta é só a arte.
        for slug in ("raposa", "elefante"):
            with self.subTest(slug=slug):
                self.assertFalse(Creature.objects.get(pk=slug).is_available)

    def test_ordem_de_exibicao_e_estavel(self):
        ordem = [c.slug for c in list_selectable_creatures()]
        self.assertEqual(ordem, ["shellby", "slyth", "blaze"])


class NivelParaEstagioTest(TestCase):
    """Limiares provisórios do seed: 1, 10 e 25."""

    @classmethod
    def setUpTestData(cls):
        cls.criatura = Creature.objects.prefetch_related("stages").get(pk="shellby")

    def test_bordas_dos_limiares(self):
        casos = {
            1: Stage.HATCHLING,
            9: Stage.HATCHLING,
            10: Stage.JUVENILE,
            24: Stage.JUVENILE,
            25: Stage.ADULT,
            999: Stage.ADULT,
        }
        for nivel, esperado in casos.items():
            with self.subTest(nivel=nivel):
                self.assertEqual(self.criatura.stage_for_level(nivel), esperado)

    def test_nivel_abaixo_do_primeiro_limiar_ainda_devolve_filhote(self):
        # Falhar fechado: catálogo mal semeado não pode quebrar a tela do aluno.
        self.assertEqual(self.criatura.stage_for_level(0), Stage.HATCHLING)
