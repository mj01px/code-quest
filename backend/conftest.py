from collections.abc import Iterator

import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def limpar_contadores_de_throttle() -> Iterator[None]:
    """Impede que o limite por IP vaze de um teste para o seguinte."""
    cache.clear()
    yield
    cache.clear()


@pytest.fixture(autouse=True)
def progressao_livre_por_padrao(request, settings) -> None:
    """A trava de ordem só vale nos testes marcados com `sequencial`."""
    if request.node.get_closest_marker("sequencial") is None:
        settings.PROGRESSAO_SEQUENCIAL = False
