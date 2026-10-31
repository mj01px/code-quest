"""Bônus de XP escolhido pelo autor ao criar ou editar a trilha.

O bônus mora em `XpBonus`; o campo `criatura_bonus` (slug ou null) da trilha o
grava, troca ou remove. Omitir o campo não mexe no que existe.
"""

from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.contas.tests.helpers import criar_autor
from apps.gamificacao.models import XpBonus
from apps.trilhas.models import StatusEditorial, Trilha
from apps.trilhas.tests.helpers import criar_trilha

pytestmark = pytest.mark.django_db

TRILHA = {"nome": "Rust", "descricao": "Posse e empréstimo", "dificuldade": "INTERMEDIARIO"}


def cliente(usuario):
    c = APIClient()
    c.force_authenticate(user=usuario)
    return c


def rota(trilha):
    return reverse("autoria:rascunho", kwargs={"tipo": "trilhas", "pk": trilha.pk})


def test_criar_com_criatura_grava_o_dobro():
    autor = criar_autor()

    resposta = cliente(autor).post(
        reverse("autoria:criar-trilha"),
        {**TRILHA, "criatura_bonus": "blaze"},
        format="json",
    )

    assert resposta.status_code == 201
    assert resposta.data["criatura_bonus"] == "blaze"
    bonus = XpBonus.objects.get(trilha_id=resposta.data["id"])
    assert (bonus.creature_id, bonus.multiplier) == ("blaze", Decimal("2.00"))


def test_criar_sem_o_campo_nao_gera_bonus():
    resposta = cliente(criar_autor()).post(
        reverse("autoria:criar-trilha"), TRILHA, format="json"
    )

    assert resposta.status_code == 201
    assert resposta.data["criatura_bonus"] is None
    assert not XpBonus.objects.exists()


def test_criatura_inexistente_e_recusada():
    resposta = cliente(criar_autor()).post(
        reverse("autoria:criar-trilha"),
        {**TRILHA, "criatura_bonus": "dragao-que-nao-existe"},
        format="json",
    )

    assert resposta.status_code == 400
    assert not Trilha.objects.filter(nome="Rust").exists()


@pytest.mark.parametrize("slug", ["raposa", "elefante"])
def test_criatura_sem_arte_nao_vira_bonus(slug):
    resposta = cliente(criar_autor()).post(
        reverse("autoria:criar-trilha"),
        {**TRILHA, "criatura_bonus": slug},
        format="json",
    )

    assert resposta.status_code == 400
    assert not XpBonus.objects.exists()


def test_editar_troca_a_criatura():
    autor = criar_autor()
    trilha = criar_trilha("rust", status=StatusEditorial.RASCUNHO, autor=autor)
    XpBonus.objects.create(creature_id="blaze", trilha=trilha, multiplier=Decimal("2"))

    resposta = cliente(autor).put(
        rota(trilha), {"nome": "Rust", "descricao": "d", "criatura_bonus": "shellby"}, format="json"
    )

    assert resposta.status_code == 200
    assert list(trilha.xp_bonuses.values_list("creature_id", flat=True)) == ["shellby"]


def test_editar_com_null_tira_o_bonus():
    autor = criar_autor()
    trilha = criar_trilha("rust", status=StatusEditorial.RASCUNHO, autor=autor)
    XpBonus.objects.create(creature_id="blaze", trilha=trilha, multiplier=Decimal("2"))

    resposta = cliente(autor).put(
        rota(trilha), {"nome": "Rust", "descricao": "d", "criatura_bonus": None}, format="json"
    )

    assert resposta.status_code == 200
    assert resposta.data["criatura_bonus"] is None
    assert not trilha.xp_bonuses.exists()


def test_editar_sem_o_campo_preserva_o_bonus():
    autor = criar_autor()
    trilha = criar_trilha("rust", status=StatusEditorial.RASCUNHO, autor=autor)
    XpBonus.objects.create(creature_id="blaze", trilha=trilha, multiplier=Decimal("2"))

    resposta = cliente(autor).put(rota(trilha), {"nome": "Rust 2", "descricao": "d"}, format="json")

    assert resposta.status_code == 200
    assert trilha.xp_bonuses.count() == 1


def test_detalhe_editorial_devolve_a_criatura():
    autor = criar_autor()
    trilha = criar_trilha("rust", status=StatusEditorial.RASCUNHO, autor=autor)
    XpBonus.objects.create(creature_id="blaze", trilha=trilha, multiplier=Decimal("2"))

    resposta = cliente(autor).get(
        reverse("autoria:detalhe", kwargs={"tipo": "trilhas", "pk": trilha.pk})
    )

    assert resposta.status_code == 200
    assert resposta.data["criatura_bonus"] == "blaze"
