from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from apps.contas.tests.helpers import criar_aluno
from apps.correcao import harness, sql
from apps.correcao.management.commands._casos_logica import CASOS_LOGICA
from apps.correcao.models import CasoDeTeste, EspecificacaoDeCodigo, Linguagem, Veredito
from apps.correcao.serializers import EspecificacaoSerializer
from apps.correcao.services import _julgar_sql
from apps.gamificacao.services import select_starter_creature
from apps.progressao.models import EventoXP
from apps.trilhas.models import Exercicio, StatusEditorial, Tipo

from .helpers import ExecutorLocal


class SeedCorrecaoTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_trilhas", stdout=StringIO())
        call_command("seed_licoes", stdout=StringIO())
        call_command("seed_desafios", stdout=StringIO())
        call_command("seed_correcao", stdout=StringIO())

    def test_todos_os_exercicios_publicados_de_logica_tem_correcao(self):
        exercicios = Exercicio.objects.filter(
            trilha__slug="logica-de-programacao",
            tipo=Tipo.CODIGO,
            status=StatusEditorial.PUBLICADO,
        )
        self.assertEqual(exercicios.count(), 22)
        self.assertFalse(exercicios.filter(especificacao_codigo__isnull=True).exists())

    @override_settings(JUDGE0_LIMITE_DIARIO=100)
    def test_rodar_e_enviar_os_exercicios_novos_de_logica(self):
        cliente = APIClient()
        especificacoes = (
            EspecificacaoDeCodigo.objects.filter(
                exercicio__trilha__slug="logica-de-programacao",
                exercicio__slug__in=CASOS_LOGICA,
            )
            .select_related("exercicio")
            .prefetch_related("casos")
        )
        self.assertEqual(especificacoes.count(), 19)
        with patch("apps.correcao.services.obter_cliente", return_value=ExecutorLocal()):
            for indice, especificacao in enumerate(especificacoes, start=1):
                aluno = criar_aluno(nickname=f"aluno_logica_{indice}")
                select_starter_creature(user=aluno, creature_slug="shellby")
                cliente.force_authenticate(user=aluno)
                exercicio = especificacao.exercicio
                kwargs = {
                    "trilha_slug": "logica-de-programacao",
                    "exercicio_slug": exercicio.slug,
                }
                rodar = reverse("correcao:executar", kwargs=kwargs)
                enviar = reverse("progressao:concluir-exercicio", kwargs=kwargs)
                codigo = {"codigo": exercicio.solucao_autor}
                eventos = EventoXP.objects.filter(user=aluno, exercicio=exercicio)

                with self.subTest(exercicio=exercicio.slug):
                    resposta = cliente.post(rodar, codigo, format="json")
                    self.assertEqual(resposta.status_code, 200, resposta.data)
                    self.assertTrue(resposta.data["aprovado"], resposta.data)
                    self.assertEqual(resposta.data["total"], 2)
                    self.assertFalse(eventos.exists())

                    corpo_errado = {
                        "codigo": (
                            f"def {especificacao.funcao}(*args):\n"
                            "    return 'resposta incorreta'\n"
                        )
                    }
                    rejeitada = cliente.post(enviar, corpo_errado, format="json")
                    self.assertEqual(rejeitada.status_code, 200, rejeitada.data)
                    self.assertFalse(rejeitada.data["aprovado"], rejeitada.data)
                    self.assertFalse(eventos.exists())

                    aprovada = cliente.post(enviar, codigo, format="json")
                    self.assertEqual(aprovada.status_code, 200, aprovada.data)
                    self.assertTrue(aprovada.data["aprovado"], aprovada.data)
                    casos = aprovada.data["correcao"]["casos"]
                    self.assertEqual(len(casos), especificacao.casos.count())
                    for caso in casos[2:]:
                        self.assertEqual(set(caso), {"ordem", "visivel", "passou"})
                        self.assertFalse(caso["visivel"])
                        self.assertTrue(caso["passou"])
                    self.assertGreater(aprovada.data["xp_ganho"], 0)
                    self.assertEqual(eventos.count(), 1)

    def test_todos_os_exercicios_publicados_de_python_tem_correcao(self):
        exercicios = Exercicio.objects.filter(
            trilha__slug="python",
            tipo=Tipo.CODIGO,
            status=StatusEditorial.PUBLICADO,
        )
        self.assertEqual(exercicios.count(), 16)
        self.assertFalse(exercicios.filter(especificacao_codigo__isnull=True).exists())

    def test_rodar_e_enviar_os_exercicios_de_arquivos(self):
        simulacoes = {
            "contar-linhas": (
                'def contar_linhas(caminho):\n'
                '    with open(caminho, encoding="utf-8") as arquivo:\n'
                '        return len(arquivo.read())\n',
                3,
            ),
            "salvar-linhas": (
                'def salvar(caminho, linhas):\n    return linhas\n',
                ["Ana", "Bia"],
            ),
        }
        with patch("apps.correcao.services.obter_cliente", return_value=ExecutorLocal()):
            for indice, (slug, (codigo_errado, esperado)) in enumerate(
                simulacoes.items(), start=1
            ):
                with self.subTest(exercicio=slug):
                    aluno = criar_aluno(nickname=f"aluno_arquivo_{indice}")
                    select_starter_creature(user=aluno, creature_slug="shellby")
                    cliente = APIClient()
                    cliente.force_authenticate(user=aluno)
                    kwargs = {"trilha_slug": "python", "exercicio_slug": slug}
                    exercicio = Exercicio.objects.get(trilha__slug="python", slug=slug)
                    eventos = EventoXP.objects.filter(user=aluno, exercicio=exercicio)
                    codigo = {"codigo": exercicio.solucao_autor}

                    rodada = cliente.post(
                        reverse("correcao:executar", kwargs=kwargs), codigo, format="json"
                    )
                    self.assertEqual(rodada.status_code, 200, rodada.data)
                    self.assertEqual((rodada.data["aprovados"], rodada.data["total"]), (2, 2))
                    self.assertEqual(rodada.data["casos"][0]["obtido"], esperado)
                    self.assertFalse(eventos.exists())

                    enviar = reverse("progressao:concluir-exercicio", kwargs=kwargs)
                    rejeitada = cliente.post(enviar, {"codigo": codigo_errado}, format="json")
                    self.assertEqual(rejeitada.status_code, 200, rejeitada.data)
                    self.assertFalse(rejeitada.data["aprovado"])
                    self.assertFalse(eventos.exists())

                    aprovada = cliente.post(enviar, codigo, format="json")
                    self.assertEqual(aprovada.status_code, 200, aprovada.data)
                    correcao = aprovada.data["correcao"]
                    self.assertEqual((correcao["aprovados"], correcao["total"]), (5, 5))
                    for caso in correcao["casos"][2:]:
                        self.assertEqual(set(caso), {"ordem", "visivel", "passou"})
                    self.assertGreater(aprovada.data["xp_ganho"], 0)
                    self.assertEqual(eventos.count(), 1)

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
        publicados = Exercicio.objects.filter(
            trilha__slug="banco-de-dados",
            tipo=Tipo.CODIGO,
            status=StatusEditorial.PUBLICADO,
        )
        self.assertEqual(publicados.count(), 13)
        self.assertEqual(
            set(especificacoes.values_list("exercicio__slug", flat=True)),
            set(publicados.values_list("slug", flat=True)),
        )
        for especificacao in especificacoes:
            with self.subTest(exercicio=especificacao.exercicio.slug):
                self.assertEqual(especificacao.exercicio.explicacao, "")
                casos = list(especificacao.casos.all())
                comando = sql.preparar_comando(
                    especificacao.exercicio.solucao_autor, casos
                )
                entrada, marcador = sql.montar_entrada(comando, casos)
                execucao = ExecutorLocal().executar(
                    codigo=sql.PROGRAMA, stdin=entrada, linguagem=Linguagem.PYTHON
                )
                resultado = _julgar_sql(execucao, casos, marcador)
                self.assertEqual(resultado["veredito"], Veredito.APROVADO, resultado)
