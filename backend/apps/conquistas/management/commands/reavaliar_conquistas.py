from typing import Any

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.conquistas.services import avaliar


class Command(BaseCommand):
    help = "Reavalia as conquistas de todos os alunos ativos."

    def handle(self, *args: Any, **opcoes: Any) -> None:
        alunos = get_user_model().objects.filter(
            is_active=True, anonymized_at__isnull=True
        )
        total = sum(len(avaliar(user)) for user in alunos.iterator())
        self.stdout.write(self.style.SUCCESS(f"{total} conquista(s) desbloqueada(s)."))
