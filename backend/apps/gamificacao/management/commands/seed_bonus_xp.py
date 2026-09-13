"""Liga cada criatura à trilha do seu domínio, com XP em dobro.

Fica em comando e não em data migration porque as trilhas também nascem de um
comando (`seed_trilhas`), não de migration: uma migration rodaria antes de
existir qualquer trilha e não gravaria nada. Rodar de novo é seguro, a chave do
update_or_create é o par (criatura, trilha).

Domínio sem trilha correspondente é ignorado em silêncio e reportado no fim.
Hoje é o caso de COMPILADAS, cuja trilha de Java ainda não existe no catálogo.
"""

from decimal import Decimal
from typing import Any

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.gamificacao.models import Creature, XpBonus
from apps.trilhas.models import Trilha

DOBRO = Decimal("2.00")

# Domínio da criatura para o slug da trilha em que ela é especialista.
AFINIDADES: dict[str, str] = {
    "FUNDAMENTOS": "logica-de-programacao",
    "SCRIPTING": "python",
    "WEB": "javascript-typescript",
    "DADOS": "banco-de-dados",
}


class Command(BaseCommand):
    help = "Cria ou atualiza o bônus de XP de cada criatura na trilha do seu domínio."

    @transaction.atomic
    def handle(self, *args: Any, **opcoes: Any) -> None:
        trilhas = {t.slug: t for t in Trilha.objects.all()}
        criados = 0
        atualizados = 0
        pulados: list[str] = []

        for criatura in Creature.objects.all():
            slug = AFINIDADES.get(criatura.domain)
            trilha = trilhas.get(slug) if slug else None

            if trilha is None:
                pulados.append(f"{criatura.name} ({criatura.domain})")
                continue

            _, novo = XpBonus.objects.update_or_create(
                creature=criatura,
                trilha=trilha,
                defaults={"multiplier": DOBRO},
            )
            criados += novo
            atualizados += not novo

        self.stdout.write(
            self.style.SUCCESS(
                f"Bônus de XP: {criados} criados, {atualizados} atualizados."
            )
        )
        if pulados:
            self.stdout.write(
                f"Sem trilha correspondente, ignorados: {', '.join(pulados)}."
            )
