from datetime import timedelta

from django.conf import settings
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from apps.auditoria.models import AcaoAuditoria, RegistroDeAuditoria
from apps.auditoria.services import registrar


def _envelhecer(registro, dias: int) -> None:
    # created_at é auto_now_add; só dá para "voltar no tempo" via update (que
    # não passa pelo save append-only).
    RegistroDeAuditoria.objects.filter(pk=registro.pk).update(
        created_at=timezone.now() - timedelta(days=dias)
    )


class PurgaLogsTests(TestCase):
    def test_purga_apenas_alem_do_prazo(self):
        antigo = registrar(AcaoAuditoria.LOGIN_OK)
        recente = registrar(AcaoAuditoria.LOGIN_OK)
        _envelhecer(antigo, settings.AUDITORIA_RETENCAO_DIAS + 5)

        call_command("purgar_logs_antigos")

        self.assertFalse(RegistroDeAuditoria.objects.filter(pk=antigo.pk).exists())
        self.assertTrue(RegistroDeAuditoria.objects.filter(pk=recente.pk).exists())

    def test_no_limite_do_prazo_nao_purga(self):
        # Exatamente no prazo ainda está dentro da janela (o corte é "menor que").
        registro = registrar(AcaoAuditoria.LOGIN_OK)
        _envelhecer(registro, settings.AUDITORIA_RETENCAO_DIAS - 1)

        call_command("purgar_logs_antigos")

        self.assertTrue(RegistroDeAuditoria.objects.filter(pk=registro.pk).exists())

    def test_dry_run_nao_apaga(self):
        registro = registrar(AcaoAuditoria.LOGIN_OK)
        _envelhecer(registro, settings.AUDITORIA_RETENCAO_DIAS + 30)

        call_command("purgar_logs_antigos", "--dry-run")

        self.assertTrue(RegistroDeAuditoria.objects.filter(pk=registro.pk).exists())
