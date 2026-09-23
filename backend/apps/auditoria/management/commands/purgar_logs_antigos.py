"""Purga a trilha de auditoria além do prazo de retenção.

Fecha o ciclo do plano de retenção: o guia exige que o descarte prometido seja
implementado de fato, não só documentado. Feito para rodar por cron.

O modelo é append-only (o save() recusa updates), mas a exclusão em massa por
queryset não passa pelo save(), então a purga é permitida.
"""

from datetime import timedelta
from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.auditoria.models import RegistroDeAuditoria


class Command(BaseCommand):
    help = "Purga registros de auditoria além do prazo de retenção."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Apenas relata quantos registros seriam purgados.",
        )

    def handle(self, *args: Any, **opcoes: Any) -> None:
        limite = timezone.now() - timedelta(days=settings.AUDITORIA_RETENCAO_DIAS)
        antigos = RegistroDeAuditoria.objects.filter(created_at__lt=limite)

        if opcoes.get("dry_run"):
            self.stdout.write(f"{antigos.count()} registro(s) seriam purgados.")
            return

        removidos, _ = antigos.delete()
        self.stdout.write(
            self.style.SUCCESS(f"{removidos} registro(s) de auditoria purgado(s).")
        )
