from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('contas', '0002_aceitedetermos'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='email_verified_at',
            field=models.DateTimeField(blank=True, help_text='Preenchido quando o titular clica no link enviado no cadastro. Enquanto for nulo, o login fica bloqueado.', null=True, verbose_name='e-mail verificado em'),
        ),
    ]
