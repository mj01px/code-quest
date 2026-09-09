from django.conf import settings
from django.db import migrations, models


def ativar_a_inicial(apps, schema_editor):
    UserCreature = apps.get_model("gamificacao", "UserCreature")
    UserCreature.objects.filter(is_starter=True).update(is_active=True)


class Migration(migrations.Migration):

    dependencies = [
        ('gamificacao', '0004_seed_fichas'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='usercreature',
            options={'ordering': ['-is_active', '-is_starter', 'acquired_at'], 'verbose_name': 'criatura do usuário', 'verbose_name_plural': 'criaturas dos usuários'},
        ),
        migrations.AddField(
            model_name='usercreature',
            name='is_active',
            field=models.BooleanField(default=False, help_text='A que acompanha o aluno e recebe o XP. Cada usuário tem no máximo uma, e a inicial já nasce ativa.', verbose_name='criatura ativa'),
        ),
        migrations.AddConstraint(
            model_name='usercreature',
            constraint=models.UniqueConstraint(condition=models.Q(('is_active', True)), fields=('user',), name='usercreature_uma_ativa_por_usuario', violation_error_message='Este usuário já tem uma criatura ativa.'),
        ),
        migrations.RunPython(ativar_a_inicial, migrations.RunPython.noop),
    ]
