"""Criação de trilha, aula e exercício pela tela de autoria.

Só quem tem `trilhas.create`; o conteúdo nasce em rascunho, com o autor da
request, e cada criação vai para a auditoria. Filho só entra em pai do próprio
autor, salvo admin.
"""

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.auditoria.models import AcaoAuditoria, RegistroDeAuditoria
from apps.contas.tests.helpers import criar_admin, criar_aluno, criar_autor
from apps.correcao.models import EspecificacaoDeCodigo
from apps.trilhas.models import Aula, Exercicio, StatusEditorial, Tipo, Trilha
from apps.trilhas.tests.helpers import criar_aula, criar_trilha

pytestmark = pytest.mark.django_db


def post(usuario, rota, dados):
    c = APIClient()
    if usuario is not None:
        c.force_authenticate(user=usuario)
    return c.post(reverse(f"autoria:{rota}"), dados, format="json")


TRILHA = {"nome": "TypeScript do zero", "descricao": "Tipos na prática", "dificuldade": "INTERMEDIARIO"}


def test_autor_cria_trilha_em_rascunho_com_autoria_e_auditoria():
    autor = criar_autor()

    resposta = post(autor, "criar-trilha", TRILHA)

    assert resposta.status_code == 201
    assert resposta.data["slug"] == "typescript-do-zero"
    trilha = Trilha.objects.get(pk=resposta.data["id"])
    assert trilha.autor == autor
    assert trilha.status == StatusEditorial.RASCUNHO
    assert trilha.dificuldade == "INTERMEDIARIO"
    registro = RegistroDeAuditoria.objects.get(acao=AcaoAuditoria.CONTEUDO_CRIADO)
    assert registro.alvo_id == str(trilha.pk)


def test_slug_repetido_ganha_sufixo():
    criar_trilha("typescript-do-zero")

    resposta = post(criar_autor(), "criar-trilha", TRILHA)

    assert resposta.data["slug"] == "typescript-do-zero-2"


@pytest.mark.parametrize("rota", ["criar-trilha", "criar-aula", "criar-exercicio"])
def test_aluno_recebe_403_e_anonimo_401(rota):
    assert post(criar_aluno(), rota, {}).status_code == 403
    assert post(None, rota, {}).status_code == 401


def test_corpo_nao_escolhe_status_nem_autor():
    autor = criar_autor()
    outro = criar_autor("outro")

    resposta = post(
        autor,
        "criar-trilha",
        {**TRILHA, "status": StatusEditorial.PUBLICADO, "autor": str(outro.pk)},
    )

    trilha = Trilha.objects.get(pk=resposta.data["id"])
    assert trilha.status == StatusEditorial.RASCUNHO
    assert trilha.autor == autor


def test_autor_cria_aula_na_propria_trilha():
    autor = criar_autor()
    trilha = criar_trilha("minha", autor=autor, status=StatusEditorial.RASCUNHO)
    criar_aula(trilha, "primeira")

    resposta = post(
        autor,
        "criar-aula",
        {"trilha": trilha.pk, "titulo": "Variáveis", "conteudo": "# Olá"},
    )

    assert resposta.status_code == 201
    aula = Aula.objects.get(pk=resposta.data["id"])
    assert (aula.slug, aula.ordem, aula.autor) == ("variaveis", 2, autor)
    assert aula.status == StatusEditorial.RASCUNHO


def test_autor_nao_mexe_na_trilha_de_outro():
    trilha = criar_trilha("alheia", autor=criar_autor("dono"))

    resposta = post(
        criar_autor(), "criar-aula", {"trilha": trilha.pk, "titulo": "X", "conteudo": "y"}
    )

    assert resposta.status_code == 403
    assert not Aula.objects.exists()


def test_admin_adiciona_aula_em_qualquer_trilha():
    trilha = criar_trilha("semeada")

    resposta = post(
        criar_admin(), "criar-aula", {"trilha": trilha.pk, "titulo": "X", "conteudo": "y"}
    )

    assert resposta.status_code == 201


@pytest.fixture
def aula_do_autor():
    autor = criar_autor()
    trilha = criar_trilha("minha", autor=autor)
    return autor, criar_aula(trilha, "base", autor=autor)


def test_exercicio_com_funcao_vira_codigo_com_casos(aula_do_autor):
    autor, aula = aula_do_autor

    resposta = post(
        autor,
        "criar-exercicio",
        {
            "aula": aula.pk,
            "titulo": "Soma",
            "enunciado": "Some dois números.",
            "funcao": "soma",
            "testes": [
                {"argumentos": [1, 2], "esperado": 3},
                {"argumentos": [0, 0], "esperado": 0, "visivel": False},
            ],
        },
    )

    assert resposta.status_code == 201
    assert resposta.data["tipo"] == Tipo.CODIGO
    exercicio = Exercicio.objects.get(pk=resposta.data["id"])
    assert exercicio.autor == autor
    assert exercicio.trilha_id == aula.trilha_id
    spec = EspecificacaoDeCodigo.objects.get(exercicio=exercicio)
    casos = list(spec.casos.values_list("ordem", "argumentos", "esperado", "visivel"))
    assert casos == [(1, [1, 2], 3, True), (2, [0, 0], 0, False)]


def test_exercicio_sem_funcao_e_teorico(aula_do_autor):
    autor, aula = aula_do_autor

    resposta = post(
        autor, "criar-exercicio", {"aula": aula.pk, "titulo": "Quiz", "enunciado": "?"}
    )

    assert resposta.status_code == 201
    assert resposta.data["tipo"] == Tipo.TEORICO
    assert not EspecificacaoDeCodigo.objects.exists()


@pytest.mark.parametrize(
    "extra",
    [
        {"funcao": "soma"},
        {"testes": [{"argumentos": [1], "esperado": 1}]},
        {"funcao": "nao valida", "testes": [{"argumentos": [], "esperado": 1}]},
    ],
)
def test_funcao_e_testes_andam_juntos(aula_do_autor, extra):
    autor, aula = aula_do_autor

    resposta = post(
        autor,
        "criar-exercicio",
        {"aula": aula.pk, "titulo": "Soma", "enunciado": "e", **extra},
    )

    assert resposta.status_code == 400
    assert not Exercicio.objects.exists()
