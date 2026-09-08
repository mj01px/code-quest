import django.db.models.deletion
from django.db import migrations, models


def preencher_trilha(apps, schema_editor):
    """Copia a trilha da aula para cada exercício já existente."""
    Exercicio = apps.get_model("trilhas", "Exercicio")
    for exercicio in Exercicio.objects.select_related("aula").iterator():
        exercicio.trilha_id = exercicio.aula.trilha_id
        exercicio.save(update_fields=["trilha"])


def limpar_trilha(apps, schema_editor):
    """Reverso do preenchimento: nada a desfazer, a coluna some depois."""


class Migration(migrations.Migration):
    dependencies = [
        ("trilhas", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="exercicio",
            name="trilha",
            field=models.ForeignKey(
                blank=True,
                editable=False,
                help_text="Derivado da aula, para tornar o slug único na trilha.",
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="exercicios",
                to="trilhas.trilha",
                verbose_name="trilha",
            ),
        ),
        migrations.RunPython(preencher_trilha, limpar_trilha),
        migrations.AlterField(
            model_name="exercicio",
            name="trilha",
            field=models.ForeignKey(
                blank=True,
                editable=False,
                help_text="Derivado da aula, para tornar o slug único na trilha.",
                on_delete=django.db.models.deletion.CASCADE,
                related_name="exercicios",
                to="trilhas.trilha",
                verbose_name="trilha",
            ),
        ),
        migrations.AlterField(
            model_name="exercicio",
            name="slug",
            field=models.SlugField(
                help_text="Único dentro da trilha, porque a URL não cita a aula.",
                max_length=120,
                verbose_name="slug",
            ),
        ),
        migrations.RemoveConstraint(
            model_name="exercicio",
            name="exercicio_slug_unico_por_aula",
        ),
        migrations.AddConstraint(
            model_name="exercicio",
            constraint=models.UniqueConstraint(
                fields=("trilha", "slug"),
                name="exercicio_slug_unico_por_trilha",
                violation_error_message="Esta trilha já tem um exercício com este slug.",
            ),
        ),
        migrations.AddIndex(
            model_name="exercicio",
            index=models.Index(
                fields=["trilha", "slug"], name="exercicio_trilha_slug_idx"
            ),
        ),
    ]
