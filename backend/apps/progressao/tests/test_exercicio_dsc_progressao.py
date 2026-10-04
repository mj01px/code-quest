from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from django.core.exceptions import ValidationError

from apps.progressao.services import iniciar_trilha, xp_do_exercicio
from apps.trilhas.models import Dificuldade


def _aluno_ativo():
    return MagicMock(is_active=True, is_anonymized=False)


def _trilha(publicada=True):
    return MagicMock(publicada=publicada)


@pytest.mark.parametrize(
    "dificuldade, xp_esperado",
    [
        (Dificuldade.INICIANTE, 50),
        (Dificuldade.INTERMEDIARIO, 100),
        (Dificuldade.AVANCADO, 200),
    ],
)
def test_xp_vem_da_dificuldade_do_exercicio(dificuldade, xp_esperado):
    exercicio = SimpleNamespace(dificuldade=dificuldade)

    assert xp_do_exercicio(exercicio) == xp_esperado


def test_xp_de_dificuldade_desconhecida_cai_no_padrao():
    exercicio = SimpleNamespace(dificuldade="DIFICULDADE_INEXISTENTE")

    assert xp_do_exercicio(exercicio) == 50


@pytest.mark.parametrize(
    "usuario",
    [
        MagicMock(is_active=False, is_anonymized=False),
        MagicMock(is_active=True, is_anonymized=True),
    ],
    ids=["inativa", "anonimizada"],
)
@patch("apps.progressao.services.TrilhaIniciada")
def test_conta_inativa_nao_pode_iniciar_trilha_nem_grava(trilha_iniciada, usuario):
    with pytest.raises(ValidationError) as exc:
        iniciar_trilha(user=usuario, trilha=_trilha())

    assert exc.value.error_dict["usuario"][0].code == "conta_inativa"
    trilha_iniciada.objects.get_or_create.assert_not_called()


@patch("apps.progressao.services.TrilhaIniciada")
def test_trilha_nao_publicada_bloqueia_e_nao_grava(trilha_iniciada):
    with pytest.raises(ValidationError) as exc:
        iniciar_trilha(user=_aluno_ativo(), trilha=_trilha(publicada=False))

    assert exc.value.error_dict["trilha"][0].code == "exercicio_nao_publicado"
    trilha_iniciada.objects.get_or_create.assert_not_called()
