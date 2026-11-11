"""Cria a tabela do DatabaseCache (settings.CACHES) junto com o `migrate`.

Assim nenhum ambiente (dev da equipe, CI, VPS) depende de lembrar o
`createcachetable` à parte. O comando é idempotente: tabela existente é pulada.
"""

from django.core.management import call_command
from django.db import migrations


def criar_tabela_de_cache(apps, schema_editor):
    call_command("createcachetable", database=schema_editor.connection.alias)


class Migration(migrations.Migration):
    dependencies: list[tuple[str, str]] = []

    operations = [
        migrations.RunPython(criar_tabela_de_cache, migrations.RunPython.noop),
    ]
