from unittest import mock

from django.core.exceptions import ValidationError
from django.test import TestCase, override_settings

from apps.contas.tests.helpers import criar_aluno
from apps.correcao.excecoes import CotaDiariaEsgotada
from apps.correcao.judge0 import Execucao, Judge0Error
from apps.correcao.models import Modo, Submissao, Veredito
from apps.correcao.services import (
    LIMITE_DE_CARACTERES,
    corrigir_envio,
    executar_codigo,
)
from apps.progressao.tests.test_credito_xp import criar_exercicio

from .helpers import (
    CODIGO_CERTO,
    CODIGO_ERRADO,
    ClienteFixo,
    ClienteForaDoAr,
    ExecutorLocal,
    criar_especificacao,
)

CLIENTE = "apps.correcao.services.obter_cliente"


class CorrecaoTest(TestCase):
    def setUp(self):
        self.user = criar_aluno()
        self.exercicio = criar_exercicio()
        criar_especificacao(self.exercicio)
        self.executor = ExecutorLocal()
        patcher = mock.patch(CLIENTE, return_value=self.executor)
        patcher.start()
        self.addCleanup(patcher.stop)

    def _enviar(self, codigo):
        return corrigir_envio(user=self.user, exercicio=self.exercicio, codigo=codigo)

    def _executar(self, codigo):
        return executar_codigo(user=self.user, exercicio=self.exercicio, codigo=codigo)

    def test_codigo_certo_e_aprovado(self):
        correcao = self._enviar(CODIGO_CERTO)
        self.assertEqual(correcao.veredito, Veredito.APROVADO)
        self.assertEqual((correcao.aprovados, correcao.total), (4, 4))

    def test_codigo_errado_reprova_com_a_contagem(self):
        correcao = self._enviar(CODIGO_ERRADO)
        self.assertEqual(correcao.veredito, Veredito.RESPOSTA_ERRADA)
        self.assertEqual((correcao.aprovados, correcao.total), (1, 4))

    def test_decorar_os_exemplos_visiveis_nao_passa(self):
        decorado = "def dobro(n):\n    return {2: 4, 0: 0}[n]\n"
        self.assertEqual(self._executar(decorado).veredito, Veredito.APROVADO)
        self.assertEqual(self._enviar(decorado).veredito, Veredito.RESPOSTA_ERRADA)

    def test_executar_roda_so_os_visiveis(self):
        correcao = self._executar(CODIGO_CERTO)
        self.assertEqual(correcao.total, 2)
        self.assertTrue(all(c["visivel"] for c in correcao.casos))

    def test_erro_em_tempo_de_execucao_e_erro_de_execucao(self):
        codigo = "raise RuntimeError('quebrou')\n" + CODIGO_CERTO
        correcao = self._executar(codigo)
        self.assertEqual(correcao.veredito, Veredito.ERRO_DE_EXECUCAO)
        self.assertIn("RuntimeError", correcao.erro)

    def test_excecao_num_caso_nao_derruba_os_outros(self):
        codigo = "def dobro(n):\n    if n == 0:\n        raise RuntimeError('zero')\n    return n * 2\n"
        correcao = self._executar(codigo)
        self.assertEqual((correcao.aprovados, correcao.total), (1, 2))
        self.assertEqual(correcao.casos[1]["erro"], "RuntimeError: zero")

    def test_executar_mostra_o_print_do_aluno(self):
        correcao = self._executar("print('depurando')\n" + CODIGO_CERTO)
        self.assertEqual(correcao.saida, "depurando")

    def test_enviar_nao_devolve_nada_que_vaze_os_casos_ocultos(self):
        vazador = (
            "import sys\n"
            "entrada = sys.stdin.read()\n"
            "print(entrada)\n"
            "def dobro(n):\n"
            "    raise Exception(entrada)\n"
        )
        correcao = self._enviar(vazador)
        self.assertEqual(correcao.saida, "")
        self.assertEqual(correcao.erro, "")

        correcao = self._enviar("def dobro(n):\n    raise ValueError(str(n))\n")
        ocultos = [c for c in correcao.casos if not c["visivel"]]
        self.assertEqual(len(ocultos), 2)
        for caso in ocultos:
            self.assertEqual(set(caso), {"ordem", "visivel", "passou"})

    def test_enviar_mostra_detalhe_dos_visiveis(self):
        correcao = self._enviar(CODIGO_ERRADO)
        primeiro = correcao.casos[0]
        self.assertEqual(primeiro["argumentos"], [2])
        self.assertEqual(primeiro["obtido"], 4)

    def test_mesmo_codigo_nao_paga_o_judge0_de_novo(self):
        self._enviar(CODIGO_CERTO)
        self._enviar(CODIGO_CERTO)

        self.assertEqual(self.executor.chamadas, 1)
        self.assertEqual(Submissao.objects.filter(em_cache=True).count(), 1)

    def test_cache_separa_executar_de_enviar(self):
        self._executar(CODIGO_CERTO)
        self._enviar(CODIGO_CERTO)
        self.assertEqual(self.executor.chamadas, 2)

    def test_mudar_um_caso_invalida_o_cache(self):
        self._enviar(CODIGO_CERTO)
        caso = self.exercicio.especificacao_codigo.casos.get(ordem=4)
        caso.esperado = 21
        caso.save()

        correcao = self._enviar(CODIGO_CERTO)
        self.assertEqual(self.executor.chamadas, 2)
        self.assertEqual(correcao.veredito, Veredito.RESPOSTA_ERRADA)

    def test_esconder_um_caso_invalida_o_cache(self):
        # O resultado guardado decide o que mostrar: se a visibilidade não
        # entrasse na chave, o cache mostraria o caso que acabou de ser escondido.
        self._enviar(CODIGO_CERTO)
        self.exercicio.especificacao_codigo.casos.filter(ordem=1).update(visivel=False)

        correcao = self._enviar(CODIGO_CERTO)

        self.assertEqual(self.executor.chamadas, 2)
        self.assertNotIn("argumentos", correcao.casos[0])

    def test_toda_tentativa_fica_registrada(self):
        self._executar(CODIGO_ERRADO)
        self._enviar(CODIGO_CERTO)

        submissoes = Submissao.objects.filter(user=self.user).order_by("criado_em")
        self.assertEqual([s.modo for s in submissoes], [Modo.EXECUTAR, Modo.ENVIAR])
        self.assertEqual(submissoes[1].codigo, CODIGO_CERTO)
        # registra o input com hash para economizar requisicao
        self.assertEqual(len(submissoes[1].resultado["casos"]), 4)
        self.assertIn("argumentos", submissoes[1].resultado["casos"][3])


