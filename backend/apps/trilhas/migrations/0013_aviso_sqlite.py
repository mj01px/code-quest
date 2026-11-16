"""Avisa que os exercícios de SQL rodam em SQLite.

A trilha dizia que o SQL servia igual em PostgreSQL, MySQL ou SQLite, mas a
correção roda em SQLite. Atualiza o "Sobre" da trilha e põe na lição de
modelagem as diferenças mais comuns entre os bancos. Só mexe no texto que ainda
está como o seed deixou, para não pisar em edição feita pelo painel.
"""

from django.db import migrations

SOBRE_VELHO = (
    "O SQL aqui é o padrão, sem recurso exclusivo de nenhum fornecedor, "
    "então serve igual em PostgreSQL, MySQL ou SQLite. "
)
SOBRE_NOVO = (
    "Os exercícios rodam em SQLite. A base do SQL (tabelas, chaves, "
    "filtros, agrupamentos e junções) é a mesma em qualquer banco "
    "relacional, mas detalhes como funções de data, concatenação de "
    "texto e tipos mudam entre SQLite, PostgreSQL e MySQL: nos "
    "exercícios, escreva no jeito do SQLite. "
)
MARCO = "## 1. A tabela guarda um tipo de coisa"
AVISO = "\n".join([
    '## Em qual banco os exercícios rodam',
    '',
    'Os exercícios desta trilha rodam em **SQLite**. O que você aprende aqui (tabelas, chaves, `SELECT`, `WHERE`, `JOIN`, `GROUP BY`) vale em qualquer banco relacional, mas alguns detalhes mudam de um banco para outro:',
    '',
    '- **Juntar textos:** no SQLite e no PostgreSQL é `nome || \' \' || sobrenome`. No MySQL, o `||` vira "ou" lógico, e o certo é `CONCAT(nome, \' \', sobrenome)`.',
    "- **Data de hoje:** `date('now')` no SQLite, `CURRENT_DATE` no PostgreSQL e `CURDATE()` no MySQL.",
    '- **id automático:** no SQLite, `INTEGER PRIMARY KEY` já gera o número sozinho. O PostgreSQL usa `GENERATED ALWAYS AS IDENTITY` (ou `SERIAL`), e o MySQL, `AUTO_INCREMENT`.',
    '- **Tipos:** o SQLite aceita um texto numa coluna `INTEGER` sem reclamar, e o PostgreSQL recusa. Por isso, aqui, as restrições (`NOT NULL`, `UNIQUE`, `CHECK`) fazem ainda mais diferença.',
    '',
    'Se você já conhece outro banco, escreva os exercícios no jeito do SQLite.',
])


def avisar_sqlite(apps, schema_editor):
    Trilha = apps.get_model("trilhas", "Trilha")
    Aula = apps.get_model("trilhas", "Aula")

    trilha = Trilha.objects.filter(slug="banco-de-dados").first()
    if trilha is None:
        return
    if SOBRE_VELHO in trilha.sobre:
        trilha.sobre = trilha.sobre.replace(SOBRE_VELHO, SOBRE_NOVO)
        trilha.save(update_fields=["sobre"])

    aula = Aula.objects.filter(trilha=trilha, slug="modelagem-e-tabelas").first()
    if aula is None or "## Em qual banco" in aula.conteudo or MARCO not in aula.conteudo:
        return
    aula.conteudo = aula.conteudo.replace(MARCO, AVISO + "\n\n" + MARCO, 1)
    aula.save(update_fields=["conteudo"])


class Migration(migrations.Migration):

    dependencies = [
        ("trilhas", "0012_conteudo_anterior"),
    ]

    operations = [
        migrations.RunPython(avisar_sqlite, migrations.RunPython.noop),
    ]
