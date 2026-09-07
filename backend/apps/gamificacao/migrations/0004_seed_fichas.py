from django.db import migrations

FICHAS = {
    "shellby": {
        "tagline": "Começa devagar e não para mais.",
        "type_label": "Iniciante / Terra",
        "description": (
            "Anda no seu ritmo e não deixa passar nada. Constrói a base de "
            "lógica que todo o resto vai apoiar em cima."
        ),
        "attribute_label": "Defesa",
        "attribute_value": 4,
    },
    "slyth": {
        "tagline": "Enrosca em qualquer problema.",
        "type_label": "Data / Raio",
        "description": (
            "Enrosca nos dados e sai com a resposta. Aprende Python em tempo "
            "recorde e automatiza o que for repetitivo."
        ),
        "attribute_label": "Lógica",
        "attribute_value": 5,
    },
    "blaze": {
        "tagline": "Compila cuspindo fogo.",
        "type_label": "Backend / Fogo",
        "description": (
            "Encara linguagem compilada no peito. Java deixa de assustar "
            "quando tem um dragão do seu lado."
        ),
        "attribute_label": "Força",
        "attribute_value": 5,
    },
    "raposa": {
        "tagline": "Corre solta pela web aberta.",
        "type_label": "Web / Vento",
        "description": (
            "Rápida e curiosa, vive na web aberta. Vai do JavaScript ao React "
            "montando interface no susto."
        ),
        "attribute_label": "Agilidade",
        "attribute_value": 5,
    },
    "elefante": {
        "tagline": "Elefante nunca esquece um registro.",
        "type_label": "Dados / Memória",
        "description": (
            "Nunca esquece um registro. Guarda, indexa e devolve na hora tudo "
            "o que você já ensinou para ele."
        ),
        "attribute_label": "Memória",
        "attribute_value": 5,
    },
}


def povoar(apps, schema_editor):
    Creature = apps.get_model("gamificacao", "Creature")
    for slug, dados in FICHAS.items():
        Creature.objects.filter(slug=slug).update(**dados)


def despovoar(apps, schema_editor):
    Creature = apps.get_model("gamificacao", "Creature")
    Creature.objects.filter(slug__in=FICHAS).update(
        type_label="", description="", attribute_label="", attribute_value=0
    )


class Migration(migrations.Migration):
    dependencies = [
        ("gamificacao", "0003_creature_attribute_label_creature_attribute_value_and_more")
    ]
    operations = [migrations.RunPython(povoar, despovoar)]
