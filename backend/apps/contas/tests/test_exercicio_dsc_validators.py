from datetime import date

import pytest
from django.core.exceptions import ValidationError

from apps.contas.validators import (
    IDADE_MINIMA_ANOS,
    PasswordComplexityValidator,
    calcular_idade,
)


@pytest.mark.parametrize(
    "nascimento, hoje, idade_esperada",
    [
        (date(2000, 3, 10), date(2026, 8, 1), 26),
        (date(2000, 3, 10), date(2026, 2, 1), 25),
        (date(2010, 6, 15), date(2026, 6, 15), IDADE_MINIMA_ANOS),
        (date(2010, 6, 15), date(2026, 6, 14), IDADE_MINIMA_ANOS - 1),
    ],
    ids=["aniversario_ja_passou", "antes_do_aniversario", "no_dia", "na_vespera"],
)
def test_calcular_idade_so_conta_aniversario_ja_passado(
    nascimento, hoje, idade_esperada
):
    assert calcular_idade(nascimento, hoje=hoje) == idade_esperada


def test_senha_completa_passa_sem_erro():
    validador = PasswordComplexityValidator()

    assert validador.validate("Trilha-de-python-8") is None


def test_senha_sem_complexidade_lanca_erro_com_codigos_e_mensagens():
    validador = PasswordComplexityValidator()

    with pytest.raises(ValidationError) as exc:
        validador.validate("semnumeroeespecial")

    codigos = {erro.code for erro in exc.value.error_list}
    assert codigos == {"senha_sem_maiuscula", "senha_sem_numero", "senha_sem_especial"}
    assert exc.value.messages == [
        "A senha deve conter pelo menos uma letra maiúscula.",
        "A senha deve conter pelo menos um número.",
        "A senha deve conter pelo menos um caractere especial.",
    ]


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

    assert {erro.code for erro in exc.value.error_list} == {codigo_esperado}
