from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('contas', '0003_user_email_verified_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='failed_logins',
            field=models.PositiveSmallIntegerField(default=0, help_text='Zerado a cada login bem-sucedido.', verbose_name='tentativas de login falhas'),
        ),
        migrations.AddField(
            model_name='user',
            name='locked_until',
            field=models.DateTimeField(blank=True, help_text='Preenchido quando as tentativas falhas passam do limite. Não confundir com is_active, que é suspensão manual.', null=True, verbose_name='bloqueado até'),
        ),
    ]
