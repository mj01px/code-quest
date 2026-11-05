import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.conquistas.tests.helpers import submeter
from apps.contas.tests.helpers import criar_aluno
from apps.correcao.models import Modo, Veredito
from apps.gamificacao.services import select_starter_creature
from apps.progressao.models import EtapaConcluida, EventoXP, Origem, TipoDeEtapa
from apps.progressao.services import concluir_quiz
from apps.trilhas.models import Exercicio, Questao, StatusEditorial, Tipo, Trilha
from apps.trilhas.tests.helpers import criar_aula, criar_trilha

pytestmark = pytest.mark.django_db


@pytest.fixture
def cenario():
    user = criar_aluno()
    select_starter_creature(user=user, creature_slug="shellby")
    cliente = APIClient()
    cliente.force_authenticate(user=user)
    trilha = criar_trilha("logica")
    aula = criar_aula(trilha, "variaveis", ordem=1)
    exercicios = [
        Exercicio.objects.create(
            aula=aula,
            titulo=f"Exercício {n}",
            slug=f"ex-{n}",
            enunciado="x",
            tipo=Tipo.TEORICO,
            ordem=n,
            status=StatusEditorial.PUBLICADO,
        )
        for n in (1, 2)
    ]
    return {"user": user, "cliente": cliente, "aula": aula, "exercicios": exercicios}


def resumo(cliente, slug="logica"):
    return cliente.get(reverse("progressao:conclusao-da-trilha", args=[slug]))


def concluir_tudo(cenario):
    EtapaConcluida.objects.create(
        user=cenario["user"], aula=cenario["aula"], tipo=TipoDeEtapa.LEITURA
    )
    for exercicio in cenario["exercicios"]:
        EventoXP.objects.create(
            user=cenario["user"], exercicio=exercicio, origem=Origem.EXERCICIO, xp=50
        )


def test_trilha_pela_metade_nao_esta_concluida(cenario):
    EventoXP.objects.create(
        user=cenario["user"],
        exercicio=cenario["exercicios"][0],
        origem=Origem.EXERCICIO,
        xp=50,
    )

    dados = resumo(cenario["cliente"]).data

    assert dados["concluida"] is False
    assert dados["fases_feitas"] == 1
    assert dados["fases_total"] == 3


def test_trilha_completa_traz_fases_xp_e_dias(cenario):
    concluir_tudo(cenario)

    dados = resumo(cenario["cliente"]).data

    assert dados["concluida"] is True
    assert (dados["fases_feitas"], dados["fases_total"]) == (3, 3)
    assert dados["xp"] == 100
    assert dados["dias_de_estudo"] == 1
    assert dados["trilha"] == {"slug": "logica", "nome": "Logica"}


def test_codigo_conta_so_o_primeiro_enviar_de_cada_exercicio(cenario):
    ex1, ex2 = cenario["exercicios"]
    submeter(cenario["user"], ex1, Veredito.RESPOSTA_ERRADA, hash="1")
    submeter(cenario["user"], ex1, Veredito.APROVADO, hash="2")
    submeter(
        cenario["user"], ex2, Veredito.RESPOSTA_ERRADA, hash="3", modo=Modo.EXECUTAR
    )
    submeter(cenario["user"], ex2, Veredito.APROVADO, hash="4")

    dados = resumo(cenario["cliente"]).data

    assert dados["acerto_de_primeira"] == 50


def test_quiz_conta_a_primeira_tentativa_mesmo_depois_de_refazer(cenario):
    questoes = [
        Questao.objects.create(
            aula=cenario["aula"],
            enunciado=f"Pergunta {n}",
            opcoes=["a", "b", "c", "d"],
            resposta_correta="A",
        )
        for n in range(4)
    ]
    errou_duas = {q.pk: ("A" if i < 2 else "B") for i, q in enumerate(questoes)}
    acertou_tudo = {q.pk: "A" for q in questoes}
    concluir_quiz(user=cenario["user"], aula=cenario["aula"], respostas=errou_duas)
    concluir_quiz(user=cenario["user"], aula=cenario["aula"], respostas=acertou_tudo)

    etapa = EtapaConcluida.objects.get(user=cenario["user"], tipo=TipoDeEtapa.QUIZ)
    assert (etapa.acertos, etapa.acertos_na_primeira) == (4, 2)
    assert resumo(cenario["cliente"]).data["acerto_de_primeira"] == 50


def test_junta_codigo_e_quiz(cenario):
    questao = Questao.objects.create(
        aula=cenario["aula"],
        enunciado="?",
        opcoes=["a", "b", "c", "d"],
        resposta_correta="A",
    )
    concluir_quiz(
        user=cenario["user"], aula=cenario["aula"], respostas={questao.pk: "B"}
    )
    submeter(cenario["user"], cenario["exercicios"][0], Veredito.APROVADO, hash="1")

    assert resumo(cenario["cliente"]).data["acerto_de_primeira"] == 50


def test_sem_envio_nem_quiz_vem_nulo(cenario):
    assert resumo(cenario["cliente"]).data["acerto_de_primeira"] is None


def test_sugere_a_proxima_trilha_nao_concluida(cenario):
    proxima = criar_trilha("python")
    proxima_aula = criar_aula(proxima, "texto", ordem=1)
    Exercicio.objects.create(
        aula=proxima_aula,
        titulo="Texto",
        slug="texto",
        enunciado="x",
        tipo=Tipo.TEORICO,
        status=StatusEditorial.PUBLICADO,
    )
    concluir_tudo(cenario)

    dados = resumo(cenario["cliente"]).data

    assert dados["proxima"]["slug"] == "python"


def test_trilha_de_desafios_nao_tem_tela_de_conclusao(cenario):
    Trilha.objects.filter(slug="logica").update(desafio=True)

    assert resumo(cenario["cliente"]).status_code == 404


def test_exige_login():
    criar_trilha("logica")

    assert resumo(APIClient()).status_code == 401
