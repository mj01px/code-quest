from django.db import migrations

CONQUISTAS = [
    {
        "slug": "ovo-chocado",
        "nome": "Ovo Chocado",
        "descricao": "Escolha sua primeira criatura.",
        "icone": "ovo",
        "criterio": "CRIATURA_ESCOLHIDA",
        "meta": 1,
    },
    {
        "slug": "hello-world",
        "nome": "Hello, World!",
        "descricao": "Conclua seu primeiro exercício.",
        "icone": "terminal",
        "criterio": "EXERCICIOS_CONCLUIDOS",
        "meta": 1,
    },
    {
        "slug": "explorador",
        "nome": "Explorador",
        "descricao": "Inicie sua primeira trilha.",
        "icone": "mapa",
        "criterio": "TRILHAS_INICIADAS",
        "meta": 1,
    },
    {
        "slug": "roda-na-minha-maquina",
        "nome": "Roda na Minha Máquina",
        "descricao": "Execute seu código pela primeira vez.",
        "icone": "play",
        "criterio": "CODIGO_EXECUTADO",
        "meta": 1,
    },
    {
        "slug": "de-primeira",
        "nome": "De Primeira!",
        "descricao": "Seja aprovado em um exercício logo no primeiro envio.",
        "icone": "alvo",
        "criterio": "APROVADO_DE_PRIMEIRA",
        "meta": 1,
        "oculta": True,
    },
    {
        "slug": "debugger",
        "nome": "Debugger",
        "descricao": "Seja aprovado em um exercício depois de errar.",
        "icone": "inseto",
        "criterio": "APROVADO_APOS_ERRO",
        "meta": 1,
        "oculta": True,
    },
    {
        "slug": "aquecendo-os-motores",
        "nome": "Aquecendo os Motores",
        "descricao": "Conclua 5 exercícios.",
        "icone": "chama",
        "criterio": "EXERCICIOS_CONCLUIDOS",
        "meta": 5,
    },
    {
        "slug": "engrenando",
        "nome": "Engrenando",
        "descricao": "Conclua 10 exercícios.",
        "icone": "engrenagem",
        "criterio": "EXERCICIOS_CONCLUIDOS",
        "meta": 10,
    },
    {
        "slug": "level-up",
        "nome": "Level Up",
        "descricao": "Alcance o nível 2.",
        "icone": "seta",
        "criterio": "NIVEL_ALCANCADO",
        "meta": 2,
    },
    {
        "slug": "nao-estou-sozinho",
        "nome": "Não Estou Sozinho",
        "descricao": "Entre em um clã ou crie o seu.",
        "icone": "escudo",
        "criterio": "MEMBRO_DE_CLA",
        "meta": 1,
    },
]


def semear(apps, schema_editor):
    Conquista = apps.get_model("conquistas", "Conquista")
    for ordem, dados in enumerate(CONQUISTAS, start=1):
        Conquista.objects.update_or_create(
            slug=dados["slug"], defaults={**dados, "ordem": ordem}
        )


def remover(apps, schema_editor):
    Conquista = apps.get_model("conquistas", "Conquista")
    Conquista.objects.filter(slug__in=[c["slug"] for c in CONQUISTAS]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("conquistas", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(semear, remover),
    ]
