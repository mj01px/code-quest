from contextlib import redirect_stdout
from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from apps.correcao import harness
from apps.correcao.models import EspecificacaoDeCodigo
from apps.correcao.tests.helpers import ExecutorLocal
from apps.trilhas.management.commands._licoes import LICOES
from apps.trilhas.models import (
    Aula,
    Exercicio,
    Flashcard,
    Questao,
    StatusEditorial,
    Tipo,
)


def _rodar(*comandos: str) -> None:
    with redirect_stdout(StringIO()):
        for comando in comandos:
            call_command(comando)


class SeedLicoesTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        _rodar("seed_trilhas", "seed_correcao", "seed_demo_pfc", "seed_licoes")

    def aula(self, licao):
        return Aula.objects.get(trilha__slug=licao["trilha"], slug=licao["aula"])

    def test_exige_as_trilhas_semeadas(self):
        Aula.objects.all().delete()
        with self.assertRaises(CommandError):
            _rodar("seed_licoes")

    def test_rodar_de_novo_nao_duplica(self):
        contagem = (
            Exercicio.objects.count(),
            Questao.objects.count(),
            Flashcard.objects.count(),
        )

        _rodar("seed_licoes")

        self.assertEqual(
            (
                Exercicio.objects.count(),
                Questao.objects.count(),
                Flashcard.objects.count(),
            ),
            contagem,
        )

    def test_remove_os_exercicios_que_viraram_quiz_ou_flashcard(self):
        removidos = [slug for licao in LICOES for slug in licao["remover"]]

        self.assertFalse(Exercicio.objects.filter(slug__in=removidos).exists())
        self.assertFalse(
            Exercicio.objects.filter(
                tipo__in=[Tipo.ALTERNATIVA, Tipo.FLASHCARD]
            ).exists()
        )

    def test_publica_a_licao_com_fases_quiz_e_baralho(self):
        for licao in LICOES:
            aula = self.aula(licao)
            with self.subTest(aula=aula.slug):
                self.assertEqual(aula.status, StatusEditorial.PUBLICADO)
                self.assertEqual(aula.conteudo, licao["conteudo"])
                self.assertEqual(
                    list(
                        aula.exercicios.filter(
                            status=StatusEditorial.PUBLICADO
                        ).values_list("slug", flat=True)
                    ),
                    licao["fases"],
                )
                self.assertEqual(aula.questoes.count(), len(licao["questoes"]))
                self.assertEqual(aula.flashcards.count(), len(licao["flashcards"]))

    def test_licao_tem_secoes_e_resumo(self):
        for licao in LICOES:
            with self.subTest(aula=licao["aula"]):
                self.assertGreaterEqual(licao["conteudo"].count("\n## "), 5)
                self.assertIn("\n## Resumo\n", licao["conteudo"])

    def test_todo_flashcard_tem_dica_que_nao_entrega_a_resposta(self):
        for card in Flashcard.objects.all():
            with self.subTest(pergunta=card.pergunta):
                self.assertTrue(card.dica.strip())
                self.assertNotEqual(card.dica, card.resposta)
                self.assertNotIn(card.resposta, card.dica)

    def test_toda_fase_tem_contexto_e_exemplo(self):
        for licao in LICOES:
            for slug in licao["fases"]:
                exercicio = Exercicio.objects.get(
                    trilha__slug=licao["trilha"], slug=slug
                )
                with self.subTest(exercicio=slug):
                    self.assertTrue(exercicio.contexto.strip())
                    self.assertTrue(exercicio.exemplo.strip())

    def test_quiz_tem_resposta_entre_as_quatro_opcoes(self):
        for licao in LICOES:
            for questao in licao["questoes"]:
                with self.subTest(enunciado=questao["enunciado"]):
                    self.assertEqual(len(questao["opcoes"]), 4)
                    self.assertIn(questao["correta"], "ABCD")

    def test_solucao_do_autor_passa_nos_casos_novos(self):
        executor = ExecutorLocal()
        slugs = [slug for licao in LICOES for slug in licao["correcao"]]
        especificacoes = EspecificacaoDeCodigo.objects.filter(
            exercicio__slug__in=slugs
        ).select_related("exercicio")
        self.assertEqual(especificacoes.count(), len(slugs))

        for especificacao in especificacoes:
            casos = list(especificacao.casos.all())
            marcador = "@@RESULTADO:teste@@"
            execucao = executor.executar(
                codigo=harness.montar_programa(
                    codigo=especificacao.exercicio.solucao_autor,
                    funcao=especificacao.funcao,
                    marcador=marcador,
                ),
                stdin=harness.montar_entrada(casos),
                linguagem=especificacao.linguagem,
            )
            _, resultados = harness.separar_saida(execucao.stdout, marcador)

            with self.subTest(exercicio=especificacao.exercicio.slug):
                self.assertIsNotNone(resultados, execucao.stderr)
                self.assertTrue(any(caso.visivel for caso in casos))
                self.assertFalse(all(caso.visivel for caso in casos))
                for caso, resultado in zip(casos, resultados, strict=True):
                    self.assertTrue(
                        harness.caso_passou(caso, resultado),
                        f"caso {caso.ordem}: {resultado}",
                    )
