"""A lista de exercícios concluídos do próprio aluno.

Ela existe para o front parar de guardar progresso em `localStorage`: a marca
de "feito" passa a vir do banco. Por isso o que se testa aqui é o contrato —
quem enxerga o quê, o recorte por trilha, e o que a rota **não** devolve.
"""

from django.core.cache import cache
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from rest_framework.test import APIClient

from apps.gamificacao.services import select_starter_creature
from apps.progressao.models import EventoXP, Origem
from apps.progressao.services import creditar_exercicio
from apps.trilhas.models import Aula, Dificuldade, Exercicio, StatusEditorial, Trilha
from apps.contas.tests.helpers import criar_aluno

SOLUCAO = "resposta-secreta-do-autor"


def criar_exercicio_em(trilha_slug, slug, dificuldade=Dificuldade.INICIANTE):
    """Como o helper de `test_credito_xp`, mas com a trilha aberta.

    O filtro por trilha só é testável de verdade com duas trilhas, e o helper
    de lá é fixo em `python`.
    """
    trilha = Trilha.objects.get_or_create(
        slug=trilha_slug,
        defaults={
            "nome": trilha_slug.title(),
            "descricao": "x",
            "status": StatusEditorial.PUBLICADO,
        },
    )[0]
    aula = Aula.objects.get_or_create(
        trilha=trilha,
        slug="aula-1",
        defaults={
            "titulo": "Aula 1",
            "conteudo": "x",
            "status": StatusEditorial.PUBLICADO,
        },
    )[0]
    return Exercicio.objects.create(
        aula=aula,
        titulo="Exercício",
        slug=slug,
        enunciado="x",
        dificuldade=dificuldade,
        status=StatusEditorial.PUBLICADO,
        solucao_autor=SOLUCAO,
    )


