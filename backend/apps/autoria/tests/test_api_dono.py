"""Autor só age no que criou: enviar para revisão e abrir o detalhe.

O admin age em tudo; quem revisa (`trilhas.review`) lê a fila inteira. Conteúdo
sem autor (o semeado) é só do admin e do revisor. Recusa devolve 403 e não
grava nada nem deixa rastro na auditoria.
"""

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.auditoria.models import RegistroDeAuditoria
from apps.contas.models import NivelDeAcesso, Permissao
from apps.contas.tests.helpers import criar_admin, criar_aluno, criar_autor
from apps.trilhas.models import StatusEditorial
from apps.trilhas.tests.helpers import criar_aula, criar_exercicio, criar_trilha

pytestmark = pytest.mark.django_db

RASCUNHO = StatusEditorial.RASCUNHO
TIPOS = ["trilhas", "aulas", "exercicios"]


def cliente(usuario):
    c = APIClient()
    c.force_authenticate(user=usuario)
    return c


def criar_conteudo(tipo, autor):
    trilha = criar_trilha("logica", status=RASCUNHO, autor=autor if tipo == "trilhas" else None)
    if tipo == "trilhas":
        return trilha
    aula = criar_aula(trilha, "vars", status=RASCUNHO, autor=autor if tipo == "aulas" else None)
    if tipo == "aulas":
        return aula
    return criar_exercicio(aula, "media", status=RASCUNHO, autor=autor)


def submeter(usuario, tipo, pk):
    return cliente(usuario).post(reverse("autoria:submeter", kwargs={"tipo": tipo, "pk": pk}))


def detalhe(usuario, tipo, pk):
    return cliente(usuario).get(reverse("autoria:detalhe", kwargs={"tipo": tipo, "pk": pk}))


@pytest.fixture
def dono():
    return criar_autor("dono")


@pytest.fixture
def revisor():
    """Revisa sem ser admin: nível próprio com `trilhas.review`."""
    nivel = NivelDeAcesso.objects.create(nome="Revisor")
    nivel.permissoes.set(Permissao.objects.filter(codename="trilhas.review"))
    return criar_aluno("revisor", nivel_de_acesso=nivel)


@pytest.mark.parametrize("tipo", TIPOS)
def test_autor_nao_envia_para_revisao_o_de_outro(tipo, dono):
    conteudo = criar_conteudo(tipo, dono)

    resposta = submeter(criar_autor("intruso"), tipo, conteudo.pk)

    assert resposta.status_code == 403
    conteudo.refresh_from_db()
    assert conteudo.status == RASCUNHO
    assert not RegistroDeAuditoria.objects.exists()


def test_autor_nao_envia_conteudo_sem_autor():
    conteudo = criar_conteudo("trilhas", None)

    assert submeter(criar_autor(), "trilhas", conteudo.pk).status_code == 403


@pytest.mark.parametrize("tipo", TIPOS)
def test_dono_envia_para_revisao(tipo, dono):
    assert submeter(dono, tipo, criar_conteudo(tipo, dono).pk).status_code == 200


@pytest.mark.parametrize("tipo", TIPOS)
def test_admin_envia_o_de_qualquer_autor(tipo, dono):
    assert submeter(criar_admin(), tipo, criar_conteudo(tipo, dono).pk).status_code == 200


@pytest.mark.parametrize("tipo", TIPOS)
def test_autor_nao_abre_o_detalhe_de_outro(tipo, dono):
    conteudo = criar_conteudo(tipo, dono)

    assert detalhe(criar_autor("intruso"), tipo, conteudo.pk).status_code == 403


@pytest.mark.parametrize("tipo", TIPOS)
def test_dono_admin_e_revisor_abrem_o_detalhe(tipo, dono, revisor):
    conteudo = criar_conteudo(tipo, dono)

    for quem in (dono, criar_admin(), revisor):
        assert detalhe(quem, tipo, conteudo.pk).status_code == 200


def test_revisor_nao_envia_para_revisao_o_de_outro(dono, revisor):
    # Revisar não dá o direito de submeter: ele nem tem `trilhas.submit_review`.
    conteudo = criar_conteudo("trilhas", dono)

    assert submeter(revisor, "trilhas", conteudo.pk).status_code == 403
