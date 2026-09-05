import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Creature',
            fields=[
                ('slug', models.SlugField(help_text='Identificador estável usado na API. Não renomeie sem migration.', max_length=32, primary_key=True, serialize=False, verbose_name='slug')),
                ('name', models.CharField(help_text='Nome próprio da criatura, como aparece na interface.', max_length=40, unique=True, verbose_name='nome')),
                ('species', models.CharField(help_text='Tartaruga, cobra, dragão, raposa ou elefante.', max_length=40, verbose_name='espécie')),
                ('domain', models.CharField(choices=[('FUNDAMENTOS', 'Fundamentos'), ('SCRIPTING', 'Scripting'), ('COMPILADAS', 'Compiladas e OO'), ('WEB', 'Web'), ('DADOS', 'Dados')], help_text='Existe exatamente uma criatura por domínio de conhecimento.', max_length=20, unique=True, verbose_name='domínio')),
                ('tagline', models.CharField(blank=True, help_text='Frase curta exibida na tela de escolha da criatura.', max_length=120, verbose_name='chamada')),
                ('base_color', models.CharField(max_length=7, validators=[django.core.validators.RegexValidator(code='cor_invalida', message='Informe uma cor hexadecimal no formato #RRGGBB.', regex='^#[0-9A-Fa-f]{6}$')], verbose_name='cor base')),
                ('outline_color', models.CharField(max_length=7, validators=[django.core.validators.RegexValidator(code='cor_invalida', message='Informe uma cor hexadecimal no formato #RRGGBB.', regex='^#[0-9A-Fa-f]{6}$')], verbose_name='cor de contorno')),
                ('accent_color', models.CharField(max_length=7, validators=[django.core.validators.RegexValidator(code='cor_invalida', message='Informe uma cor hexadecimal no formato #RRGGBB.', regex='^#[0-9A-Fa-f]{6}$')], verbose_name='cor de acento')),
                ('is_available', models.BooleanField(default=False, help_text='Desmarcado enquanto a arte não estiver pronta. Não invalida a posse de quem já escolheu a criatura antes.', verbose_name='disponível para escolha')),
                ('display_order', models.PositiveSmallIntegerField(default=0, help_text='Ordem na tela de escolha da criatura.', verbose_name='ordem de exibição')),
            ],
            options={
                'verbose_name': 'criatura',
                'verbose_name_plural': 'criaturas',
                'ordering': ['display_order', 'slug'],
            },
        ),
        migrations.CreateModel(
            name='CreatureStage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('stage', models.PositiveSmallIntegerField(choices=[(1, 'Filhote'), (2, 'Jovem'), (3, 'Adulto')], verbose_name='estágio')),
                ('min_level', models.PositiveIntegerField(help_text='Nível do usuário a partir do qual a criatura assume este estágio.', verbose_name='nível mínimo')),
                ('sprite', models.CharField(help_text='Nome do arquivo, por exemplo shellby_stage_1.png.', max_length=100, validators=[django.core.validators.RegexValidator(code='sprite_invalido', message='O sprite deve ser um nome de arquivo em minúsculas, sem espaços, terminado em .png ou .webp.', regex='^[a-z0-9_]+\\.(png|webp)$')], verbose_name='sprite')),
                ('sprite_dialog', models.CharField(blank=True, help_text='Variação usada nas caixas de fala. Opcional.', max_length=100, validators=[django.core.validators.RegexValidator(code='sprite_invalido', message='O sprite deve ser um nome de arquivo em minúsculas, sem espaços, terminado em .png ou .webp.', regex='^[a-z0-9_]+\\.(png|webp)$')], verbose_name='sprite de diálogo')),
                ('creature', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='stages', to='gamificacao.creature', verbose_name='criatura')),
            ],
            options={
                'verbose_name': 'estágio da criatura',
                'verbose_name_plural': 'estágios das criaturas',
                'ordering': ['creature__display_order', 'stage'],
                'constraints': [models.UniqueConstraint(fields=('creature', 'stage'), name='creaturestage_unico_por_criatura', violation_error_message='Esta criatura já tem este estágio.'), models.UniqueConstraint(fields=('creature', 'min_level'), name='creaturestage_limiar_unico_por_criatura', violation_error_message='Esta criatura já tem um estágio com este nível mínimo.')],
            },
        ),
        migrations.CreateModel(
            name='UserCreature',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('current_stage', models.PositiveSmallIntegerField(choices=[(1, 'Filhote'), (2, 'Jovem'), (3, 'Adulto')], default=1, verbose_name='estágio atual')),
                ('is_starter', models.BooleanField(default=False, help_text='A escolhida no cadastro. Cada usuário tem no máximo uma.', verbose_name='criatura inicial')),
                ('acquired_at', models.DateTimeField(auto_now_add=True, verbose_name='adquirida em')),
                ('evolved_at', models.DateTimeField(blank=True, help_text='Última vez que o estágio mudou.', null=True, verbose_name='evoluiu em')),
                ('creature', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='owners', to='gamificacao.creature', verbose_name='criatura')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='creatures', to=settings.AUTH_USER_MODEL, verbose_name='usuário')),
            ],
            options={
                'verbose_name': 'criatura do usuário',
                'verbose_name_plural': 'criaturas dos usuários',
                'ordering': ['-is_starter', 'acquired_at'],
                'indexes': [models.Index(fields=['creature'], name='usercreature_criatura_idx')],
                'constraints': [models.UniqueConstraint(fields=('user', 'creature'), name='usercreature_uma_vez_por_usuario', violation_error_message='Este usuário já tem esta criatura.'), models.UniqueConstraint(condition=models.Q(('is_starter', True)), fields=('user',), name='usercreature_uma_inicial_por_usuario', violation_error_message='Este usuário já escolheu a criatura inicial.')],
            },
        ),
    ]
