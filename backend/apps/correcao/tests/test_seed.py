from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from apps.correcao import harness, sql
from apps.correcao.models import CasoDeTeste, EspecificacaoDeCodigo, Linguagem, Veredito
from apps.correcao.serializers import EspecificacaoSerializer
from apps.correcao.services import _julgar_sql

from .helpers import ExecutorLocal, executar_sql_local


class SeedCorrecaoTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_trilhas", stdout=StringIO())
        call_command("seed_licoes", stdout=StringIO())
        call_command("seed_desafios", stdout=StringIO())
        call_command("seed_correcao", stdout=StringIO())

    def test_rodar_de_novo_nao_duplica(self):
        especificacoes = EspecificacaoDeCodigo.objects.count()
        casos = CasoDeTeste.objects.count()

        call_command("seed_correcao", stdout=StringIO())

        self.assertEqual(EspecificacaoDeCodigo.objects.count(), especificacoes)
        self.assertEqual(CasoDeTeste.objects.count(), casos)

    def test_toda_especificacao_tem_exemplo_visivel_e_caso_oculto(self):
        for especificacao in EspecificacaoDeCodigo.objects.prefetch_related("casos"):
            visiveis = [c for c in especificacao.casos.all() if c.visivel]
            with self.subTest(funcao=especificacao.funcao):
                self.assertTrue(visiveis)
                self.assertLess(len(visiveis), especificacao.casos.count())

    def test_todo_exemplo_tem_nomes_para_as_variaveis_de_entrada(self):
        for especificacao in EspecificacaoDeCodigo.objects.filter(
            linguagem=Linguagem.PYTHON
        ).prefetch_related("casos"):
            with self.subTest(exercicio=especificacao.exercicio.slug):
                dados = EspecificacaoSerializer(especificacao).data
                entrada = dados["exemplos"][0]["argumentos"]
                self.assertGreaterEqual(len(dados["parametros"]), len(entrada))
                self.assertTrue(
                    all(nome.isidentifier() for nome in dados["parametros"])
                )

    def test_solucao_do_autor_passa_em_todos_os_casos(self):
        # garante que a solucao do autor passe nos casos de teste
        executor = ExecutorLocal()
        especificacoes = (
            EspecificacaoDeCodigo.objects.filter(linguagem=Linguagem.PYTHON)
            .select_related("exercicio")
            .prefetch_related("casos")
        )
        self.assertGreaterEqual(especificacoes.count(), 14)

        for especificacao in especificacoes:
            casos = list(especificacao.casos.all())
            execucao = executor.executar(
                codigo=harness.montar_programa(
                    codigo=especificacao.exercicio.solucao_autor,
                    funcao=especificacao.funcao,
                ),
                stdin=harness.montar_entrada(casos),
                linguagem=especificacao.linguagem,
            )
            _, resultados = harness.separar_saida(execucao.stdout)

            with self.subTest(exercicio=especificacao.exercicio.slug):
                self.assertIsNotNone(resultados, execucao.stderr)
                for caso, resultado in zip(casos, resultados, strict=True):
                    self.assertTrue(
                        harness.caso_passou(caso, resultado),
                        f"caso {caso.ordem}: {resultado}",
                    )

    def test_solucao_do_autor_passa_nos_casos_de_sql(self):
        especificacoes = (
            EspecificacaoDeCodigo.objects.filter(linguagem=Linguagem.SQL)
            .select_related("exercicio")
            .prefetch_related("casos")
        )
        self.assertEqual(
            set(especificacoes.values_list("exercicio__slug", flat=True)),
            {"criar-tabela-aluno", "restringir-nota"},
        )
        for especificacao in especificacoes:
            with self.subTest(exercicio=especificacao.exercicio.slug):
                self.assertEqual(especificacao.exercicio.explicacao, "")
                casos = list(especificacao.casos.all())
                programa, marcador = sql.montar_correcao(
                    especificacao.exercicio.solucao_autor, casos
                )
                execucao = executar_sql_local(
                    codigo=programa, stdin="", linguagem="SQL"
                )
                resultado = _julgar_sql(execucao, casos, marcador)
                self.assertEqual(resultado["veredito"], Veredito.APROVADO, resultado)
