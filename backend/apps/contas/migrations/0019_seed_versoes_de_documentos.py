from datetime import date, datetime, time
from pathlib import Path

from django.db import migrations
from django.utils import timezone

PASTA = Path(__file__).resolve().parent.parent / "documentos_legais"

VERSOES = (
    ("TERMOS", "termos", "1.0", date(2026, 9, 8)),
    ("PRIVACIDADE", "privacidade", "1.0", date(2026, 9, 8)),
    ("TERMOS", "termos", "1.1", date(2026, 9, 25)),
    ("PRIVACIDADE", "privacidade", "1.1", date(2026, 9, 25)),
    ("TERMOS", "termos", "1.2", date(2026, 9, 26)),
    ("PRIVACIDADE", "privacidade", "1.2", date(2026, 9, 26)),
    ("TERMOS", "termos", "1.3", None),
    ("PRIVACIDADE", "privacidade", "1.3", None),
)


def semear(apps, schema_editor):
    from apps.contas.rbac import CATALOG

    VersaoDeDocumento = apps.get_model("contas", "VersaoDeDocumento")
    Permissao = apps.get_model("contas", "Permissao")
    NivelDeAcesso = apps.get_model("contas", "NivelDeAcesso")

    agora = timezone.now()
    for documento, arquivo, versao, vigente_desde in VERSOES:
        if vigente_desde is None:
            vigente_desde = timezone.localdate()
            publicado_em = agora
        else:
            publicado_em = timezone.make_aware(datetime.combine(vigente_desde, time()))
        VersaoDeDocumento.objects.get_or_create(
            documento=documento,
            versao=versao,
            defaults={
                "conteudo": (PASTA / f"{arquivo}-{versao}.md").read_text(encoding="utf-8"),
                "situacao": "PUBLICADA",
                "vigente_desde": vigente_desde,
                "publicado_em": publicado_em,
            },
        )

    for ordem, spec in enumerate(CATALOG):
        Permissao.objects.update_or_create(
            codename=spec.codename,
            defaults={"rotulo": spec.label, "modulo": spec.module, "ordem": ordem},
        )
    admin = NivelDeAcesso.objects.filter(nome="Admin", sistema=True).first()
    if admin is not None:
        admin.permissoes.add(Permissao.objects.get(codename="documentos.manage"))


def desfazer(apps, schema_editor):
    apps.get_model("contas", "VersaoDeDocumento").objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [("contas", "0018_versoes_de_documentos")]
    operations = [migrations.RunPython(semear, desfazer)]
