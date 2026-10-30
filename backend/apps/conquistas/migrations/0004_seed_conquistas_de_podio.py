from django.db import migrations

# Ordem depois das 10 do catálogo inicial.
CONQUISTAS = [
    {
        "slug": "podio-do-mes",
        "nome": "Pódio do Mês",
        "descricao": "Termine um mês entre os 3 primeiros do ranking.",
        "icone": "podio",
        "criterio": "PODIOS_MENSAIS",
        "meta": 1,
        "ordem": 11,
    },
    {
        "slug": "campeao-do-mes",
        "nome": "Campeão do Mês",
        "descricao": "Termine um mês em 1º lugar no ranking.",
        "icone": "coroa",
        "criterio": "VITORIAS_MENSAIS",
        "meta": 1,
        "ordem": 12,
    },
    {
        "slug": "fregues-do-podio",
        "nome": "Freguês do Pódio",
        "descricao": "Termine 3 meses entre os 3 primeiros do ranking.",
        "icone": "trofeu",
        "criterio": "PODIOS_MENSAIS",
        "meta": 3,
        "ordem": 13,
    },
]


def semear(apps, schema_editor):
    Conquista = apps.get_model("conquistas", "Conquista")
    for dados in CONQUISTAS:
        Conquista.objects.update_or_create(slug=dados["slug"], defaults=dados)


def remover(apps, schema_editor):
    Conquista = apps.get_model("conquistas", "Conquista")
    Conquista.objects.filter(slug__in=[c["slug"] for c in CONQUISTAS]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("conquistas", "0003_criterios_de_podio"),
    ]

    operations = [
        migrations.RunPython(semear, remover),
    ]
