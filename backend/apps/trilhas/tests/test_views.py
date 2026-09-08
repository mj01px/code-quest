"""Endpoints públicos do catálogo de trilhas."""

import json

from django.db import IntegrityError, transaction
from django.test import TestCase
from django.urls import reverse

from apps.trilhas.models import StatusEditorial

from .helpers import PUBLICADO, RASCUNHO, criar_aula, criar_exercicio, criar_trilha


class ListaDeTrilhasTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.publicada = criar_trilha("logica", nome="Lógica", ordem=1)
        cls.segunda = criar_trilha("python", nome="Python", ordem=2)
        criar_trilha("oculta", nome="Oculta", ordem=3, status=RASCUNHO)

        aula = criar_aula(cls.publicada, "variaveis")
        criar_exercicio(aula, "media", ordem=1)
        criar_exercicio(aula, "trocar", ordem=2)

        # Ruído que a contagem tem que ignorar.
        criar_exercicio(aula, "rascunho-de-exercicio", ordem=3, status=RASCUNHO)
        aula_oculta = criar_aula(cls.publicada, "oculta", ordem=2, status=RASCUNHO)
        criar_exercicio(aula_oculta, "invisivel")

    def setUp(self):
        self.url = reverse("trilhas:trilha-lista")

    def test_visitante_anonimo_consegue_ler(self):
        self.assertEqual(self.client.get(self.url).status_code, 200)

    def test_lista_apenas_trilhas_publicadas_na_ordem(self):
        dados = self.client.get(self.url).json()
        self.assertEqual([t["slug"] for t in dados], ["logica", "python"])

    def test_conta_somente_exercicios_publicados_de_aulas_publicadas(self):
        dados = self.client.get(self.url).json()
        logica = next(t for t in dados if t["slug"] == "logica")
        self.assertEqual(logica["total_aulas"], 1)
        self.assertEqual(logica["total_exercicios"], 2)

    def test_trilha_sem_conteudo_conta_zero(self):
        dados = self.client.get(self.url).json()
        python = next(t for t in dados if t["slug"] == "python")
        self.assertEqual(python["total_aulas"], 0)
        self.assertEqual(python["total_exercicios"], 0)

    def test_solucao_nao_aparece_no_payload(self):
        self.assertNotIn("solucao_autor", self.client.get(self.url).content.decode())

    def test_escrita_esta_bloqueada(self):
        self.assertEqual(self.client.post(self.url, {}).status_code, 405)


class DetalheDaTrilhaTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.trilha = criar_trilha("logica", nome="Lógica")
        cls.primeira = criar_aula(cls.trilha, "variaveis", ordem=1)
        cls.segunda = criar_aula(
            cls.trilha, "condicionais", ordem=2, pre_requisito=cls.primeira
        )
        criar_aula(cls.trilha, "rascunho", ordem=3, status=RASCUNHO)

        criar_exercicio(cls.primeira, "media", ordem=1)
        criar_exercicio(cls.primeira, "trocar", ordem=2)
        criar_exercicio(cls.primeira, "oculto", ordem=3, status=RASCUNHO)

        criar_trilha("nao-publicada", ordem=9, status=RASCUNHO)

    def setUp(self):
        self.url = reverse("trilhas:trilha-detalhe", args=["logica"])

    def test_visitante_anonimo_consegue_ler(self):
        self.assertEqual(self.client.get(self.url).status_code, 200)

    def test_traz_apenas_aulas_publicadas_na_ordem(self):
        dados = self.client.get(self.url).json()
        self.assertEqual(
            [a["slug"] for a in dados["aulas"]], ["variaveis", "condicionais"]
        )

    def test_traz_apenas_exercicios_publicados_na_ordem(self):
        dados = self.client.get(self.url).json()
        variaveis = dados["aulas"][0]
        self.assertEqual(
            [e["slug"] for e in variaveis["exercicios"]], ["media", "trocar"]
        )

    def test_pre_requisito_vem_como_slug(self):
        dados = self.client.get(self.url).json()
        self.assertIsNone(dados["aulas"][0]["pre_requisito"])
        self.assertEqual(dados["aulas"][1]["pre_requisito"], "variaveis")

    def test_trilha_em_rascunho_devolve_404(self):
        url = reverse("trilhas:trilha-detalhe", args=["nao-publicada"])
        self.assertEqual(self.client.get(url).status_code, 404)

    def test_slug_inexistente_devolve_404(self):
        url = reverse("trilhas:trilha-detalhe", args=["nao-existe"])
        self.assertEqual(self.client.get(url).status_code, 404)

    def test_solucao_nao_aparece_no_payload(self):
        self.assertNotIn("solucao_autor", self.client.get(self.url).content.decode())
        self.assertNotIn("SEGREDO", self.client.get(self.url).content.decode())

    def test_numero_de_queries_nao_cresce_com_o_conteudo(self):
        with self.assertNumQueries(3):
            self.client.get(self.url)


class DetalheDoExercicioTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.trilha = criar_trilha("logica", nome="Lógica")
        cls.aula = criar_aula(cls.trilha, "variaveis")
        cls.exercicio = criar_exercicio(cls.aula, "media")

        criar_exercicio(cls.aula, "rascunho-ex", status=RASCUNHO)

        aula_oculta = criar_aula(cls.trilha, "aula-oculta", ordem=9, status=RASCUNHO)
        criar_exercicio(aula_oculta, "dentro-de-aula-oculta")

        trilha_oculta = criar_trilha("oculta", ordem=9, status=RASCUNHO)
        aula_de_oculta = criar_aula(trilha_oculta, "qualquer")
        criar_exercicio(aula_de_oculta, "dentro-de-trilha-oculta")

    def _url(self, trilha_slug: str, exercicio_slug: str) -> str:
        return reverse("trilhas:exercicio-detalhe", args=[trilha_slug, exercicio_slug])

    def test_visitante_anonimo_consegue_ler(self):
        resposta = self.client.get(self._url("logica", "media"))
        self.assertEqual(resposta.status_code, 200)

    def test_traz_o_enunciado_e_o_contexto(self):
        dados = self.client.get(self._url("logica", "media")).json()
        self.assertEqual(dados["slug"], "media")
        self.assertIn("Enunciado", dados["enunciado"])
        self.assertEqual(dados["trilha_slug"], "logica")
        self.assertEqual(dados["aula_slug"], "variaveis")

    def test_solucao_nao_aparece_no_payload(self):
        conteudo = self.client.get(self._url("logica", "media")).content.decode()
        self.assertNotIn("solucao_autor", conteudo)
        self.assertNotIn("SEGREDO", conteudo)

    def test_exercicio_em_rascunho_devolve_404(self):
        self.assertEqual(
            self.client.get(self._url("logica", "rascunho-ex")).status_code, 404
        )

    def test_exercicio_de_aula_em_rascunho_devolve_404(self):
        resposta = self.client.get(self._url("logica", "dentro-de-aula-oculta"))
        self.assertEqual(resposta.status_code, 404)

    def test_exercicio_de_trilha_em_rascunho_devolve_404(self):
        resposta = self.client.get(self._url("oculta", "dentro-de-trilha-oculta"))
        self.assertEqual(resposta.status_code, 404)

    def test_trilha_errada_devolve_404(self):
        criar_trilha("outra", ordem=2)
        self.assertEqual(self.client.get(self._url("outra", "media")).status_code, 404)

    def test_slug_inexistente_devolve_404(self):
        self.assertEqual(
            self.client.get(self._url("logica", "nao-existe")).status_code, 404
        )

    def test_a_rota_nao_pode_ficar_ambigua(self):
        segunda_aula = criar_aula(self.trilha, "condicionais", ordem=2)
        with transaction.atomic(), self.assertRaises(IntegrityError):
            criar_exercicio(segunda_aula, "media", ordem=1)

    def test_o_mesmo_slug_em_outra_trilha_e_outro_exercicio(self):
        outra = criar_trilha("python", ordem=2)
        criar_exercicio(criar_aula(outra, "intro"), "media")
        self.assertEqual(
            self.client.get(self._url("python", "media")).json()["trilha_slug"],
            "python",
        )

    def test_escrita_esta_bloqueada(self):
        resposta = self.client.post(
            self._url("logica", "media"),
            data=json.dumps({}),
            content_type="application/json",
        )
        self.assertEqual(resposta.status_code, 405)


class StatusIntermediarioTest(TestCase):
    """Status aprovado ainda não expõe o conteúdo na API."""

    def test_trilha_aprovada_nao_aparece_na_listagem(self):
        criar_trilha("aprovada", status=StatusEditorial.APROVADO)
        criar_trilha("publicada", ordem=2, status=PUBLICADO)
        dados = self.client.get(reverse("trilhas:trilha-lista")).json()
        self.assertEqual([t["slug"] for t in dados], ["publicada"])

    def test_trilha_em_revisao_devolve_404_no_detalhe(self):
        criar_trilha("em-revisao", status=StatusEditorial.REVISAO)
        url = reverse("trilhas:trilha-detalhe", args=["em-revisao"])
        self.assertEqual(self.client.get(url).status_code, 404)
