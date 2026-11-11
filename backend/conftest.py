import pytest
from django.core.cache import cache


def _usa_banco(request: pytest.FixtureRequest) -> bool:
    if request.cls is not None and getattr(request.cls, "databases", None):
        return True
    return request.node.get_closest_marker("django_db") is not None or bool(
        {"db", "transactional_db"} & set(request.fixturenames)
    )


@pytest.fixture(autouse=True)
def limpar_contadores_de_throttle(request: pytest.FixtureRequest) -> None:
    """Impede que o limite por IP vaze de um teste para o seguinte.

    Os contadores moram no DatabaseCache: teste sem banco não chega ao throttle
    e nem pode tocar a tabela, então só limpa quem usa o banco. Limpa só na
    entrada: na saída a transação do teste pode estar quebrada (IntegrityError
    esperado), e o que um teste transacional deixar o próximo apaga aqui.
    """
    if _usa_banco(request):
        cache.clear()


@pytest.fixture(autouse=True)
def progressao_livre_por_padrao(request, settings) -> None:
    """A trava de ordem só vale nos testes marcados com `sequencial`."""
    if request.node.get_closest_marker("sequencial") is None:
        settings.PROGRESSAO_SEQUENCIAL = False
