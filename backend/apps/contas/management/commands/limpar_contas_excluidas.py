from typing import Any

from django.core.management.base import BaseCommand, CommandParser

from apps.contas.lgpd import descartar_contas_excluidas


class Command(BaseCommand):
    help = "Descarta os dados das contas excluídas além do prazo de retenção."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Apenas relata o que seria descartado.",
        )

    def handle(self, *args: Any, **opcoes: Any) -> None:
        simular = bool(opcoes.get("dry_run"))
        resultado = descartar_contas_excluidas(simular=simular)

        if simular:
            self.stdout.write(
                f"{resultado.registros_de_progresso} registro(s) de progresso e "
                f"{resultado.contas} conta(s) seriam descartados."
            )
            return

        self.stdout.write(
            self.style.SUCCESS(
                f"{resultado.registros_de_progresso} registro(s) de progresso e "
                f"{resultado.contas} conta(s) descartados."
            )
        )
