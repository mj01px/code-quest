from unittest import mock

from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.contas.tests.helpers import criar_aluno
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

CLIENTE = "apps.correcao.services.obter_cliente"


def _rota(nome, exercicio):
    return reverse(
        nome,
        kwargs={"trilha_slug": exercicio.trilha.slug, "exercicio_slug": exercicio.slug},
    )


class ApiCorrecaoTest(TestCase):
    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)
        self.user = criar_aluno()
        select_starter_creature(user=self.user, creature_slug="shellby")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.exercicio = criar_exercicio()
        criar_especificacao(self.exercicio)
        self.executor = ExecutorLocal()
        patcher = mock.patch(CLIENTE, return_value=self.executor)
        patcher.start()
        self.addCleanup(patcher.stop)

    def _post(self, nome, corpo=None, exercicio=None):
        return self.client.post(
            _rota(nome, exercicio or self.exercicio), corpo or {}, format="json"
        )

    def test_rotas_exigem_autenticacao(self):
        anonimo = APIClient()
        self.assertEqual(
            anonimo.get(_rota("correcao:especificacao", self.exercicio)).status_code,
            401,
        )
        self.assertEqual(
            anonimo.post(_rota("correcao:executar", self.exercicio)).status_code, 401
        )

    def test_especificacao_mostra_so_os_exemplos_visiveis(self):
        resposta = self.client.get(_rota("correcao:especificacao", self.exercicio))

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data["funcao"], "dobro")
        self.assertEqual(
            [e["argumentos"] for e in resposta.data["exemplos"]], [[2], [0]]
        )
        self.assertNotIn("-3", str(resposta.content))

    def test_especificacao_de_exercicio_sem_correcao_e_404(self):
        outro = criar_exercicio(slug="ex-2")
        self.assertEqual(
            self.client.get(_rota("correcao:especificacao", outro)).status_code, 404
        )

    def test_executar_devolve_o_resultado_dos_visiveis(self):
        resposta = self._post("correcao:executar", {"codigo": CODIGO_ERRADO})

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data["veredito"], "RESPOSTA_ERRADA")
        self.assertEqual(resposta.data["total"], 2)
        self.assertEqual(resposta.data["casos"][1]["obtido"], 2)

    def test_executar_nunca_da_xp(self):
        self._post("correcao:executar", {"codigo": CODIGO_CERTO})
        self.assertFalse(EventoXP.objects.exists())

    def test_executar_com_judge0_fora_do_ar_e_503(self):
        with mock.patch(CLIENTE, return_value=ClienteForaDoAr()):
            resposta = self._post("correcao:executar", {"codigo": CODIGO_CERTO})

        self.assertEqual(resposta.status_code, 503)
        self.assertEqual(resposta.data["error"]["code"], "corretor_indisponivel")

    def test_executar_com_corpo_que_nao_e_objeto_e_400(self):
        resposta = self.client.post(
            _rota("correcao:executar", self.exercicio), ["x"], format="json"
        )
        self.assertEqual(resposta.status_code, 400)

    def test_concluir_com_codigo_errado_nao_da_xp(self):
        resposta = self._post(
            "progressao:concluir-exercicio", {"codigo": CODIGO_ERRADO}
        )

        self.assertEqual(resposta.status_code, 200)
        self.assertIs(resposta.data["aprovado"], False)
        self.assertEqual(resposta.data["correcao"]["veredito"], "RESPOSTA_ERRADA")
        self.assertNotIn("xp_ganho", resposta.data)
        self.assertFalse(EventoXP.objects.exists())

    def test_concluir_com_codigo_certo_da_xp(self):
        resposta = self._post("progressao:concluir-exercicio", {"codigo": CODIGO_CERTO})

        self.assertEqual(resposta.status_code, 200)
        self.assertIs(resposta.data["aprovado"], True)
        self.assertEqual(resposta.data["xp_ganho"], 50)
        self.assertEqual(resposta.data["correcao"]["veredito"], "APROVADO")
        self.assertEqual(EventoXP.objects.filter(user=self.user).count(), 1)

    def test_concluir_sem_codigo_nao_da_xp(self):
        resposta = self._post("progressao:concluir-exercicio")

        self.assertEqual(resposta.status_code, 400)
        self.assertEqual(resposta.data["error"]["details"][0]["code"], "codigo_vazio")
        self.assertFalse(EventoXP.objects.exists())

    def test_concluir_com_judge0_fora_do_ar_nao_da_xp(self):
        with mock.patch(CLIENTE, return_value=ClienteForaDoAr()):
            resposta = self._post(
                "progressao:concluir-exercicio", {"codigo": CODIGO_CERTO}
            )

        self.assertEqual(resposta.status_code, 503)
        self.assertFalse(EventoXP.objects.exists())

    def test_concluir_esconde_os_casos_ocultos(self):
        resposta = self._post(
            "progressao:concluir-exercicio",
            {"codigo": "def dobro(n):\n    raise ValueError(str(n))\n"},
        )
        ocultos = [c for c in resposta.data["correcao"]["casos"] if not c["visivel"]]

        self.assertEqual(len(ocultos), 2)
        for caso in ocultos:
            self.assertEqual(set(caso), {"ordem", "visivel", "passou"})
        self.assertNotIn("-3", str(resposta.content))

    def test_exercicio_sem_correcao_segue_como_antes(self):
        teorico = criar_exercicio(slug="ex-teorico")
        resposta = self._post("progressao:concluir-exercicio", exercicio=teorico)

        self.assertEqual(resposta.status_code, 200)
        self.assertIs(resposta.data["aprovado"], True)
        self.assertIsNone(resposta.data["correcao"])
        self.assertEqual(resposta.data["xp_ganho"], 50)
        self.assertEqual(self.executor.chamadas, 0)

    def test_xp_no_corpo_continua_ignorado(self):
        resposta = self._post(
            "progressao:concluir-exercicio",
            {"codigo": CODIGO_CERTO, "xp": 999999, "aprovado": True},
        )
        self.assertEqual(resposta.data["xp_ganho"], 50)