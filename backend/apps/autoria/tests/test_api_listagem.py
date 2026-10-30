"""Contrato das filas editoriais: rascunhos e fila de revisão.

Cada fila lista os três tipos de conteúdo num formato só, filtra pelo status
da própria fila e exige a permissão RBAC de quem age sobre ela. O schema não
tem dono por conteúdo, então todo autor vê os mesmos rascunhos.
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
def conteudos():
    """Um conteúdo de cada tipo em cada fila, mais um publicado que não aparece."""
    publicada = criar_trilha("publicada", nome="Publicada", status=PUBLICADO)
    rascunho = criar_trilha("rascunho", nome="Trilha nova", status=RASCUNHO)
    aula = criar_aula(publicada, "laco", titulo="Laços", status=REVISAO)
    exercicio = criar_exercicio(aula, "soma", titulo="Soma", status=RASCUNHO)
    return {"trilha": rascunho, "aula": aula, "exercicio": exercicio}


def test_rascunhos_lista_os_tres_tipos_so_em_rascunho(conteudos):
    resposta = cliente(criar_autor()).get(reverse("autoria:rascunhos"))

    assert resposta.status_code == 200
    assert resposta.data == [
        {
            "id": conteudos["trilha"].pk,
            "tipo": "trilhas",
            "titulo": "Trilha nova",
            "status_editorial": RASCUNHO,
        },
        {
            "id": conteudos["exercicio"].pk,
            "tipo": "exercicios",
            "titulo": "Soma",
            "status_editorial": RASCUNHO,
        },
    ]


def test_fila_revisao_lista_so_em_revisao(conteudos):
    resposta = cliente(criar_admin()).get(reverse("autoria:fila-revisao"))

    assert resposta.status_code == 200
    assert resposta.data == [
        {
            "id": conteudos["aula"].pk,
            "tipo": "aulas",
            "titulo": "Laços",
            "status_editorial": REVISAO,
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
