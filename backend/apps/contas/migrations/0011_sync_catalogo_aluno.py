"""Ressincroniza o catálogo com o `rbac.py` e concede os novos códigos de aluno
aos níveis de sistema.

Cria as permissões novas (iniciar trilha, concluir exercício, ver/adquirir/evoluir
criatura) e as ADICIONA aos níveis Aluno/Autor/Admin — sem remover nada, para
preservar edições feitas pelo admin.
"""

from django.db import migrations

# mesmos nomes de nível por papel usados no seed original
NIVEIS = {"ALUNO": "Aluno", "AUTOR": "Autor", "ADMIN": "Admin"}


def sincronizar(apps, schema_editor):
    from apps.contas.rbac import CATALOG, ROLE_PERMISSIONS

    Permissao = apps.get_model("contas", "Permissao")
    NivelDeAcesso = apps.get_model("contas", "NivelDeAcesso")

    por_codename = {}
    for ordem, spec in enumerate(CATALOG):
        permissao, _ = Permissao.objects.update_or_create(
            codename=spec.codename,
            defaults={"rotulo": spec.label, "modulo": spec.module, "ordem": ordem},
        )
        por_codename[spec.codename] = permissao

    for papel, nome in NIVEIS.items():
        nivel = NivelDeAcesso.objects.filter(nome=nome, sistema=True).first()
        if nivel is None:
            continue
        # add() é união: concede os códigos do papel sem tirar os já presentes.
        nivel.permissoes.add(
            *[por_codename[c] for c in ROLE_PERMISSIONS.get(papel, frozenset())]
        )


def desfazer(apps, schema_editor):
    # Sem rollback destrutivo: as permissões novas ficam. Remover os códigos de
    # aluno recém-criados dos níveis seria adivinhar o que era edição do admin.
    pass


class Migration(migrations.Migration):
    dependencies = [("contas", "0010_seed_acesso_admin")]
    operations = [migrations.RunPython(sincronizar, desfazer)]
