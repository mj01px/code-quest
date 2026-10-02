from datetime import date

import pytest
from django.core.exceptions import ValidationError

from apps.contas.validators import (
    IDADE_MINIMA_ANOS,
    PasswordComplexityValidator,
    calcular_idade,
    validate_nickname_not_reserved,
)


def test_calcular_idade_conta_apenas_aniversario_ja_passado():
    nascimento = date(2000, 3, 10)

    idade = calcular_idade(nascimento, hoje=date(2026, 8, 1))

    assert idade == 26


def test_calcular_idade_nao_conta_ano_antes_do_aniversario():
    nascimento = date(2000, 3, 10)

    idade = calcular_idade(nascimento, hoje=date(2026, 2, 1))

    assert idade == 25


def test_calcular_idade_no_dia_do_aniversario_ja_completa_o_ano():
    nascimento = date(2010, 6, 15)

    idade = calcular_idade(nascimento, hoje=date(2026, 6, 15))

    assert idade == IDADE_MINIMA_ANOS


def test_calcular_idade_na_vespera_ainda_nao_atinge_a_idade_minima():
    nascimento = date(2010, 6, 15)

    idade = calcular_idade(nascimento, hoje=date(2026, 6, 14))

    assert idade == IDADE_MINIMA_ANOS - 1


def test_senha_completa_passa_sem_erro():
    validador = PasswordComplexityValidator()

    assert validador.validate("Trilha-de-python-8") is None


def test_senha_sem_complexidade_lanca_erro_com_codigo_e_mensagem():
    validador = PasswordComplexityValidator()

    with pytest.raises(ValidationError) as exc:
        validador.validate("semnumeroeespecial")

    codigos = {erro.code for erro in exc.value.error_list}
    assert "senha_sem_maiuscula" in codigos
    assert "senha_sem_numero" in codigos
    assert "senha_sem_especial" in codigos


@pytest.mark.parametrize(
    "senha, codigo_esperado",
    [
        ("minuscula-1", "senha_sem_maiuscula"),
        ("MAIUSCULA-1", "senha_sem_minuscula"),
        ("SemNumero-", "senha_sem_numero"),
        ("SemEspecial1", "senha_sem_especial"),
    ],
)
def test_senha_sinaliza_o_requisito_que_falta(senha, codigo_esperado):
    validador = PasswordComplexityValidator()

    with pytest.raises(ValidationError) as exc:
        validador.validate(senha)

    assert codigo_esperado in {erro.code for erro in exc.value.error_list}


def test_nickname_reservado_e_recusado():
    with pytest.raises(ValidationError) as exc:
        validate_nickname_not_reserved("admin")

    assert exc.value.code == "nickname_reservado"


def test_nickname_livre_passa():
    assert validate_nickname_not_reserved("mauro_dev") is None
