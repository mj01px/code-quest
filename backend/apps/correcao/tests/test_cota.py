"""Cota do Judge0 em três camadas (A2 e A3 do handoff).

1. Por usuário: rajada de 5/min (throttle) e teto de chamadas pagas no dia,
   os dois divididos entre executar/ e o envio de concluir/.
2. Cache de submissão idêntica por 10 minutos.
3. Disjuntor global em 90% da cota diária do RapidAPI, com 503 no envelope.

O Judge0 é sempre trocado por um executor local que conta as chamadas: nenhum
teste sai para a rede.
"""

from datetime import timedelta
from unittest import mock

from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.contas.tests.helpers import criar_aluno
from apps.correcao.models import EspecificacaoDeCodigo, Modo, Submissao, Veredito
from apps.correcao.services import executar_codigo
from apps.gamificacao.services import select_starter_creature
from apps.progressao.models import EventoXP
from apps.progressao.tests.test_credito_xp import criar_exercicio

from .helpers import (
    CODIGO_CERTO,
    CODIGO_ERRADO,
    ClienteForaDoAr,
    ExecutorLocal,
    criar_especificacao,
)

OUTRO_CODIGO = "def dobro(n):\n    return 2 * n\n"
CLIENTE = "apps.correcao.services.obter_cliente"
EXECUTAR = "correcao:executar"
CONCLUIR = "progressao:concluir-exercicio"


def _rota(nome, exercicio):
    return reverse(
        nome,
        kwargs={"trilha_slug": exercicio.trilha.slug, "exercicio_slug": exercicio.slug},
    )


class _ComJudge0Falso(TestCase):
    def setUp(self):
        self.exercicio = criar_exercicio()
        criar_especificacao(self.exercicio)
        self.executor = ExecutorLocal()
        patcher = mock.patch(CLIENTE, return_value=self.executor)
        patcher.start()
        self.addCleanup(patcher.stop)

    def _cliente(self, nickname):
        user = criar_aluno(nickname)
        select_starter_creature(user=user, creature_slug="shellby")
        cliente = APIClient()
        cliente.force_authenticate(user=user)
        return cliente

    def _post(self, cliente, nome=EXECUTAR, codigo=CODIGO_CERTO, exercicio=None):
        return cliente.post(
            _rota(nome, exercicio or self.exercicio), {"codigo": codigo}, format="json"
        )

    def _esgotar_por_minuto(self, cliente):
        for _ in range(5):
            self.assertEqual(self._post(cliente).status_code, 200)
        self.assertEqual(self._post(cliente).status_code, 429)


class ThrottlePorUsuarioTest(_ComJudge0Falso):
    def test_usuario_a_esgota_a_sua_cota_e_o_b_continua(self):
        self._esgotar_por_minuto(self._cliente("aluno_a"))

        self.assertEqual(self._post(self._cliente("aluno_b")).status_code, 200)

    def test_concluir_respeita_o_mesmo_limite_de_executar(self):
        cliente = self._cliente("aluno_a")
        self._esgotar_por_minuto(cliente)

        r = self._post(cliente, CONCLUIR)

        self.assertEqual(r.status_code, 429)
        self.assertFalse(EventoXP.objects.exists())

    def test_concluir_sem_correcao_automatica_nao_gasta_o_balde_do_judge0(self):
        cliente = self._cliente("aluno_a")
        self._esgotar_por_minuto(cliente)
        leitura = criar_exercicio(slug="leitura")  # sem especificação de código

        r = cliente.post(_rota(CONCLUIR, leitura), format="json")

        self.assertEqual(r.status_code, 200)
        self.assertIs(r.data["aprovado"], True)

    def test_throttle_de_outro_escopo_nao_e_afetado(self):
        cliente = self._cliente("aluno_a")
        self._esgotar_por_minuto(cliente)

        self.assertEqual(cliente.get(reverse("trilhas:trilha-lista")).status_code, 200)


@override_settings(JUDGE0_LIMITE_POR_USUARIO=2)
class TetoDiarioPorUsuarioTest(_ComJudge0Falso):
    def _duas_pagas(self, cliente):
        for codigo in (CODIGO_CERTO, CODIGO_ERRADO):
            self.assertEqual(self._post(cliente, codigo=codigo).status_code, 200)

    def test_usuario_a_atinge_o_teto_e_o_b_continua(self):
        cliente = self._cliente("aluno_a")
        self._duas_pagas(cliente)

        r = self._post(cliente, codigo=OUTRO_CODIGO)

        self.assertEqual(r.status_code, 429)
        self.assertEqual(r.data["error"]["code"], "limite_do_usuario")
        self.assertEqual(self.executor.chamadas, 2)
        outro = self._post(self._cliente("aluno_b"), codigo=OUTRO_CODIGO)
        self.assertEqual(outro.status_code, 200)

    def test_concluir_divide_o_teto_com_executar(self):
        cliente = self._cliente("aluno_a")
        self._duas_pagas(cliente)

        r = self._post(cliente, CONCLUIR)

        self.assertEqual(r.status_code, 429)
        self.assertFalse(EventoXP.objects.exists())

    def test_acerto_de_cache_nao_gasta_o_teto(self):
        cliente = self._cliente("aluno_a")
        self._duas_pagas(cliente)

        self.assertEqual(self._post(cliente, codigo=CODIGO_CERTO).status_code, 200)
        self.assertEqual(self.executor.chamadas, 2)

    def test_chamada_que_falha_tambem_conta(self):
        # Timeout ou 5xx do Judge0 também gasta a cota do RapidAPI.
        cliente = self._cliente("aluno_a")
        with mock.patch(CLIENTE, return_value=ClienteForaDoAr()):
            self.assertEqual(self._post(cliente).status_code, 503)
            self.assertEqual(self._post(cliente).status_code, 503)

        self.assertEqual(self._post(cliente).status_code, 429)
        self.assertEqual(self.executor.chamadas, 0)


