"""Edição e exclusão de rascunho, e os flashcards da aula.

Só o dono (ou o admin) altera, e só enquanto o conteúdo está em rascunho.
Recusa não grava nada nem deixa rastro na auditoria.
"""

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.auditoria.models import AcaoAuditoria, RegistroDeAuditoria
from apps.contas.tests.helpers import criar_admin, criar_aluno, criar_autor
from apps.trilhas.models import Aula, Exercicio, Flashcard, StatusEditorial, Trilha
from apps.trilhas.tests.helpers import criar_aula, criar_exercicio, criar_trilha

pytestmark = pytest.mark.django_db

RASCUNHO = StatusEditorial.RASCUNHO
REVISAO = StatusEditorial.REVISAO
MODELOS = {"trilhas": Trilha, "aulas": Aula, "exercicios": Exercicio}
EDICAO = {
    "trilhas": {"nome": "Novo nome", "descricao": "Nova descrição"},
    "aulas": {"titulo": "Novo título", "conteudo": "# Novo"},
    "exercicios": {"titulo": "Novo título", "enunciado": "Novo enunciado"},
}


def cliente(usuario):
    c = APIClient()
    c.force_authenticate(user=usuario)
    return c


def url(tipo, pk):
    return reverse("autoria:rascunho", kwargs={"tipo": tipo, "pk": pk})


def criar_conteudo(tipo, autor, status=RASCUNHO):
    trilha = criar_trilha("logica", status=status, autor=autor)
    if tipo == "trilhas":
        return trilha
    aula = criar_aula(trilha, "vars", status=status, autor=autor)
    if tipo == "aulas":
        return aula
    return criar_exercicio(aula, "media", status=status, autor=autor)


@pytest.fixture
def dono():
    return criar_autor("dono")


# --- Exclusão ---


@pytest.mark.parametrize("tipo", MODELOS)
def test_dono_exclui_o_proprio_rascunho(tipo, dono):
    conteudo = criar_conteudo(tipo, dono)

    resposta = cliente(dono).delete(url(tipo, conteudo.pk))

    assert resposta.status_code == 204
    assert not MODELOS[tipo].objects.filter(pk=conteudo.pk).exists()
    registro = RegistroDeAuditoria.objects.get(acao=AcaoAuditoria.CONTEUDO_EXCLUIDO)
    assert registro.alvo_id == str(conteudo.pk)


@pytest.mark.parametrize("tipo", MODELOS)
def test_autor_nao_exclui_o_rascunho_de_outro(tipo, dono):
    conteudo = criar_conteudo(tipo, dono)

    resposta = cliente(criar_autor("intruso")).delete(url(tipo, conteudo.pk))

    assert resposta.status_code == 403
    assert MODELOS[tipo].objects.filter(pk=conteudo.pk).exists()
    assert not RegistroDeAuditoria.objects.exists()


@pytest.mark.parametrize("tipo", MODELOS)
def test_dono_nao_exclui_o_que_ja_foi_para_revisao(tipo, dono):
    conteudo = criar_conteudo(tipo, dono, status=REVISAO)

    resposta = cliente(dono).delete(url(tipo, conteudo.pk))

    assert resposta.status_code == 400
    assert resposta.data["error"]["details"][0]["code"] == "nao_rascunho"
    assert MODELOS[tipo].objects.filter(pk=conteudo.pk).exists()


@pytest.mark.parametrize("tipo", MODELOS)
def test_dono_exclui_o_que_esta_aprovado(tipo, dono):
    conteudo = criar_conteudo(tipo, dono, status=StatusEditorial.APROVADO)

    resposta = cliente(dono).delete(url(tipo, conteudo.pk))

    assert resposta.status_code == 204
    assert not MODELOS[tipo].objects.filter(pk=conteudo.pk).exists()