class AnaliseAntesDoJudge0Test(TestCase):
    def setUp(self):
        self.user = criar_aluno()
        self.exercicio = criar_exercicio()
        self.especificacao = criar_especificacao(self.exercicio)
        self.executor = ExecutorLocal()
        patcher = mock.patch(CLIENTE, return_value=self.executor)
        patcher.start()
        self.addCleanup(patcher.stop)

    def _codigo_barrado(self, codigo):
        with self.assertRaises(ValidationError) as contexto:
            corrigir_envio(user=self.user, exercicio=self.exercicio, codigo=codigo)
        return contexto.exception.error_dict["codigo"][0]

    def test_erro_de_sintaxe_nao_chama_o_judge0(self):
        erro = self._codigo_barrado("def dobro(n)\n    return n * 2\n")
        self.assertEqual(erro.code, "erro_de_sintaxe")
        self.assertEqual(self.executor.chamadas, 0)
        self.assertFalse(Submissao.objects.exists())

    def test_funcao_com_outro_nome_nao_chama_o_judge0(self):
        erro = self._codigo_barrado("def triplo(n):\n    return n * 3\n")
        self.assertEqual(erro.code, "funcao_ausente")
        self.assertEqual(self.executor.chamadas, 0)

    def test_requisito_exigido_barra_antes_do_judge0(self):
        self.especificacao.requisitos = [{"regra": "exigir", "construcao": "for"}]
        self.especificacao.save()

        erro = self._codigo_barrado(CODIGO_CERTO)
        self.assertEqual(erro.code, "requisito_exigido")
        self.assertEqual(self.executor.chamadas, 0)

    def test_requisito_proibido_mostra_a_linha(self):
        self.especificacao.requisitos = [{"regra": "proibir", "construcao": "import"}]
        self.especificacao.save()

        erro = self._codigo_barrado("import math\n" + CODIGO_CERTO)
        self.assertEqual(erro.code, "requisito_proibido")
        self.assertIn("(linha 1)", erro.message)

    def test_requisito_atendido_segue_para_o_judge0(self):
        self.especificacao.requisitos = [{"regra": "proibir", "construcao": "import"}]
        self.especificacao.save()

        correcao = corrigir_envio(
            user=self.user, exercicio=self.exercicio, codigo=CODIGO_CERTO
        )
        self.assertEqual(correcao.veredito, Veredito.APROVADO)
        self.assertEqual(self.executor.chamadas, 1)


