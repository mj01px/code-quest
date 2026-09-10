from django.db import migrations

FATOR = 50 #Valor decidido para criar a multiplicação e progressao de xp em cada nivel

NIVEL_MAXIMO = 30 #Temporario enquanto estamos criando tudo, depois mudamos

TITULOS = {
    1: "Ovo",
    5: "Aprendiz",
    10: "Iniciado",
    15: "Codificador",
    20: "Artesão",
    25: "Arquiteto",
    30: "Lenda",
}


def xp_acumulado(numero):
    return FATOR * numero * (numero - 1)


def seed(apps, schema_editor):
    Nivel = apps.get_model("progressao", "Nivel")

    for numero in range(1, NIVEL_MAXIMO + 1):
        Nivel.objects.update_or_create(
            numero=numero,
            defaults={
                "xp_necessario": xp_acumulado(numero),
                "titulo": TITULOS.get(numero, ""),
            },
        )


def unseed(apps, schema_editor):
    Nivel = apps.get_model("progressao", "Nivel")
    Nivel.objects.filter(numero__lte=NIVEL_MAXIMO, perfis__isnull=True).delete()


class Migration(migrations.Migration):
    dependencies = [("progressao", "0001_initial")]
    operations = [migrations.RunPython(seed, unseed)]
