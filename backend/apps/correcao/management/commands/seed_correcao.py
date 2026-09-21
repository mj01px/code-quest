from django.core.management.base import BaseCommand
from django.db import transaction

from apps.correcao.models import CasoDeTeste, EspecificacaoDeCodigo, Linguagem
from apps.trilhas.models import Exercicio

from ._casos_python import CASOS_PYTHON

TRILHAS = {
    "python": CASOS_PYTHON,
}


def _espera_erro(esperado):
    return isinstance(esperado, dict) and set(esperado) == {"erro"}


class Command(BaseCommand):
    help = "Cadastra as especificações e os casos de teste da correção automática."

    @transaction.atomic
    def handle(self, *args, **options):
        criadas = 0
        faltando = []

        for trilha_slug, especificacoes in TRILHAS.items():
            for exercicio_slug, dados in especificacoes.items():
                exercicio = Exercicio.objects.filter(
                    trilha__slug=trilha_slug, slug=exercicio_slug
                ).first()
                if exercicio is None:
                    faltando.append(f"{trilha_slug}/{exercicio_slug}")
                    continue

                especificacao, _ = EspecificacaoDeCodigo.objects.update_or_create(
                    exercicio=exercicio,
                    defaults={
                        "linguagem": Linguagem.PYTHON,
                        "funcao": dados["funcao"],
                        "codigo_inicial": dados["codigo_inicial"],
                        "requisitos": dados.get("requisitos", []),
                    },
                )
                especificacao.full_clean()

                especificacao.casos.all().delete()
                CasoDeTeste.objects.bulk_create(
                    [
                        CasoDeTeste(
                            especificacao=especificacao,
                            ordem=ordem,
                            argumentos=argumentos,
                            esperado=None if _espera_erro(esperado) else esperado,
                            erro_esperado=esperado["erro"]
                            if _espera_erro(esperado)
                            else "",
                            visivel=visivel,
                        )
                        for ordem, (argumentos, esperado, visivel) in enumerate(
                            dados["casos"], start=1
                        )
                    ]
                )
                criadas += 1

        self.stdout.write(f"{criadas} especificações cadastradas.")
        if faltando:
            self.stdout.write(
                self.style.WARNING(
                    "Exercícios não encontrados (rode seed_trilhas antes): "
                    + ", ".join(faltando)
                )
            )