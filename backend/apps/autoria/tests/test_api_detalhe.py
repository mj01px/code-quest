"""Contrato do detalhe editorial: ler o conteúdo antes de agir sobre ele.

A rota devolve trilha, aula ou exercício em qualquer status (o catálogo
público só devolve publicado), aceita quem envia para revisão ou quem revisa,
e nunca entrega `solucao_autor`, nem aninhada.
"""

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.contas.tests.helpers import criar_admin, criar_aluno, criar_autor
from apps.correcao.tests.helpers import criar_especificacao
from apps.trilhas.models import StatusEditorial
from apps.trilhas.tests.helpers import criar_aula, criar_exercicio, criar_trilha

pytestmark = pytest.mark.django_db

RASCUNHO = StatusEditorial.RASCUNHO
REVISAO = StatusEditorial.REVISAO

# `criar_exercicio` grava a solução com esta marca.
SEGREDO = "SEGREDO"


def url(tipo, pk):
    return reverse("autoria:detalhe", kwargs={"tipo": tipo, "pk": pk})


def cliente(usuario=None):
    c = APIClient()
    if usuario is not None:
        c.force_authenticate(user=usuario)
    return c


@pytest.fixture
def conteudos():
    """Trilha em rascunho com aula em revisão e exercício de código em rascunho."""
    trilha = criar_trilha("nova", nome="Trilha nova", status=RASCUNHO)
    aula = criar_aula(trilha, "laco", titulo="Laços", status=REVISAO)
    exercicio = criar_exercicio(aula, "dobro", titulo="Dobro", status=RASCUNHO)
    criar_especificacao(exercicio)
    return {"trilhas": trilha, "aulas": aula, "exercicios": exercicio}


def test_trilha_em_rascunho_vem_com_as_aulas_e_sem_solucao(conteudos):
    resposta = cliente(criar_autor()).get(url("trilhas", conteudos["trilhas"].pk))

    assert resposta.status_code == 200
    assert resposta.data["nome"] == "Trilha nova"
    assert [a["titulo"] for a in resposta.data["aulas"]] == ["Laços"]
    assert resposta.data["aulas"][0]["exercicios"][0]["titulo"] == "Dobro"
    assert SEGREDO not in resposta.content.decode()


def test_aula_em_revisao_vem_com_o_conteudo(conteudos):
    resposta = cliente(criar_admin()).get(url("aulas", conteudos["aulas"].pk))

    assert resposta.status_code == 200
    assert resposta.data["titulo"] == "Laços"
    assert resposta.data["conteudo"] == "Conteúdo da aula laco."


def test_exercicio_vem_com_enunciado_e_codigo_inicial_sem_solucao(conteudos):
    resposta = cliente(criar_autor()).get(url("exercicios", conteudos["exercicios"].pk))

    assert resposta.status_code == 200
    assert resposta.data["enunciado"] == "Enunciado do exercício dobro."
    assert resposta.data["codigo_inicial"] == "def dobro(n):\n    ...\n"
    assert "solucao_autor" not in resposta.data
    assert SEGREDO not in resposta.content.decode()


def test_exercicio_sem_especificacao_tem_codigo_inicial_nulo():
    aula = criar_aula(criar_trilha("teoria"), "conceitos")
    exercicio = criar_exercicio(aula, "pergunta", status=RASCUNHO)

    resposta = cliente(criar_autor()).get(url("exercicios", exercicio.pk))

    assert resposta.status_code == 200
    assert resposta.data["codigo_inicial"] is None


def test_conteudo_inexistente_devolve_404():
    resposta = cliente(criar_autor()).get(url("aulas", 999_999))

    assert resposta.status_code == 404


def test_aluno_recebe_403(conteudos):
    resposta = cliente(criar_aluno()).get(url("trilhas", conteudos["trilhas"].pk))

    assert resposta.status_code == 403


def test_anonimo_recebe_401(conteudos):
    resposta = cliente().get(url("trilhas", conteudos["trilhas"].pk))

    assert resposta.status_code == 401
