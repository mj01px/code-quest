from django.db import migrations

BRAND_ACCENT = "#A855F7"

STAGE_MIN_LEVELS = {1: 1, 2: 10, 3: 25}

CREATURES = [
    {
        "slug": "shellby",
        "name": "Shellby",
        "species": "Tartaruga",
        "domain": "FUNDAMENTOS",
        "tagline": "Começa devagar e não para mais.",
        "base_color": "#4FC98A",
        "outline_color": "#1E5E42",
        "accent_color": "#2E7D5B",
        "is_available": True,
        "display_order": 1,
        "sprite_prefix": "shellby",
    },
    {
        "slug": "slyth",
        "name": "Slyth",
        "species": "Cobra",
        "domain": "SCRIPTING",
        "tagline": "Enrosca em qualquer problema.",
        "base_color": "#3B7FC4",
        "outline_color": "#1E4E7A",
        "accent_color": "#F5D547",
        "is_available": True,
        "display_order": 2,
        "sprite_prefix": "slyth",
    },
    {
        "slug": "blaze",
        "name": "Blaze",
        "species": "Dragão",
        "domain": "COMPILADAS",
        "tagline": "Compila cuspindo fogo.",
        "base_color": "#E04A4A",
        "outline_color": "#8B2020",
        "accent_color": BRAND_ACCENT,
        "is_available": True,
        "display_order": 3,
        "sprite_prefix": "blaze",
    },
    {
        "slug": "raposa",
        "name": "Raposa",
        "species": "Raposa",
        "domain": "WEB",
        "tagline": "Corre solta pela web aberta.",
        "base_color": "#F08A3C",
        "outline_color": "#9C4A12",
        "accent_color": "#F5E0C0",
        "is_available": False,
        "display_order": 4,
        "sprite_prefix": "raposa",
    },
    {
        "slug": "elefante",
        "name": "Elefante",
        "species": "Elefante",
        "domain": "DADOS",
        "tagline": "Elefante nunca esquece um registro.",
        "base_color": "#8A93A8",
        "outline_color": "#4A5163",
        "accent_color": "#C9B8F0",
        "is_available": False,
        "display_order": 5,
        "sprite_prefix": "elefante",
    },
]


def seed(apps, schema_editor):
    Creature = apps.get_model("gamificacao", "Creature")
    CreatureStage = apps.get_model("gamificacao", "CreatureStage")

    for entrada in CREATURES:
        dados = dict(entrada)
        prefixo = dados.pop("sprite_prefix")
        slug = dados.pop("slug")
        Creature.objects.update_or_create(slug=slug, defaults=dados)

        for stage, min_level in STAGE_MIN_LEVELS.items():
            CreatureStage.objects.update_or_create(
                creature_id=slug,
                stage=stage,
                defaults={
                    "min_level": min_level,
                    "sprite": f"{prefixo}_stage_{stage}.png",
                    "sprite_dialog": f"{prefixo}_stage_{stage}_dialog.png",
                },
            )


def unseed(apps, schema_editor):
    Creature = apps.get_model("gamificacao", "Creature")
    slugs = [d["slug"] for d in CREATURES]
    Creature.objects.filter(slug__in=slugs, owners__isnull=True).delete()


class Migration(migrations.Migration):
    dependencies = [("gamificacao", "0001_initial")]
    operations = [migrations.RunPython(seed, unseed)]
