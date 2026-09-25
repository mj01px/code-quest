"""Semeia o catálogo de permissões e os níveis de acesso embutidos.

O catálogo e o mapa papel→permissões vêm de `apps.contas.rbac` (fonte da verdade
em código). Aqui eles viram linhas: a tabela `Permissao`, três níveis de sistema
(Aluno, Autor, Admin) e o backfill de cada usuário para o nível do seu papel.
"""

from django.db import migrations

# nome do nível de sistema por papel + descrição
NIVEIS = {
    "ALUNO": ("Aluno", "Acesso padrão de quem estuda na plataforma."),
    "AUTOR": ("Autor", "Cria e edita conteúdo, além do acesso de aluno."),
    "ADMIN": ("Admin", "Acesso total: gestão, revisão e auditoria."),
}


def semear(apps, schema_editor):
    from apps.contas.rbac import CATALOG, ROLE_PERMISSIONS

    Permissao = apps.get_model("contas", "Permissao")
    NivelDeAcesso = apps.get_model("contas", "NivelDeAcesso")
    User = apps.get_model("contas", "User")

    por_codename = {}
    for ordem, spec in enumerate(CATALOG):
        permissao, _ = Permissao.objects.update_or_create(
            codename=spec.codename,
            defaults={"rotulo": spec.label, "modulo": spec.module, "ordem": ordem},
        )
        por_codename[spec.codename] = permissao

    for papel, (nome, descricao) in NIVEIS.items():
        nivel, _ = NivelDeAcesso.objects.update_or_create(
            nome=nome,
            defaults={"descricao": descricao, "sistema": True},
        )
        nivel.permissoes.set(
            [por_codename[c] for c in ROLE_PERMISSIONS.get(papel, frozenset())]
        )
        User.objects.filter(role=papel, nivel_de_acesso__isnull=True).update(
            nivel_de_acesso=nivel
        )


def desfazer(apps, schema_editor):
    NivelDeAcesso = apps.get_model("contas", "NivelDeAcesso")
    Permissao = apps.get_model("contas", "Permissao")
    User = apps.get_model("contas", "User")

    nomes = [nome for nome, _ in NIVEIS.values()]
    User.objects.filter(nivel_de_acesso__nome__in=nomes).update(nivel_de_acesso=None)
    NivelDeAcesso.objects.filter(nome__in=nomes, sistema=True).delete()
    Permissao.objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ("contas", "0007_niveldeacesso_permissao_user_nivel_de_acesso_and_more"),
    ]
    operations = [migrations.RunPython(semear, desfazer)]