class VereditoPeloStatusTest(TestCase):
    def setUp(self):
        self.user = criar_aluno()
        self.exercicio = criar_exercicio()
        criar_especificacao(self.exercicio)

    def _com(self, cliente):
        with mock.patch(CLIENTE, return_value=cliente):
            return corrigir_envio(
                user=self.user, exercicio=self.exercicio, codigo=CODIGO_CERTO
            )

    def test_tempo_esgotado(self):
        execucao = Execucao(status_id=5, stdout="", stderr="", tempo=2.0, memoria=None)
        self.assertEqual(
            self._com(ClienteFixo(execucao)).veredito, Veredito.TEMPO_ESGOTADO
        )

    def test_aceito_sem_marcador_e_erro_de_execucao(self):
        execucao = Execucao(status_id=3, stdout="", stderr="", tempo=0.1, memoria=1)
        self.assertEqual(
            self._com(ClienteFixo(execucao)).veredito, Veredito.ERRO_DE_EXECUCAO
        )

    def test_fora_do_ar_registra_a_tentativa_paga(self):
        # A chamada que falha também gastou a cota do RapidAPI: fica gravada
        # (e conta na cota), mas sem hash, então nunca serve de cache.
        with self.assertRaises(Judge0Error):
            self._com(ClienteForaDoAr())
        tentativa = Submissao.objects.get()
        self.assertFalse(tentativa.em_cache)
        self.assertEqual(tentativa.hash, "")
        self.assertEqual(tentativa.veredito, Veredito.ERRO_DE_EXECUCAO)


class ValidacaoTest(TestCase):
    def setUp(self):
        self.user = criar_aluno()
        self.exercicio = criar_exercicio()
        criar_especificacao(self.exercicio)
        self.executor = ExecutorLocal()
        patcher = mock.patch(CLIENTE, return_value=self.executor)
        patcher.start()
        self.addCleanup(patcher.stop)

    def _codigo_do_erro(self, contexto):
        return [
            e.code for erros in contexto.exception.error_dict.values() for e in erros
        ]

    def test_codigo_vazio(self):
        for vazio in ["", "   \n", None, 123]:
            with self.assertRaises(ValidationError) as contexto:
                corrigir_envio(user=self.user, exercicio=self.exercicio, codigo=vazio)
            self.assertEqual(self._codigo_do_erro(contexto), ["codigo_vazio"])
        self.assertEqual(self.executor.chamadas, 0)

    def test_codigo_grande_demais(self):
        codigo = "#" * (LIMITE_DE_CARACTERES + 1)
        with self.assertRaises(ValidationError) as contexto:
            corrigir_envio(user=self.user, exercicio=self.exercicio, codigo=codigo)
        self.assertEqual(self._codigo_do_erro(contexto), ["codigo_grande"])

    def test_exercicio_sem_especificacao(self):
        outro = criar_exercicio(slug="ex-2")
        with self.assertRaises(ValidationError) as contexto:
            corrigir_envio(user=self.user, exercicio=outro, codigo=CODIGO_CERTO)
        self.assertEqual(self._codigo_do_erro(contexto), ["sem_correcao_automatica"])

    def test_exercicio_nao_publicado(self):
        rascunho = criar_exercicio(slug="ex-3", publicado=False)
        criar_especificacao(rascunho)
        with self.assertRaises(ValidationError) as contexto:
            corrigir_envio(user=self.user, exercicio=rascunho, codigo=CODIGO_CERTO)
        self.assertEqual(self._codigo_do_erro(contexto), ["exercicio_nao_publicado"])

    def test_conta_inativa(self):
        self.user.is_active = False
        self.user.save()
        with self.assertRaises(ValidationError) as contexto:
            corrigir_envio(
                user=self.user, exercicio=self.exercicio, codigo=CODIGO_CERTO
            )
        self.assertEqual(self._codigo_do_erro(contexto), ["conta_inativa"])

    @override_settings(JUDGE0_LIMITE_DIARIO=1)
    def test_limite_diario_bloqueia_so_o_que_seria_pago(self):
        corrigir_envio(user=self.user, exercicio=self.exercicio, codigo=CODIGO_CERTO)

        with self.assertRaises(CotaDiariaEsgotada) as contexto:
            corrigir_envio(
                user=self.user, exercicio=self.exercicio, codigo=CODIGO_ERRADO
            )
        self.assertEqual(contexto.exception.get_codes(), "limite_diario")

        # ja guarda o cache, entao nao envia de novo
        correcao = corrigir_envio(
            user=self.user, exercicio=self.exercicio, codigo=CODIGO_CERTO
        )
        self.assertEqual(correcao.veredito, Veredito.APROVADO)