@pytest.mark.parametrize("tipo", MODELOS)
def test_dono_nao_exclui_o_que_ja_foi_publicado(tipo, dono):
    conteudo = criar_conteudo(tipo, dono, status=StatusEditorial.PUBLICADO)

    resposta = cliente(dono).delete(url(tipo, conteudo.pk))

    assert resposta.status_code == 400
    assert resposta.data["error"]["details"][0]["code"] == "nao_rascunho"
    assert MODELOS[tipo].objects.filter(pk=conteudo.pk).exists()


def test_aprovado_nao_e_editavel(dono):
    conteudo = criar_conteudo("trilhas", dono, status=StatusEditorial.APROVADO)

    resposta = cliente(dono).put(
        url("trilhas", conteudo.pk), EDICAO["trilhas"], format="json"
    )

    assert resposta.status_code == 400


def test_trilha_aprovada_leva_a_aula_aprovada_junto(dono):
    trilha = criar_trilha("logica", status=StatusEditorial.APROVADO, autor=dono)
    criar_aula(trilha, "vars", status=StatusEditorial.APROVADO, autor=dono)

    assert cliente(dono).delete(url("trilhas", trilha.pk)).status_code == 204
    assert not Aula.objects.filter(trilha=trilha).exists()


def test_trilha_com_aula_publicada_nao_e_excluida(dono):
    trilha = criar_trilha("logica", status=StatusEditorial.APROVADO, autor=dono)
    criar_aula(trilha, "vars", status=StatusEditorial.PUBLICADO, autor=dono)

    assert cliente(dono).delete(url("trilhas", trilha.pk)).status_code == 400
    assert Aula.objects.filter(trilha=trilha).exists()


def test_trilha_com_aula_em_revisao_nao_e_excluida(dono):
    trilha = criar_trilha("logica", status=RASCUNHO, autor=dono)
    criar_aula(trilha, "vars", status=REVISAO, autor=dono)

    resposta = cliente(dono).delete(url("trilhas", trilha.pk))

    assert resposta.status_code == 400
    assert Aula.objects.filter(trilha=trilha).exists()


@pytest.mark.parametrize("filho", ["aulas", "exercicios"])
def test_pai_com_exercicio_em_revisao_nao_e_excluido(filho, dono):
    aula = criar_conteudo("aulas", dono)
    criar_exercicio(aula, "media", status=REVISAO, autor=dono)
    alvo = aula if filho == "aulas" else aula.trilha
    tipo = "aulas" if filho == "aulas" else "trilhas"

    assert cliente(dono).delete(url(tipo, alvo.pk)).status_code == 400
    assert Exercicio.objects.filter(aula=aula).exists()


def test_admin_exclui_o_rascunho_de_qualquer_autor(dono):
    conteudo = criar_conteudo("aulas", dono)

    assert cliente(criar_admin()).delete(url("aulas", conteudo.pk)).status_code == 204


def test_aluno_recebe_403():
    conteudo = criar_conteudo("trilhas", None)

    assert cliente(criar_aluno()).delete(url("trilhas", conteudo.pk)).status_code == 403


# --- Edição ---


@pytest.mark.parametrize("tipo", MODELOS)
def test_dono_edita_os_campos_basicos(tipo, dono):
    conteudo = criar_conteudo(tipo, dono)
    slug = conteudo.slug

    resposta = cliente(dono).put(url(tipo, conteudo.pk), EDICAO[tipo], format="json")

    assert resposta.status_code == 200
    conteudo.refresh_from_db()
    for campo, valor in EDICAO[tipo].items():
        assert getattr(conteudo, campo) == valor
    assert conteudo.slug == slug
    assert conteudo.status == RASCUNHO
    assert RegistroDeAuditoria.objects.filter(
        acao=AcaoAuditoria.CONTEUDO_EDITADO
    ).exists()


def test_edicao_nao_muda_status_nem_pai(dono):
    aula = criar_conteudo("aulas", dono)
    outra = criar_trilha("outra", status=RASCUNHO, autor=dono)

    resposta = cliente(dono).put(
        url("aulas", aula.pk),
        {**EDICAO["aulas"], "status": "PUBLICADO", "trilha": outra.pk},
        format="json",
    )

    assert resposta.status_code == 200
    aula.refresh_from_db()
    assert aula.titulo == "Novo título"
    assert aula.status == RASCUNHO
    assert aula.trilha_id != outra.pk


