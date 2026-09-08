import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def limpar_contadores_de_throttle():
    """Impede que o limite por IP vaze de um teste para o seguinte."""
    cache.clear()
    yield
    cache.clear()
