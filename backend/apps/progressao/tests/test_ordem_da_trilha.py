"""Leitura, quiz e exercícios abrem em ordem dentro da trilha."""

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.contas.tests.helpers import criar_aluno
from apps.gamificacao.services import select_starter_creature
from apps.progressao.models import EtapaConcluida, TipoDeEtapa
from apps.trilhas.models import Exercicio, Questao, StatusEditorial, Tipo
from apps.trilhas.tests.helpers import criar_aula, criar_trilha

pytestmark = [pytest.mark.django_db, pytest.mark.sequencial]


@pytest.fixture
def cenario():
    user = criar_aluno()
    select_starter_creature(user=user, creature_slug="shellby")
    cliente = APIClient()
    cliente.force_authenticate(user=user)
    trilha = criar_trilha("logica")
    aula1 = criar_aula(trilha, "variaveis", ordem=1)
    Questao.objects.create(
        aula=aula1, enunciado="?", opcoes=["a", "b", "c", "d"], resposta_correta="A"
    )
    aula2 = criar_aula(trilha, "condicionais", ordem=2)
    ex1, ex2, ex3 = (
        Exercicio.objects.create(
            aula=aula,
            titulo=titulo,
            slug=slug,
            enunciado="x",
            tipo=Tipo.TEORICO,
            ordem=ordem,
            status=StatusEditorial.PUBLICADO,
        )
        for aula, slug, titulo, ordem in [
            (aula1, "ex-1", "Exercício 1", 1),
            (aula1, "ex-2", "Exercício 2", 2),
            (aula2, "ex-3", "Exercício 3", 1),
        ]
    )
    return {"user": user, "cliente": cliente, "aula1": aula1, "aula2": aula2}


def concluir(cliente, slug):
    return cliente.post(
        reverse(
            "progressao:concluir-exercicio",
            kwargs={"trilha_slug": "logica", "exercicio_slug": slug},
        ),
        format="json",
    )


def passos(cliente):
    resposta = cliente.get(reverse("progressao:passos-da-trilha", args=["logica"]))
    return [
        (p["tipo"], p["exercicio_slug"] or p["aula_slug"], p["estado"])
        for p in resposta.data
    ]


def test_comeca_pela_leitura_e_o_resto_fica_bloqueado(cenario):
    assert passos(cenario["cliente"]) == [
        ("LEITURA", "variaveis", "liberado"),
        ("QUIZ", "variaveis", "bloqueado"),
        ("EXERCICIO", "ex-1", "bloqueado"),
        ("EXERCICIO", "ex-2", "bloqueado"),
        ("LEITURA", "condicionais", "bloqueado"),
        ("EXERCICIO", "ex-3", "bloqueado"),
    ]


def test_exercicio_bloqueado_e_recusado_com_o_proximo_passo(cenario):
    resposta = concluir(cenario["cliente"], "ex-1")

    assert resposta.status_code == 403
    assert resposta.data["error"]["code"] == "etapa_bloqueada"
    assert "Lição: Variaveis" in resposta.data["error"]["message"]


def test_cada_passo_libera_o_seguinte(cenario):
    cliente, user, aula1 = cenario["cliente"], cenario["user"], cenario["aula1"]

    EtapaConcluida.objects.create(user=user, aula=aula1, tipo=TipoDeEtapa.LEITURA)
    assert concluir(cliente, "ex-1").status_code == 403

    EtapaConcluida.objects.create(
        user=user, aula=aula1, tipo=TipoDeEtapa.QUIZ, acertos=1, total=1
    )
    assert concluir(cliente, "ex-1").status_code == 200
    assert concluir(cliente, "ex-3").status_code == 403
    assert concluir(cliente, "ex-2").status_code == 200

    estados = passos(cliente)
    assert ("LEITURA", "condicionais", "liberado") in estados
    assert ("EXERCICIO", "ex-3", "bloqueado") in estados


def test_leitura_do_modulo_seguinte_espera_o_anterior(cenario):
    resposta = cenario["cliente"].post(
        reverse("progressao:concluir-leitura", args=["logica", "condicionais"])
    )

    assert resposta.status_code == 403


def test_o_que_ja_foi_feito_continua_aberto(cenario):
    cliente, user, aula1 = cenario["cliente"], cenario["user"], cenario["aula1"]
    EtapaConcluida.objects.create(user=user, aula=aula1, tipo=TipoDeEtapa.LEITURA)

    resposta = cliente.post(
        reverse("progressao:concluir-leitura", args=["logica", "variaveis"])
    )

    assert resposta.status_code == 200


def test_sem_a_trava_tudo_aparece_liberado(cenario, settings):
    settings.PROGRESSAO_SEQUENCIAL = False

    assert all(estado != "bloqueado" for _, _, estado in passos(cenario["cliente"]))
    assert concluir(cenario["cliente"], "ex-3").status_code == 200
