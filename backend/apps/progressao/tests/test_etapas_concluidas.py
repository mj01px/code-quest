"""Leitura e quiz da aula contam na progressão da trilha, junto com exercício.

O quiz é corrigido no servidor: a tela manda as letras e quem decide quantas
acertou é o backend, que guarda o melhor resultado.
"""

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.contas.tests.helpers import criar_aluno
from apps.progressao.models import EtapaConcluida, TipoDeEtapa
from apps.progressao.services import trilhas_iniciadas
from apps.trilhas.models import Questao, StatusEditorial
from apps.trilhas.tests.helpers import criar_aula, criar_trilha


def rota(nome, trilha, aula):
    return reverse(f"progressao:{nome}", args=[trilha, aula])


class EtapasConcluidasTest(TestCase):
    def setUp(self):
        self.user = criar_aluno()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.trilha = criar_trilha("logica")
        self.aula = criar_aula(self.trilha, "variaveis")
        self.q1 = Questao.objects.create(
            aula=self.aula,
            enunciado="1?",
            opcoes=["a", "b", "c", "d"],
            resposta_correta="C",
        )
        self.q2 = Questao.objects.create(
            aula=self.aula,
            enunciado="2?",
            opcoes=["a", "b", "c", "d"],
            resposta_correta="A",
        )

    def quiz(self, respostas):
        return self.client.post(
            rota("concluir-quiz", "logica", "variaveis"),
            {"respostas": respostas},
            format="json",
        )

    def test_leitura_e_idempotente(self):
        url = rota("concluir-leitura", "logica", "variaveis")

        primeira = self.client.post(url)
        segunda = self.client.post(url)

        self.assertEqual(primeira.status_code, status.HTTP_201_CREATED)
        self.assertEqual(segunda.status_code, status.HTTP_200_OK)
        self.assertEqual(
            EtapaConcluida.objects.filter(
                user=self.user, tipo=TipoDeEtapa.LEITURA
            ).count(),
            1,
        )

    def test_leitura_de_aula_sem_texto_e_recusada(self):
        vazia = criar_aula(self.trilha, "vazia", conteudo="")

        resposta = self.client.post(rota("concluir-leitura", "logica", vazia.slug))

        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)

    def test_aula_em_rascunho_nao_existe_para_a_rota(self):
        criar_aula(self.trilha, "oculta", status=StatusEditorial.RASCUNHO)

        resposta = self.client.post(rota("concluir-leitura", "logica", "oculta"))

        self.assertEqual(resposta.status_code, status.HTTP_404_NOT_FOUND)

    def test_quiz_e_corrigido_no_servidor(self):
        resposta = self.quiz({str(self.q1.pk): "C", str(self.q2.pk): "B"})

        self.assertEqual(resposta.status_code, status.HTTP_201_CREATED)
        self.assertEqual((resposta.data["acertos"], resposta.data["total"]), (1, 2))

    def test_quiz_incompleto_nao_conta(self):
        resposta = self.quiz({str(self.q1.pk): "C"})

        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(EtapaConcluida.objects.exists())

    def test_quiz_guarda_o_melhor_resultado(self):
        self.quiz({str(self.q1.pk): "C", str(self.q2.pk): "A"})
        pior = self.quiz({str(self.q1.pk): "D", str(self.q2.pk): "D"})

        self.assertEqual(pior.status_code, status.HTTP_200_OK)
        self.assertEqual(pior.data["acertos"], 0)
        etapa = EtapaConcluida.objects.get(tipo=TipoDeEtapa.QUIZ)
        self.assertEqual((etapa.acertos, etapa.total), (2, 2))

    def test_letra_invalida_e_recusada(self):
        resposta = self.quiz({str(self.q1.pk): "E", str(self.q2.pk): "A"})

        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)

    def test_lista_so_as_etapas_do_aluno(self):
        self.client.post(rota("concluir-leitura", "logica", "variaveis"))
        outro = criar_aluno("outro")
        EtapaConcluida.objects.create(
            user=outro, aula=self.aula, tipo=TipoDeEtapa.LEITURA
        )

        resposta = self.client.get(reverse("progressao:minhas-etapas-concluidas"))

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [(e["trilha_slug"], e["aula_slug"], e["tipo"]) for e in resposta.data],
            [("logica", "variaveis", "LEITURA")],
        )

    def test_etapa_conta_como_trilha_iniciada(self):
        self.client.post(rota("concluir-leitura", "logica", "variaveis"))

        self.assertEqual(trilhas_iniciadas(user=self.user), ["logica"])

    def test_exige_login(self):
        anonimo = APIClient()

        resposta = anonimo.post(rota("concluir-leitura", "logica", "variaveis"))

        self.assertEqual(resposta.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_catalogo_conta_leituras_e_quizzes(self):
        criar_aula(self.trilha, "sem-quiz", ordem=2)

        resposta = APIClient().get(reverse("trilhas:trilha-lista"))

        logica = next(t for t in resposta.data if t["slug"] == "logica")
        self.assertEqual(logica["total_etapas"], 3)
