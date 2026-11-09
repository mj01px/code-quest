from datetime import date, timedelta

from django.db.models import QuerySet
from django.utils import timezone

from .models import Exercicio, StatusEditorial


def desafios_publicados() -> QuerySet[Exercicio]:
    return (
        Exercicio.objects.publicados()
        .filter(
            trilha__desafio=True,
            trilha__status=StatusEditorial.PUBLICADO,
            aula__status=StatusEditorial.PUBLICADO,
        )
        .select_related("trilha", "aula")
        .order_by("ordem", "slug")
    )


def rodizio(dia: date | None = None, dias: int = 1) -> list[tuple[date, Exercicio]]:
    """Os desafios de `dias` dias seguidos a partir de `dia`, um por dia.

    O rodízio é fixo pela data de São Paulo: cada desafio volta a cada
    `len(desafios)` dias, e repetir a chamada no mesmo dia dá o mesmo resultado.
    """
    desafios = list(desafios_publicados())
    if not desafios:
        return []
    inicio = dia or timezone.localdate()
    agenda = []
    for passo in range(min(dias, len(desafios))):
        data = inicio + timedelta(days=passo)
        agenda.append((data, desafios[data.toordinal() % len(desafios)]))
    return agenda


def desafio_do_dia(dia: date | None = None) -> Exercicio | None:
    agenda = rodizio(dia)
    return agenda[0][1] if agenda else None