class ApiExerciciosConcluidosTest(TestCase):
    def setUp(self):
        # Mesmo motivo do `ApiProgressoTest`: o contador de escopo vive no
        # LocMemCache e sobrevive ao rollback do TestCase.
        cache.clear()
        self.addCleanup(cache.clear)
        self.user = criar_aluno()
        select_starter_creature(user=self.user, creature_slug="shellby")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.url = reverse("progressao:meus-exercicios-concluidos")

    def _concluir(self, exercicio):
        return creditar_exercicio(user=self.user, exercicio=exercicio)

    def test_lista_traz_o_que_o_aluno_concluiu(self):
        self._concluir(criar_exercicio_em("python", "ex-1"))
        self._concluir(criar_exercicio_em("python", "ex-2"))

        resposta = self.client.get(self.url)

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(len(resposta.data), 2)
        self.assertEqual(
            {(item["trilha_slug"], item["exercicio_slug"]) for item in resposta.data},
            {("python", "ex-1"), ("python", "ex-2")},
        )

    def test_aluno_sem_xp_recebe_200_e_lista_vazia(self):
        resposta = self.client.get(self.url)

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(list(resposta.data), [])

    def test_filtro_por_trilha_recorta_a_lista(self):
        self._concluir(criar_exercicio_em("python", "ex-1"))
        self._concluir(criar_exercicio_em("javascript", "ex-2"))

        resposta = self.client.get(self.url, {"trilha": "javascript"})

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(len(resposta.data), 1)
        self.assertEqual(resposta.data[0]["trilha_slug"], "javascript")
        self.assertEqual(resposta.data[0]["exercicio_slug"], "ex-2")

    def test_filtro_por_trilha_inexistente_devolve_200_e_lista_vazia(self):
        # 200 e não 404: a trilha não é o recurso desta rota, é um recorte dele.
        self._concluir(criar_exercicio_em("python", "ex-1"))

        resposta = self.client.get(self.url, {"trilha": "nao-existe"})

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(list(resposta.data), [])

    def test_anonimo_recebe_401(self):
        self._concluir(criar_exercicio_em("python", "ex-1"))

        resposta = APIClient().get(self.url)

        self.assertEqual(resposta.status_code, 401)

    def test_conclusao_de_outro_aluno_nao_aparece(self):
        outro = criar_aluno(nickname="outro")
        select_starter_creature(user=outro, creature_slug="slyth")
        creditar_exercicio(user=outro, exercicio=criar_exercicio_em("python", "ex-1"))

        resposta = self.client.get(self.url)

        self.assertEqual(list(resposta.data), [])

    def test_payload_tem_exatamente_os_quatro_campos(self):
        self._concluir(criar_exercicio_em("python", "ex-1"))

        resposta = self.client.get(self.url)

        self.assertEqual(
            set(resposta.data[0]),
            {"trilha_slug", "exercicio_slug", "xp", "criado_em"},
        )

    def test_lista_nao_vaza_a_solucao_do_autor(self):
        # `solucao_autor` fora de serializer público é regra do projeto, e este
        # serializer é o primeiro a alcançar `Exercicio` por travessia de FK.
        self._concluir(criar_exercicio_em("python", "ex-1"))

        resposta = self.client.get(self.url)

        self.assertNotIn(SOLUCAO, resposta.content.decode())
        self.assertNotIn("solucao_autor", resposta.data[0])

    def test_ajuste_de_progressao_nao_conta_como_conclusao(self):
        # A UniqueConstraint de EventoXP só vale para `origem=EXERCICIO`, então
        # um AJUSTE pode apontar para o mesmo exercício. Sem o filtro de origem
        # a lista teria linha repetida — e ajuste não é conclusão.
        exercicio = criar_exercicio_em("python", "ex-1")
        self._concluir(exercicio)
        EventoXP.objects.create(
            user=self.user, exercicio=exercicio, origem=Origem.AJUSTE, xp=10
        )

        resposta = self.client.get(self.url)

        self.assertEqual(len(resposta.data), 1)
        self.assertEqual(resposta.data[0]["xp"], 50)

    def test_exercicio_apagado_nao_quebra_a_lista(self):
        # `EventoXP.exercicio` é SET_NULL: o evento sobrevive ao exercício e
        # ficaria sem slug para devolver.
        exercicio = criar_exercicio_em("python", "ex-1")
        self._concluir(exercicio)
        self._concluir(criar_exercicio_em("python", "ex-2"))
        exercicio.delete()

        resposta = self.client.get(self.url)

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(len(resposta.data), 1)
        self.assertEqual(resposta.data[0]["exercicio_slug"], "ex-2")

    def test_lista_nao_faz_uma_consulta_por_linha(self):
        # O payload atravessa evento -> exercicio -> trilha. Sem select_related
        # cada linha custa duas consultas, e o painel pede a lista inteira.
        # Comparar dois tamanhos pega a regressão sem fixar um número mágico.
        self._concluir(criar_exercicio_em("python", "ex-1"))
        with CaptureQueriesContext(connection) as uma:
            self.client.get(self.url)

        for i in range(2, 6):
            self._concluir(criar_exercicio_em("python", f"ex-{i}"))
        with CaptureQueriesContext(connection) as cinco:
            self.client.get(self.url)

        self.assertEqual(len(cinco.captured_queries), len(uma.captured_queries))


class ProgressoContinuaIntactoTest(TestCase):
    """A rota nova não pode ter mexido na antiga."""

    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)
        self.user = criar_aluno()
        select_starter_creature(user=self.user, creature_slug="shellby")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_progresso_mantem_o_shape_que_o_front_tipou(self):
        creditar_exercicio(
            user=self.user, exercicio=criar_exercicio_em("python", "ex-1")
        )

        resposta = self.client.get(reverse("progressao:meu-progresso"))

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(
            set(resposta.data),
            {
                "criatura",
                "xp_total",
                "nivel",
                "proximo_nivel",
                "xp_no_nivel",
                "xp_para_o_proximo",
                "atualizado_em",
            },
        )
        self.assertEqual(resposta.data["xp_total"], 50)
        self.assertEqual(resposta.data["xp_no_nivel"], 50)
        self.assertEqual(resposta.data["xp_para_o_proximo"], 100)
