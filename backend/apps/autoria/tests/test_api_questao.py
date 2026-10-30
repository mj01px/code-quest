"""Questão de múltipla escolha e publicação pelo próprio autor.

A questão segue a regra do flashcard (aula própria, em rascunho) e aparece no
detalhe editorial e no catálogo público. Publicar o que foi aprovado é do
autor, e só do que ele criou.
"""

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.contas.tests.helpers import criar_autor
from apps.trilhas.models import Questao, StatusEditorial
from apps.trilhas.tests.helpers import criar_aula, criar_trilha

pytestmark = pytest.mark.django_db

RASCUNHO = StatusEditorial.RASCUNHO
APROVADO = StatusEditorial.APROVADO

OPCOES = ["print", "echo", "say", "puts"]


def cliente(usuario):
    c = APIClient()
    c.force_authenticate(user=usuario)
    return c


def criar(usuario, aula, **extra):
    corpo = {"aula": aula.pk, "enunciado": "Como imprimir?", "opcoes": OPCOES}
    corpo["resposta_correta"] = "A"
    corpo.update(extra)
    return cliente(usuario).post(reverse("autoria:criar-questao"), corpo, format="json")


@pytest.fixture
def autor():
    return criar_autor()


@pytest.fixture
def aula(autor):
    trilha = criar_trilha("nova", status=RASCUNHO, autor=autor)
    return criar_aula(trilha, "intro", status=RASCUNHO, autor=autor)


def test_autor_cria_questao_na_propria_aula(autor, aula):
    resposta = criar(autor, aula)

    assert resposta.status_code == 201
    questao = Questao.objects.get()
    assert questao.opcoes == OPCOES
    assert questao.resposta_correta == "A"


@pytest.mark.parametrize(
    "extra",
    [
        {"opcoes": ["a", "b", "c"]},
        {"opcoes": ["a", "b", "c", " "]},
        {"opcoes": "a,b,c,d"},
        {"resposta_correta": "E"},
    ],
)
def test_questao_invalida_recebe_400(autor, aula, extra):
    assert criar(autor, aula, **extra).status_code == 400
    assert not Questao.objects.exists()


def test_questao_em_aula_alheia_recebe_403(aula):
    assert criar(criar_autor("outro"), aula).status_code == 403


def test_detalhe_da_trilha_traz_status_e_questoes(autor, aula):
    criar(autor, aula)

    resposta = cliente(autor).get(
        reverse("autoria:detalhe", kwargs={"tipo": "trilhas", "pk": aula.trilha_id})
    )

    assert resposta.status_code == 200
    assert resposta.data["status_editorial"] == RASCUNHO
    assert resposta.data["aulas"][0]["questoes"][0]["opcoes"] == OPCOES


def test_catalogo_publico_mostra_questoes():
    trilha = criar_trilha("publica")
    aula = criar_aula(trilha)
    Questao.objects.create(aula=aula, enunciado="?", opcoes=OPCOES, resposta_correta="B")

    resposta = APIClient().get(
        reverse("trilhas:trilha-detalhe", kwargs={"slug": "publica"})
    )

    assert resposta.data["aulas"][0]["questoes"][0]["resposta_correta"] == "B"


def url_publicar(trilha):
    return reverse("autoria:publicar", kwargs={"tipo": "trilhas", "pk": trilha.pk})


def test_autor_publica_a_propria_trilha_aprovada(autor):
    trilha = criar_trilha("minha", status=APROVADO, autor=autor)

    resposta = cliente(autor).post(url_publicar(trilha))

    assert resposta.status_code == 200
    trilha.refresh_from_db()
    assert trilha.status == StatusEditorial.PUBLICADO


def test_aprovados_lista_so_o_do_autor(autor):
    criar_trilha("minha", nome="Minha", status=APROVADO, autor=autor)
    criar_trilha("alheia", status=APROVADO, autor=criar_autor("outro"))
    criar_trilha("rascunho", status=RASCUNHO, autor=autor)

    resposta = cliente(autor).get(reverse("autoria:aprovados"))

    assert [i["titulo"] for i in resposta.data] == ["Minha"]


def test_autor_nao_publica_trilha_alheia(autor):
    trilha = criar_trilha("alheia", status=APROVADO, autor=criar_autor("outro"))

    assert cliente(autor).post(url_publicar(trilha)).status_code == 403
    trilha.refresh_from_db()
    assert trilha.status == APROVADO


# --- Edição e exclusão da questão ---


def url_questao(questao):
    return reverse("autoria:questao", kwargs={"pk": questao.pk})


@pytest.fixture
def questao(aula):
    return Questao.objects.create(
        aula=aula, enunciado="Como imprimir?", opcoes=OPCOES, resposta_correta="A"
    )


EDICAO = {
    "enunciado": "Qual imprime?",
    "opcoes": ["a", "b", "c", "d"],
    "resposta_correta": "C",
}


def test_autor_edita_questao_da_propria_aula(autor, questao):
    resposta = cliente(autor).put(url_questao(questao), EDICAO, format="json")

    assert resposta.status_code == 200
    questao.refresh_from_db()
    assert questao.enunciado == "Qual imprime?"
    assert questao.opcoes == ["a", "b", "c", "d"]
    assert questao.resposta_correta == "C"


def test_edicao_invalida_recebe_400(autor, questao):
    corpo = {**EDICAO, "resposta_correta": "E"}

    resposta = cliente(autor).put(url_questao(questao), corpo, format="json")

    assert resposta.status_code == 400
    questao.refresh_from_db()
    assert questao.resposta_correta == "A"


def test_autor_exclui_questao_da_propria_aula(autor, questao):
    assert cliente(autor).delete(url_questao(questao)).status_code == 204
    assert not Questao.objects.exists()


@pytest.mark.parametrize("metodo", ["put", "delete"])
def test_questao_alheia_recebe_403(questao, metodo):
    outro = cliente(criar_autor("outro"))

    resposta = getattr(outro, metodo)(url_questao(questao), EDICAO, format="json")

    assert resposta.status_code == 403
    questao.refresh_from_db()
    assert questao.enunciado == "Como imprimir?"


@pytest.mark.parametrize("metodo", ["put", "delete"])
def test_questao_fora_de_rascunho_recebe_400(autor, aula, questao, metodo):
    aula.status = StatusEditorial.REVISAO
    aula.save(update_fields=["status"])

    resposta = getattr(cliente(autor), metodo)(
        url_questao(questao), EDICAO, format="json"
    )

    assert resposta.status_code == 400
    questao.refresh_from_db()
    assert questao.enunciado == "Como imprimir?"


def test_questao_inexistente_recebe_404(autor):
    url = reverse("autoria:questao", kwargs={"pk": 999})

    assert cliente(autor).delete(url).status_code == 404
