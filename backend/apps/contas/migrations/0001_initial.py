import uuid

import django.core.validators
import django.db.models.functions.text
import django.utils.timezone
from django.db import migrations, models

import apps.contas.managers
import apps.contas.validators


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.CreateModel(
            name='User',
            fields=[
                ('password', models.CharField(max_length=128, verbose_name='password')),
                ('last_login', models.DateTimeField(blank=True, null=True, verbose_name='last login')),
                ('is_superuser', models.BooleanField(default=False, help_text='Designates that this user has all permissions without explicitly assigning them.', verbose_name='superuser status')),
                ('id', models.UUIDField(default=uuid.uuid7, editable=False, primary_key=True, serialize=False, verbose_name='identificador')),
                ('email', models.EmailField(error_messages={'unique': 'Já existe uma conta com este e-mail.'}, help_text='Usado para entrar na plataforma.', max_length=254, unique=True, verbose_name='e-mail')),
                ('nickname', models.CharField(help_text='Nome público, exibido no ranking e no perfil. Letras sem acento, números e underscore.', max_length=20, validators=[django.core.validators.MinLengthValidator(3, message='O nickname precisa ter pelo menos %(limit_value)d caracteres.'), django.core.validators.RegexValidator(code='nickname_invalido', message='O nickname pode conter apenas letras sem acento, números e underscore.', regex='^[A-Za-z0-9_]+$'), apps.contas.validators.validate_nickname_not_reserved], verbose_name='nickname')),
                ('role', models.CharField(choices=[('ALUNO', 'Aluno'), ('AUTOR', 'Autor'), ('ADMIN', 'Administrador')], db_index=True, default='ALUNO', help_text='O papel de autor é concedido por um administrador, nunca escolhido no cadastro.', max_length=10, verbose_name='papel')),
                ('is_active', models.BooleanField(default=True, help_text='Desmarque para suspender a conta. Não tem relação com a confirmação de e-mail.', verbose_name='ativo')),
                ('is_staff', models.BooleanField(default=False, help_text='Restrito à equipe de desenvolvimento. Não confundir com o papel de administrador do produto, que é o campo acima.', verbose_name='acesso ao admin do Django')),
                ('deletion_requested_at', models.DateTimeField(blank=True, help_text='Preenchido quando o titular pede a exclusão. A anonimização acontece depois do prazo de arrependimento.', null=True, verbose_name='exclusão solicitada em')),
                ('anonymized_at', models.DateTimeField(blank=True, help_text='Preenchido pela tarefa que executa a exclusão de fato.', null=True, verbose_name='anonimizado em')),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now, editable=False, verbose_name='criado em')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='atualizado em')),
                ('groups', models.ManyToManyField(blank=True, help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.', related_name='user_set', related_query_name='user', to='auth.group', verbose_name='groups')),
                ('user_permissions', models.ManyToManyField(blank=True, help_text='Specific permissions for this user.', related_name='user_set', related_query_name='user', to='auth.permission', verbose_name='user permissions')),
            ],
            options={
                'verbose_name': 'usuário',
                'verbose_name_plural': 'usuários',
                'ordering': ['-created_at'],
                'indexes': [models.Index(fields=['-created_at'], name='user_criado_em_idx')],
                'constraints': [models.UniqueConstraint(django.db.models.functions.text.Lower('nickname'), name='user_nickname_unico_sem_caixa', violation_error_message='Este nickname já está em uso.')],
            },
            managers=[
                ('objects', apps.contas.managers.UserManager()),
            ],
        ),
    ]
