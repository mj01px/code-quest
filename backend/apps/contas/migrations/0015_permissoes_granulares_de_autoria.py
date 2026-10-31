"""Cria as permissões granulares de criação e a de excluir publicado.

Todo nível que já cria conteúdo (`trilhas.create`) ganha as três granulares:
sem isso, autores atuais perderiam a criação no deploy. A exclusão de
publicado vai só para o nível de sistema Admin. Nada é removido.
"""

from django.db import migrations

GRANULARES = (
    "trilhas.create_trilha",
    "trilhas.create_aula",
    "trilhas.create_exercicio",
)
EXCLUIR_PUBLICADO = "trilhas.delete_published"


def sincronizar(apps, schema_editor):
    from apps.contas.rbac import CATALOG

    Permissao = apps.get_model("contas", "Permissao")
    NivelDeAcesso = apps.get_model("contas", "NivelDeAcesso")

    por_codename = {}
    for ordem, spec in enumerate(CATALOG):
        permissao, _ = Permissao.objects.update_or_create(
            codename=spec.codename,
            defaults={"rotulo": spec.label, "modulo": spec.module, "ordem": ordem},
        )
        por_codename[spec.codename] = permissao

    granulares = [por_codename[c] for c in GRANULARES]
    for nivel in NivelDeAcesso.objects.filter(permissoes__codename="trilhas.create"):
        nivel.permissoes.add(*granulares)

    admin = NivelDeAcesso.objects.filter(nome="Admin", sistema=True).first()
    if admin is not None:
        admin.permissoes.add(por_codename[EXCLUIR_PUBLICADO])


def desfazer(apps, schema_editor):
    Permissao = apps.get_model("contas", "Permissao")
    Permissao.objects.filter(codename__in=[*GRANULARES, EXCLUIR_PUBLICADO]).delete()


class Migration(migrations.Migration):
    dependencies = [("contas", "0014_nivel_de_acesso_help_text")]
    operations = [migrations.RunPython(sincronizar, desfazer)]
