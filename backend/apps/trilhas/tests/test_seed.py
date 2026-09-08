"""Idempotência do comando seed_trilhas."""

from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from apps.trilhas.models import Aula, Exercicio, StatusEditorial, Trilha

TRILHA_INICIAL = "logica-de-programacao"

# Vocabulário das telas: módulo = Aula, fase = Exercicio. O total é
# contratual: as telas do Figma anunciam 6 módulos e 26 fases.
TOTAL_DE_MODULOS = 6
TOTAL_DE_FASES = 26


class SeedTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_trilhas", stdout=StringIO())

    def test_cria_as_cinco_trilhas(self):
        self.assertEqual(Trilha.objects.count(), 5)

    def test_apenas_logica_de_programacao_esta_publicada(self):
        publicadas = [t.slug for t in Trilha.objects.publicados()]
        self.assertEqual(publicadas, [TRILHA_INICIAL])

    def test_as_demais_ficam_em_rascunho(self):
        outras = Trilha.objects.exclude(slug=TRILHA_INICIAL)
        for trilha in outras:
            with self.subTest(trilha=trilha.slug):
                self.assertEqual(trilha.status, StatusEditorial.RASCUNHO)

    def test_a_trilha_inicial_tem_seis_modulos_e_vinte_e_seis_fases(self):
        trilha = Trilha.objects.get(slug=TRILHA_INICIAL)
        self.assertEqual(trilha.aulas.count(), TOTAL_DE_MODULOS)
        self.assertEqual(
            Exercicio.objects.filter(aula__trilha=trilha).count(), TOTAL_DE_FASES
        )

    def test_nenhum_modulo_fica_sem_fase(self):
        trilha = Trilha.objects.get(slug=TRILHA_INICIAL)
        for aula in trilha.aulas.all():
            with self.subTest(aula=aula.slug):
                self.assertGreaterEqual(aula.exercicios.count(), 1)

    def test_a_ordem_das_fases_e_sequencial_dentro_do_modulo(self):
        # A tela numera as fases pela ordem; buraco ou repetição apareceria
        # como duas fases no mesmo lugar do mapa.
        trilha = Trilha.objects.get(slug=TRILHA_INICIAL)
        for aula in trilha.aulas.all():
            ordens = sorted(aula.exercicios.values_list("ordem", flat=True))
            with self.subTest(aula=aula.slug):
                self.assertEqual(ordens, list(range(1, len(ordens) + 1)))

    def test_a_ordem_dos_modulos_e_sequencial(self):
        trilha = Trilha.objects.get(slug=TRILHA_INICIAL)
        ordens = sorted(trilha.aulas.values_list("ordem", flat=True))
        self.assertEqual(ordens, list(range(1, TOTAL_DE_MODULOS + 1)))

    def test_todo_conteudo_semeado_esta_publicado(self):
        trilha = Trilha.objects.get(slug=TRILHA_INICIAL)
        self.assertFalse(trilha.aulas.exclude(status=StatusEditorial.PUBLICADO))
        self.assertFalse(
            Exercicio.objects.filter(aula__trilha=trilha).exclude(
                status=StatusEditorial.PUBLICADO
            )
        )

    def test_as_aulas_encadeiam_pre_requisitos(self):
        aulas = list(Trilha.objects.get(slug=TRILHA_INICIAL).aulas.order_by("ordem"))
        self.assertIsNone(aulas[0].pre_requisito)
        for anterior, atual in zip(aulas, aulas[1:], strict=False):
            with self.subTest(aula=atual.slug):
                self.assertEqual(atual.pre_requisito, anterior)

    def test_pre_requisito_nunca_cruza_de_trilha(self):
        for aula in Aula.objects.exclude(pre_requisito=None).select_related(
            "pre_requisito"
        ):
            with self.subTest(aula=aula.slug):
                self.assertEqual(aula.pre_requisito.trilha_id, aula.trilha_id)

    def test_slug_de_exercicio_nao_se_repete_dentro_da_trilha(self):
        # A rota /api/exercicios/<trilha>/<exercicio>/ casa por trilha, não por
        # aula. Slug repetido dentro da mesma trilha tornaria a URL ambígua.
        slugs = list(
            Exercicio.objects.filter(aula__trilha__slug=TRILHA_INICIAL).values_list(
                "slug", flat=True
            )
        )
        self.assertEqual(len(slugs), len(set(slugs)))

    def test_todo_exercicio_tem_enunciado_e_solucao(self):
        for exercicio in Exercicio.objects.all():
            with self.subTest(exercicio=exercicio.slug):
                self.assertTrue(exercicio.enunciado.strip())
                self.assertTrue(exercicio.solucao_autor.strip())


class IdempotenciaTest(TestCase):
    def _contagens(self) -> tuple[int, int, int]:
        return (
            Trilha.objects.count(),
            Aula.objects.count(),
            Exercicio.objects.count(),
        )

    def test_rodar_duas_vezes_nao_duplica(self):
        call_command("seed_trilhas", stdout=StringIO())
        primeira = self._contagens()
        call_command("seed_trilhas", stdout=StringIO())
        self.assertEqual(self._contagens(), primeira)

    def test_o_total_de_modulos_e_fases_resiste_a_segunda_execucao(self):
        # A chave do update_or_create é (trilha, slug) nos dois níveis: rodar
        # de novo tem de reaproveitar as linhas, não criar um segundo conjunto.
        call_command("seed_trilhas", stdout=StringIO())
        call_command("seed_trilhas", stdout=StringIO())

        trilha = Trilha.objects.get(slug=TRILHA_INICIAL)
        self.assertEqual(trilha.aulas.count(), TOTAL_DE_MODULOS)
        self.assertEqual(trilha.exercicios.count(), TOTAL_DE_FASES)

    def test_a_segunda_execucao_corrige_conteudo_alterado(self):
        call_command("seed_trilhas", stdout=StringIO())
        trilha = Trilha.objects.get(slug=TRILHA_INICIAL)
        trilha.nome = "Nome trocado à mão"
        trilha.save(update_fields=["nome"])

        call_command("seed_trilhas", stdout=StringIO())
        trilha.refresh_from_db()
        self.assertEqual(trilha.nome, "Lógica de Programação")

    def test_nao_apaga_conteudo_criado_fora_do_seed(self):
        call_command("seed_trilhas", stdout=StringIO())
        Trilha.objects.create(
            slug="trilha-manual", nome="Manual", descricao="...", ordem=99
        )
        call_command("seed_trilhas", stdout=StringIO())
        self.assertTrue(Trilha.objects.filter(slug="trilha-manual").exists())
