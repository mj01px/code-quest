"""O "continuar de onde parou" segue a trilha da atividade mais recente."""

from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.contas.tests.helpers import criar_aluno
from apps.progressao.models import EtapaConcluida, TipoDeEtapa, TrilhaIniciada
from apps.progressao.services import trilha_atual
from apps.trilhas.tests.helpers import criar_aula, criar_trilha

pytestmark = pytest.mark.django_db


def test_sem_atividade_nao_ha_trilha_atual():
    assert trilha_atual(user=criar_aluno()) is None


def test_a_atividade_mais_recente_decide():
    user = criar_aluno()
    logica = criar_trilha("logica")
    python = criar_trilha("python", ordem=2)
    TrilhaIniciada.objects.create(user=user, trilha=logica)
    etapa = EtapaConcluida.objects.create(
        user=user, aula=criar_aula(python, "texto"), tipo=TipoDeEtapa.LEITURA
    )
    assert trilha_atual(user=user) == "python"

    EtapaConcluida.objects.filter(pk=etapa.pk).update(
        concluida_em=timezone.now() - timedelta(days=1)
    )
    assert trilha_atual(user=user) == "logica"


def test_rota_devolve_o_slug():
    user = criar_aluno()
    TrilhaIniciada.objects.create(user=user, trilha=criar_trilha("banco"))
    cliente = APIClient()
    cliente.force_authenticate(user=user)

    resposta = cliente.get(reverse("progressao:trilha-atual"))

    assert resposta.status_code == 200
    assert resposta.data == {"trilha": "banco"}
