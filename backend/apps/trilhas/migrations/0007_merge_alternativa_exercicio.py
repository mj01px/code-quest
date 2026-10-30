from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("trilhas", "0004_alter_exercicio_tipo_alternativa"),
        ("trilhas", "0006_questao"),
    ]

    operations = [
        migrations.RenameModel(
            old_name="Alternativa",
            new_name="AlternativaExercicio",
        ),
    ]