class CacheDeSubmissaoTest(_ComJudge0Falso):
    def setUp(self):
        super().setUp()
        self.user = criar_aluno()

    def _executar(self, codigo, exercicio=None):
        return executar_codigo(
            user=self.user, exercicio=exercicio or self.exercicio, codigo=codigo
        )

    def test_identica_dentro_de_10_minutos_nao_bate_no_judge0(self):
        self._executar(CODIGO_CERTO)
        # Espaço no fim de linha e linhas em branco nas bordas não contam.
        self._executar("\n\n" + CODIGO_CERTO.replace("\n", "   \n") + "\n\n")

        self.assertEqual(self.executor.chamadas, 1)

    def test_codigo_diferente_bate_as_duas(self):
        self._executar(CODIGO_CERTO)
        self._executar(CODIGO_ERRADO)
        # Indentação interna não é normalizada.
        self._executar(CODIGO_CERTO.replace("    ", "  "))

        self.assertEqual(self.executor.chamadas, 3)

    def test_separador_de_linha_unicode_nao_junta_programas(self):
        # U+2028 e U+2029 não são fim de linha em Python: aqui são dois
        # retornos diferentes e não podem cair na mesma chave.
        self._executar('def dobro(n):\n    return "x y"\n')
        self._executar('def dobro(n):\n    return "x y"\n')

        self.assertEqual(self.executor.chamadas, 2)

    def test_mesmo_codigo_em_linguagens_diferentes_bate_as_duas(self):
        # Só Python existe hoje; a outra linguagem entra direto no banco para
        # provar que ela faz parte da chave (função e casos são iguais).
        outro = criar_exercicio(slug="ex-2")
        criar_especificacao(outro)
        EspecificacaoDeCodigo.objects.filter(exercicio=outro).update(linguagem="OUTRA")

        self._executar(CODIGO_CERTO)
        self._executar(CODIGO_CERTO, exercicio=outro)

        self.assertEqual(self.executor.chamadas, 2)

    def test_cache_vale_ate_10_minutos_e_depois_volta_a_bater(self):
        self._executar(CODIGO_CERTO)

        Submissao.objects.update(criado_em=timezone.now() - timedelta(minutes=9))
        self._executar(CODIGO_CERTO)
        self.assertEqual(self.executor.chamadas, 1)

        Submissao.objects.update(criado_em=timezone.now() - timedelta(minutes=11))
        self._executar(CODIGO_CERTO)
        self.assertEqual(self.executor.chamadas, 2)


@override_settings(JUDGE0_LIMITE_DIARIO=10)
class DisjuntorTest(_ComJudge0Falso):
    def _pagas_hoje(self, quantas):
        # De outra conta: o teto por usuário não entra na conta.
        user = criar_aluno("outras_contas")
        Submissao.objects.bulk_create(
            Submissao(
                user=user,
                exercicio=self.exercicio,
                modo=Modo.EXECUTAR,
                codigo="x",
                hash=f"h{i}",
                veredito=Veredito.APROVADO,
                resultado={},
            )
            for i in range(quantas)
        )

    def test_em_90_por_cento_da_cota_devolve_503_no_envelope(self):
        cliente = self._cliente("aluno_a")
        self._pagas_hoje(9)

        r = self._post(cliente)

        self.assertEqual(r.status_code, 503)
        self.assertEqual(r.data["error"]["code"], "limite_diario")
        self.assertTrue(r.data["error"]["message"])
        self.assertEqual(r.data["error"]["details"], [])
        self.assertEqual(self.executor.chamadas, 0)

    def test_abaixo_de_90_por_cento_ainda_chama(self):
        cliente = self._cliente("aluno_a")
        self._pagas_hoje(8)

        self.assertEqual(self._post(cliente).status_code, 200)
        self.assertEqual(self.executor.chamadas, 1)

    def test_zera_a_meia_noite(self):
        cliente = self._cliente("aluno_a")
        self._pagas_hoje(9)
        Submissao.objects.update(criado_em=timezone.now() - timedelta(days=1))

        self.assertEqual(self._post(cliente).status_code, 200)
