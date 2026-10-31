"""Edição da parte de código de um exercício e o teste dele na prévia.

O PUT do rascunho troca função e casos do exercício de código; o detalhe
editorial devolve os dois para preencher o formulário; e a especificação do
corretor abre o rascunho para o autor, mas não para outro aluno.
"""

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.contas.tests.helpers import criar_aluno, criar_autor
from apps.correcao.models import CasoDeTeste, EspecificacaoDeCodigo
from apps.trilhas.models import StatusEditorial, Tipo
from apps.trilhas.tests.helpers import criar_aula, criar_exercicio, criar_trilha

pytestmark = pytest.mark.django_db

RASCUNHO = StatusEditorial.RASCUNHO


def cliente(usuario):
    c = APIClient()
    c.force_authenticate(user=usuario)
    return c


@pytest.fixture
def autor():
    return criar_autor()


@pytest.fixture
def exercicio(autor):
    trilha = criar_trilha("nova", status=RASCUNHO, autor=autor)
    aula = criar_aula(trilha, "intro", status=RASCUNHO, autor=autor)
    exercicio = criar_exercicio(aula, "media", status=RASCUNHO, autor=autor)
    spec = EspecificacaoDeCodigo.objects.create(exercicio=exercicio, funcao="media")
    CasoDeTeste.objects.create(
        especificacao=spec, ordem=1, argumentos=[2, 4], esperado=3, visivel=True
    )
    return exercicio


def url_rascunho(exercicio):
    return reverse(
        "autoria:rascunho", kwargs={"tipo": "exercicios", "pk": exercicio.pk}
    )


def corpo(**extra):
    return {"titulo": "Media", "enunciado": "Calcule.", **extra}


def test_put_troca_funcao_e_casos(autor, exercicio):
    testes = [
        {"argumentos": [1, 1], "esperado": 1, "visivel": True},
        {"argumentos": [0, 4], "esperado": 2, "visivel": False},
    ]

    resposta = cliente(autor).put(
        url_rascunho(exercicio), corpo(funcao="mediana", testes=testes), format="json"
    )

    assert resposta.status_code == 200
    spec = EspecificacaoDeCodigo.objects.get(exercicio=exercicio)
    assert spec.funcao == "mediana"
    assert [(c.ordem, c.argumentos, c.visivel) for c in spec.casos.all()] == [
        (1, [1, 1], True),
        (2, [0, 4], False),
    ]


def test_put_sem_parte_de_codigo_mantem_casos(autor, exercicio):
    assert (
        cliente(autor).put(url_rascunho(exercicio), corpo(), format="json").status_code
        == 200
    )
    assert EspecificacaoDeCodigo.objects.get(exercicio=exercicio).casos.count() == 1


@pytest.mark.parametrize(
    "extra",
    [{"funcao": "1nao"}, {"testes": []}],
)
def test_put_com_codigo_invalido_recebe_400(autor, exercicio, extra):
    resposta = cliente(autor).put(
        url_rascunho(exercicio), corpo(**extra), format="json"
    )

    assert resposta.status_code == 400
    assert EspecificacaoDeCodigo.objects.get(exercicio=exercicio).funcao == "media"


def test_teorico_nao_aceita_funcao(autor, exercicio):
    exercicio.tipo = Tipo.TEORICO
    exercicio.save(update_fields=["tipo"])

    resposta = cliente(autor).put(
        url_rascunho(exercicio), corpo(funcao="x"), format="json"
    )

    assert resposta.status_code == 400


def test_detalhe_traz_especificacao_e_todos_os_casos(autor, exercicio):
    spec = EspecificacaoDeCodigo.objects.get(exercicio=exercicio)
    CasoDeTeste.objects.create(especificacao=spec, ordem=2, argumentos=[9], esperado=9)

    resposta = cliente(autor).get(
        reverse("autoria:detalhe", kwargs={"tipo": "exercicios", "pk": exercicio.pk})
    )

    assert resposta.data["especificacao"]["funcao"] == "media"
    # O exemplo é só o visível; os testes trazem o oculto também.
    assert len(resposta.data["especificacao"]["exemplos"]) == 1
    assert [t["visivel"] for t in resposta.data["testes"]] == [True, False]
    assert "solucao_autor" not in resposta.data


def url_codigo(exercicio):
    return reverse(
        "correcao:especificacao",
        kwargs={"trilha_slug": "nova", "exercicio_slug": exercicio.slug},
    )


def test_autor_le_especificacao_do_proprio_rascunho(autor, exercicio):
    assert cliente(autor).get(url_codigo(exercicio)).status_code == 200


def test_aluno_nao_ve_especificacao_de_rascunho(exercicio):
    assert cliente(criar_aluno()).get(url_codigo(exercicio)).status_code == 404
