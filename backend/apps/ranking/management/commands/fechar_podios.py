from django.core.management.base import BaseCommand

from apps.ranking.services import fechar_mes, mes_anterior, mes_atual


class Command(BaseCommand):
    help = (
        "Grava o pódio dos meses já encerrados que ainda não têm pódio. "
        "Idempotente: mês fechado é pulado."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--meses",
            type=int,
            default=1,
            help="Quantos meses para trás conferir (padrão: só o anterior).",
        )

    def handle(self, *args, **opcoes):
        meses = []
        mes = mes_atual()
        for _ in range(opcoes["meses"]):
            mes = mes_anterior(mes)
            meses.append(mes)

        # do mais antigo para o mais recente
        for mes in reversed(meses):
            gravados = fechar_mes(mes)
            if gravados:
                nomes = ", ".join(p.user.nickname for p in gravados)
                self.stdout.write(f"{mes:%m/%Y}: {nomes}")
        self.stdout.write(self.style.SUCCESS("Pódios em dia."))
