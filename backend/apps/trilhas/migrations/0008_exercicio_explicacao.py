"""Separa o texto público pós-resposta da solução de referência do autor.

Múltipla escolha e flashcard guardavam a explicação em `solucao_autor`, que a
API não pode expor. O texto desses dois tipos é copiado para `explicacao`;
`solucao_autor` fica como está.
"""

from django.db import migrations, models

TIPOS_COM_EXPLICACAO = ("ALTERNATIVA", "FLASHCARD")


def copiar(apps, schema_editor):
    Exercicio = apps.get_model("trilhas", "Exercicio")
    for exercicio in Exercicio.objects.filter(
        tipo__in=TIPOS_COM_EXPLICACAO, explicacao=""
    ).only("pk", "solucao_autor"):
        exercicio.explicacao = exercicio.solucao_autor
        exercicio.save(update_fields=["explicacao"])


class Migration(migrations.Migration):
    dependencies = [("trilhas", "0007_merge_alternativa_exercicio")]

    operations = [
        migrations.AddField(
            model_name="exercicio",
            name="explicacao",
            field=models.TextField(
                blank=True,
                default="",
                help_text=(
                    "Mostrada ao aluno depois que ele responde (múltipla escolha) ou "
                    "revela (flashcard). Não ponha aqui nada que não possa ser público."
                ),
                verbose_name="explicação",
            ),
        ),
        migrations.RunPython(copiar, migrations.RunPython.noop),
    ]
