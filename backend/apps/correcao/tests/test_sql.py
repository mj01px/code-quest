import json
from unittest import mock

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.contas.tests.helpers import criar_aluno
from apps.correcao.judge0 import Execucao
from apps.correcao.management.commands._casos_sql import CASOS_SQL
from apps.correcao.models import (
    CasoDeTeste,
    EspecificacaoDeCodigo,
    Linguagem,
    Submissao,
)
from apps.correcao.sql import PROGRAMA, preparar_comando
from apps.gamificacao.services import select_starter_creature
from apps.progressao.models import EventoXP
from apps.progressao.tests.test_credito_xp import criar_exercicio

from .helpers import ExecutorLocal


class SqlTest(TestCase):
    def setUp(self):
        self.user = criar_aluno()
        select_starter_creature(user=self.user, creature_slug="shellby")
        self.exercicio = criar_exercicio()
        self.especificacao = EspecificacaoDeCodigo.objects.create(
            exercicio=self.exercicio,
            linguagem=Linguagem.SQL,
            funcao="",
            codigo_inicial="SELECT 1;",
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.judge = mock.Mock()
        self.judge.executar.return_value = Execucao(
            status_id=3, stdout="2\n", stderr="", tempo=0.01, memoria=1024
        )
        patcher = mock.patch(
            "apps.correcao.services.obter_cliente", return_value=self.judge
        )
        patcher.start()
        self.addCleanup(patcher.stop)

    def rota(self, nome):
        return reverse(
            nome,
            kwargs={
                "trilha_slug": self.exercicio.trilha.slug,
                "exercicio_slug": self.exercicio.slug,
            },
        )

    def executar(self, codigo="SELECT 1 + 1;"):
        return self.client.post(
            self.rota("correcao:executar"), {"codigo": codigo}, format="json"
        )

    def enviar(self, codigo):
        return self.client.post(
            self.rota("progressao:concluir-exercicio"),
            {"codigo": codigo},
            format="json",
        )

    def preparar_correcao(self, slug):
        for ordem, (argumentos, esperado, visivel) in enumerate(
            CASOS_SQL[slug]["casos"], start=1
        ):
            CasoDeTeste.objects.create(
                especificacao=self.especificacao,
                ordem=ordem,
                argumentos=argumentos,
                esperado=esperado,
                visivel=visivel,
            )
        self.judge.executar.side_effect = ExecutorLocal().executar

    def test_sql_nao_precisa_de_funcao_nem_parametros_python(self):
        self.especificacao.full_clean()
        resposta = self.client.get(self.rota("correcao:especificacao"))
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data["linguagem"], "SQL")
        self.assertEqual(resposta.data["funcao"], "")
        self.assertEqual(resposta.data["parametros"], [])

    def test_python_continua_exigindo_nome_de_funcao(self):
        self.especificacao.linguagem = Linguagem.PYTHON
        with self.assertRaises(ValidationError) as erro:
            self.especificacao.full_clean()
        self.assertIn("funcao", erro.exception.message_dict)

    def test_sql_recusa_requisitos_de_python(self):
        self.especificacao.requisitos = [{"regra": "exigir", "construcao": "for"}]
        with self.assertRaises(ValidationError) as erro:
            self.especificacao.full_clean()
        self.assertIn("requisitos", erro.exception.message_dict)

    def test_rodar_sql_usa_biblioteca_e_nao_credita_xp(self):
        resposta = self.executar()
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data["veredito"], "APROVADO")
        self.assertTrue(resposta.data["personalizado"])
        self.assertEqual(resposta.data["saida"], "2\n")
        self.assertEqual(resposta.data["casos"], [])
        self.judge.executar.assert_called_once()
        argumentos = self.judge.executar.call_args.kwargs
        self.assertEqual(argumentos["codigo"], PROGRAMA)
        self.assertEqual(argumentos["linguagem"], Linguagem.PYTHON)
        self.assertEqual(json.loads(argumentos["stdin"])["comando"], "SELECT 1 + 1;")
        self.assertFalse(EventoXP.objects.exists())

    def test_sql_sem_saida_tambem_termina_normalmente(self):
        self.judge.executar.return_value = Execucao(3, "", "", 0.01, 1024)
        resposta = self.executar("CREATE TABLE item (id INTEGER);")
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data["veredito"], "APROVADO")
        self.assertEqual(resposta.data["saida"], "")

    def test_erro_sql_volta_no_stderr(self):
        self.judge.executar.return_value = Execucao(
            11, "", 'Error: near "SELEC": syntax error', 0.01, 1024
        )
        resposta = self.executar("SELEC 2;")
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data["veredito"], "ERRO_DE_EXECUCAO")
        self.assertIn("syntax error", resposta.data["erro"])

    def test_stderr_sql_nao_e_tratado_como_execucao_bem_sucedida(self):
        self.judge.executar.return_value = Execucao(
            3, "", "Error: no such table: item", 0.01, 1024
        )
        resposta = self.executar("SELECT * FROM item;")
        self.assertEqual(resposta.data["veredito"], "ERRO_DE_EXECUCAO")

    def test_sql_preserva_tempo_esgotado(self):
        self.judge.executar.return_value = Execucao(5, "", "", None, None)
        resposta = self.executar()
        self.assertEqual(resposta.data["veredito"], "TEMPO_ESGOTADO")

    def test_repetir_sql_usa_cache(self):
        self.executar()
        self.executar()
        self.assertEqual(self.judge.executar.call_count, 1)
        self.assertEqual(Submissao.objects.filter(em_cache=True).count(), 1)

    def test_comandos_do_console_nao_chegam_ao_judge0(self):
        for codigo in (
            ".shell whoami",
            ".open outro.db",
            ".output saida.txt",
            ".read script.sql",
            ".bail off",
            ".load extensao",
        ):
            with self.subTest(codigo=codigo):
                cache.clear()
                self.assertEqual(self.executar(codigo).status_code, 400)
        self.judge.executar.assert_not_called()
        self.assertFalse(Submissao.objects.exists())

    def test_decimal_sql_nao_e_confundido_com_comando_do_console(self):
        self.assertEqual(preparar_comando("SELECT\n.5;", []), "SELECT\n.5;")

    def test_enviar_sql_recusa_conclusao_sem_correcao(self):
        resposta = self.enviar("SELECT 2;")
        self.assertEqual(resposta.status_code, 400)
        self.assertEqual(
            resposta.data["error"]["details"][0]["code"], "sem_correcao_automatica"
        )
        self.judge.executar.assert_not_called()
        self.assertFalse(EventoXP.objects.exists())

    def test_rodar_sql_mostra_so_os_casos_visiveis(self):
        self.preparar_correcao("restringir-nota")
        exemplos = self.client.get(self.rota("correcao:especificacao")).data["exemplos"]
        self.assertEqual(len(exemplos), 5)
        self.assertEqual(exemplos[0], {"ordem": 1, "descricao": "Aceita a nota 0"})

        resposta = self.executar(
            "nota NUMERIC CHECK (nota BETWEEN 0 AND 10); -- limites inclusivos"
        )
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data["veredito"], "APROVADO")
        self.assertEqual(resposta.data["aprovados"], 5)
        self.assertEqual(resposta.data["total"], 5)
        self.assertFalse(resposta.data["personalizado"])
        self.assertEqual(resposta.data["saida"], "")
        self.assertTrue(all(c["visivel"] for c in resposta.data["casos"]))
        self.assertFalse(EventoXP.objects.exists())

    def test_enviar_nota_credita_xp_so_quando_passam_os_ocultos(self):
        self.preparar_correcao("restringir-nota")
        resposta = self.enviar("nota NUMERIC CHECK (nota BETWEEN -0.5 AND 10.5)")
        self.assertEqual(resposta.status_code, 200)
        self.assertFalse(resposta.data["aprovado"])
        self.assertEqual(resposta.data["correcao"]["aprovados"], 10)
        self.assertEqual(
            resposta.data["correcao"]["casos"][6],
            {"ordem": 7, "visivel": False, "passou": False},
        )
        self.assertFalse(EventoXP.objects.exists())

        resposta = self.enviar("nota NUMERIC CHECK (nota IN (0, 7.5, 10, 0.25, 9))")
        self.assertEqual(resposta.status_code, 200)
        self.assertFalse(resposta.data["aprovado"])
        self.assertFalse(EventoXP.objects.exists())

        resposta = self.enviar("nota NUMERIC CHECK (nota >= 0 AND nota <= 10)")
        self.assertEqual(resposta.status_code, 200)
        self.assertTrue(resposta.data["aprovado"])
        self.assertEqual(resposta.data["correcao"]["aprovados"], 14)
        self.assertEqual(resposta.data["correcao"]["total"], 14)
        self.assertEqual(EventoXP.objects.count(), 1)

    def test_editor_so_recupera_codigo_aprovado_enquanto_exercicio_esta_concluido(self):
        self.preparar_correcao("restringir-nota")
        codigo = "nota NUMERIC CHECK (nota BETWEEN 0 AND 10)"
        rota = self.rota("correcao:especificacao")

        resposta = self.enviar(codigo)
        self.assertTrue(resposta.data["aprovado"])
        self.assertEqual(self.client.get(rota).data["codigo_aprovado"], codigo)

        EventoXP.objects.filter(user=self.user, exercicio=self.exercicio).delete()

        self.assertEqual(self.client.get(rota).data["codigo_aprovado"], "")
        self.assertTrue(
            Submissao.objects.filter(user=self.user, codigo=codigo).exists()
        )

    def test_tabela_sem_email_unico_falha_e_aceita_restricao_na_tabela(self):
        self.preparar_correcao("criar-tabela-aluno")
        colunas = "id INTEGER, nome VARCHAR(120) NOT NULL, email TEXT NOT NULL, nascimento DATE"
        incorreto = self.enviar(f"CREATE TABLE aluno ({colunas}, PRIMARY KEY(id));")
        self.assertEqual(incorreto.status_code, 200)
        self.assertFalse(incorreto.data["aprovado"])
        self.assertFalse(incorreto.data["correcao"]["casos"][4]["passou"])
        self.assertFalse(EventoXP.objects.exists())

        correto = self.enviar(
            f'-- Cadastro\nCREATE TABLE "aluno" ({colunas}, PRIMARY KEY(id), UNIQUE(email))'
        )
        self.assertEqual(correto.status_code, 200)
        self.assertTrue(correto.data["aprovado"])
        self.assertEqual(correto.data["correcao"]["aprovados"], 8)
        self.assertEqual(EventoXP.objects.count(), 1)

    def test_correcao_recusa_comando_extra_antes_de_chamar_judge0(self):
        self.preparar_correcao("criar-tabela-aluno")
        for codigo in (
            "CREATE TABLE aluno (id INTEGER); SELECT 1;",
            "CREATE TABLE aluno AS SELECT 1;",
        ):
            with self.subTest(codigo=codigo):
                self.assertEqual(self.enviar(codigo).status_code, 400)
        self.judge.executar.assert_not_called()
        self.assertFalse(EventoXP.objects.exists())

    def test_recusa_acesso_ao_script_e_comandos_extras_no_sql(self):
        self.preparar_correcao("restringir-nota")
        for codigo in (
            "nota REAL CHECK (readfile('script.sql') IS NOT NULL)",
            "nota REAL)\nGO\nSELECT 'resultado forjado'\nGO\nCREATE TABLE extra (id INTEGER",
            "nota REAL)\n/\nSELECT 'resultado forjado'\n/\nCREATE TABLE extra (id INTEGER",
        ):
            with self.subTest(codigo=codigo):
                resposta = self.enviar(codigo)
                self.assertEqual(resposta.status_code, 200)
                self.assertFalse(resposta.data["aprovado"])
                self.assertEqual(
                    resposta.data["correcao"]["veredito"], "ERRO_DE_EXECUCAO"
                )
        self.assertFalse(EventoXP.objects.exists())

    def test_resultados_incompletos_ou_duplicados_nao_creditam_xp(self):
        self.preparar_correcao("restringir-nota")

        def responder(*, codigo, stdin, linguagem):
            entrada = json.loads(stdin)
            resultados = [
                f"{entrada['marcador']}:{ordem}:1" for ordem, *_ in entrada["casos"]
            ]
            if "REAL" in entrada["comando"]:
                resultados.pop()
            else:
                resultados.append(resultados[0])
            return Execucao(3, "\n".join(resultados), "", 0.01, 1024)

        self.judge.executar.side_effect = responder
        for tipo in ("REAL", "NUMERIC"):
            with self.subTest(tipo=tipo):
                resposta = self.enviar(f"nota {tipo} CHECK (nota BETWEEN 0 AND 10)")
                self.assertEqual(resposta.status_code, 200)
                self.assertFalse(resposta.data["aprovado"])
                self.assertEqual(
                    resposta.data["correcao"]["veredito"], "ERRO_DE_EXECUCAO"
                )
        self.assertFalse(EventoXP.objects.exists())
