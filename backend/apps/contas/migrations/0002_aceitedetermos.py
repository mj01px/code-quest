import uuid

import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('contas', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='AceiteDeTermos',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid7, editable=False, primary_key=True, serialize=False, verbose_name='identificador')),
                ('documento', models.CharField(choices=[('TERMOS', 'Termos de Uso'), ('PRIVACIDADE', 'Política de Privacidade')], max_length=20, verbose_name='documento')),
                ('versao', models.CharField(help_text='Versão que estava vigente no momento do aceite.', max_length=20, verbose_name='versão')),
                ('aceito_em', models.DateTimeField(default=django.utils.timezone.now, editable=False, verbose_name='aceito em')),
                ('ip', models.GenericIPAddressField(blank=True, help_text='De onde partiu o aceite. Guardado como prova.', null=True, verbose_name='IP de origem')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='aceites', to=settings.AUTH_USER_MODEL, verbose_name='usuário')),
            ],
            options={
                'verbose_name': 'aceite de termos',
                'verbose_name_plural': 'aceites de termos',
                'ordering': ['-aceito_em'],
                'indexes': [models.Index(fields=['user', 'documento'], name='aceite_user_doc_idx')],
                'constraints': [models.UniqueConstraint(fields=('user', 'documento', 'versao'), name='aceite_unico_por_versao', violation_error_message='Este documento já foi aceito nesta versão.')],
            },
        ),
    ]
