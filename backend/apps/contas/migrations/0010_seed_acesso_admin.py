"""Marca o nível de sistema 'Admin' como o que concede acesso ao painel.

Depois desta migração, quem é administrador da plataforma é quem está num nível
com `acesso_admin=True` — não mais o papel `role`.
"""

from django.db import migrations


def marcar(apps, schema_editor):
    NivelDeAcesso = apps.get_model("contas", "NivelDeAcesso")
    NivelDeAcesso.objects.filter(nome="Admin", sistema=True).update(
        acesso_admin=True
    )


def desfazer(apps, schema_editor):
    NivelDeAcesso = apps.get_model("contas", "NivelDeAcesso")
    NivelDeAcesso.objects.filter(nome="Admin", sistema=True).update(
        acesso_admin=False
    )


class Migration(migrations.Migration):
    dependencies = [("contas", "0009_niveldeacesso_acesso_admin")]
    operations = [migrations.RunPython(marcar, desfazer)]
