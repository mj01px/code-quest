from types import SimpleNamespace
from unittest.mock import MagicMock

from apps.gamificacao.models import Creature, Stage


def _criatura_com_estagios(*limiares):
    criatura = MagicMock()
    criatura.stages.all.return_value = [
        SimpleNamespace(stage=stage, min_level=min_level)
        for stage, min_level in limiares
    ]
    return criatura


def test_estagio_corresponde_ao_maior_limiar_alcancado():
    criatura = _criatura_com_estagios((1, 1), (2, 5), (3, 10))

    assert Creature.stage_for_level(criatura, level=7) == 2


def test_no_limiar_exato_a_criatura_assume_o_novo_estagio():
    criatura = _criatura_com_estagios((1, 1), (2, 5), (3, 10))

    assert Creature.stage_for_level(criatura, level=5) == 2
    assert Creature.stage_for_level(criatura, level=10) == 3


def test_abaixo_do_primeiro_limiar_permanece_filhote():
    criatura = _criatura_com_estagios((1, 3), (2, 8))

    assert Creature.stage_for_level(criatura, level=1) == Stage.HATCHLING


def test_criatura_sem_estagios_cai_no_filhote():
    criatura = _criatura_com_estagios()

    assert Creature.stage_for_level(criatura, level=99) == Stage.HATCHLING
