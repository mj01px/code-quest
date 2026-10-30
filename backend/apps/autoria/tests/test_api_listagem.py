"""Contrato das filas editoriais: rascunhos e fila de revisão.

Cada fila lista os três tipos de conteúdo num formato só, filtra pelo status
da própria fila e exige a permissão RBAC de quem age sobre ela. Nos rascunhos,
o autor só vê o que criou; o admin vê os de todos.
"""

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.contas.tests.helpers import criar_admin, criar_aluno, criar_autor
from apps.trilhas.models import StatusEditorial
from apps.trilhas.tests.helpers import criar_aula, criar_exercicio, criar_trilha

pytestmark = pytest.mark.django_db

RASCUNHO = StatusEditorial.RASCUNHO
REVISAO = StatusEditorial.REVISAO
PUBLICADO = StatusEditorial.PUBLICADO


def cliente(usuario=None):
    c = APIClient()
    if usuario is not None:
        c.force_authenticate(user=usuario)
    return c


@pytest.fixture
def autor():
    return criar_autor()


@pytest.fixture
def conteudos(autor):
    """Um conteúdo de cada tipo em cada fila, mais um publicado que não aparece."""
    publicada = criar_trilha("publicada", nome="Publicada", status=PUBLICADO)
    rascunho = criar_trilha("rascunho", nome="Trilha nova", status=RASCUNHO, autor=autor)
    aula = criar_aula(publicada, "laco", titulo="Laços", status=REVISAO, autor=autor)
    exercicio = criar_exercicio(aula, "soma", titulo="Soma", status=RASCUNHO, autor=autor)
    return {"trilha": rascunho, "aula": aula, "exercicio": exercicio}


def rascunhos_esperados(conteudos):
    return [
        {
            "id": conteudos["trilha"].pk,
            "tipo": "trilhas",
            "titulo": "Trilha nova",
            "status_editorial": RASCUNHO,
            "criado_por": conteudos["trilha"].autor.nickname,
            "parecer": None,
        },
    ]


def test_rascunhos_lista_so_trilhas_em_rascunho(conteudos, autor):
    # O exercício em rascunho existe, mas vive dentro da trilha: sem card solto.
    resposta = cliente(autor).get(reverse("autoria:rascunhos"))

    assert resposta.status_code == 200
    assert resposta.data == rascunhos_esperados(conteudos)


def test_rascunhos_de_outro_autor_nao_aparecem(conteudos):
    resposta = cliente(criar_autor("outro")).get(reverse("autoria:rascunhos"))

    assert resposta.status_code == 200
    assert resposta.data == []


def test_admin_ve_rascunhos_de_todos_os_autores(conteudos):
    resposta = cliente(criar_admin()).get(reverse("autoria:rascunhos"))

    assert resposta.status_code == 200
    assert resposta.data == rascunhos_esperados(conteudos)


def test_fila_revisao_lista_so_em_revisao(conteudos):
    resposta = cliente(criar_admin()).get(reverse("autoria:fila-revisao"))

    assert resposta.status_code == 200
    assert resposta.data == [
        {
            "id": conteudos["aula"].pk,
            "tipo": "aulas",
            "titulo": "Laços",
            "status_editorial": REVISAO,
            "criado_por": conteudos["aula"].autor.nickname,
        },
    ]


@pytest.mark.parametrize(
    ("rota", "sem_permissao"),
    [("rascunhos", criar_aluno), ("fila-revisao", criar_autor)],
)
def test_sem_permissao_recebe_403(rota, sem_permissao):
    resposta = cliente(sem_permissao()).get(reverse(f"autoria:{rota}"))

    assert resposta.status_code == 403


@pytest.mark.parametrize("rota", ["rascunhos", "fila-revisao"])
def test_anonimo_recebe_401(rota):
    resposta = cliente().get(reverse(f"autoria:{rota}"))

    assert resposta.status_code == 401