@pytest.mark.parametrize("tipo", MODELOS)
def test_autor_nao_edita_o_rascunho_de_outro(tipo, dono):
    conteudo = criar_conteudo(tipo, dono)

    resposta = cliente(criar_autor("intruso")).put(
        url(tipo, conteudo.pk), EDICAO[tipo], format="json"
    )

    assert resposta.status_code == 403
    assert not RegistroDeAuditoria.objects.exists()


def test_dono_nao_edita_o_que_ja_foi_para_revisao(dono):
    conteudo = criar_conteudo("exercicios", dono, status=REVISAO)

    resposta = cliente(dono).put(
        url("exercicios", conteudo.pk), EDICAO["exercicios"], format="json"
    )

    assert resposta.status_code == 400
    conteudo.refresh_from_db()
    assert conteudo.titulo != "Novo título"


# --- Flashcards ---


CARD = {"pergunta": "O que é uma variável?", "resposta": "Um nome para um valor."}


def criar_card(usuario, aula):
    return cliente(usuario).post(
        reverse("autoria:criar-flashcard"), {**CARD, "aula": aula.pk}, format="json"
    )


def test_dono_cria_edita_e_exclui_flashcard(dono):
    aula = criar_conteudo("aulas", dono)

    criado = criar_card(dono, aula)
    assert criado.status_code == 201
    rota = reverse("autoria:flashcard", kwargs={"pk": criado.data["id"]})

    editado = cliente(dono).put(rota, {**CARD, "resposta": "Outra."}, format="json")
    assert editado.status_code == 200
    assert Flashcard.objects.get().resposta == "Outra."

    assert cliente(dono).delete(rota).status_code == 204
    assert not Flashcard.objects.exists()


def test_autor_nao_cria_flashcard_na_aula_de_outro(dono):
    aula = criar_conteudo("aulas", dono)

    assert criar_card(criar_autor("intruso"), aula).status_code == 403
    assert not Flashcard.objects.exists()


def test_flashcard_nao_entra_em_aula_em_revisao(dono):
    aula = criar_conteudo("aulas", dono, status=REVISAO)

    assert criar_card(dono, aula).status_code == 400


@pytest.mark.parametrize("metodo", ["put", "delete"])
def test_flashcard_de_aula_em_revisao_nao_muda(metodo, dono):
    aula = criar_conteudo("aulas", dono, status=REVISAO)
    card = Flashcard.objects.create(aula=aula, **CARD)

    resposta = getattr(cliente(dono), metodo)(
        reverse("autoria:flashcard", kwargs={"pk": card.pk}), CARD, format="json"
    )

    assert resposta.status_code == 400
    assert Flashcard.objects.filter(pk=card.pk).exists()


def test_flashcard_inexistente_devolve_404(dono):
    rota = reverse("autoria:flashcard", kwargs={"pk": 999})

    assert cliente(dono).delete(rota).status_code == 404


def test_autor_nao_exclui_flashcard_da_aula_de_outro(dono):
    aula = criar_conteudo("aulas", dono)
    card = Flashcard.objects.create(aula=aula, **CARD)

    resposta = cliente(criar_autor("intruso")).delete(
        reverse("autoria:flashcard", kwargs={"pk": card.pk})
    )

    assert resposta.status_code == 403
    assert Flashcard.objects.exists()


def test_aula_publica_mostra_os_flashcards():
    trilha = criar_trilha("logica")
    aula = criar_aula(trilha, "vars")
    card = Flashcard.objects.create(aula=aula, **CARD)

    resposta = APIClient().get(reverse("trilhas:trilha-detalhe", args=[trilha.slug]))

    assert resposta.status_code == 200
    assert resposta.data["aulas"][0]["flashcards"] == [{"id": card.pk, **CARD}]
