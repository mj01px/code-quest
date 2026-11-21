from datetime import timedelta
from io import StringIO

from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone

from apps.contas.lgpd import anonimizar_conta, descartar_contas_excluidas
from apps.contas.models import AceiteDeTermos, User
from apps.contas.tests.helpers import criar_aluno
from apps.progressao.models import EventoXP, Origem


@override_settings(
    CONTA_EXCLUIDA_RETENCAO_PROGRESSO_DIAS=365,
    CONTA_EXCLUIDA_RETENCAO_ACEITE_DIAS=365 * 5,
)
class DescarteDeContasExcluidasTests(TestCase):
    def _conta_excluida_ha(self, nickname: str, dias: int) -> User:
        usuario = criar_aluno(nickname)
        AceiteDeTermos.registrar_vigentes(usuario, ip="200.1.2.3")
        EventoXP.objects.create(user=usuario, xp=50, origem=Origem.AJUSTE)
        anonimizar_conta(usuario)
        User.objects.filter(pk=usuario.pk).update(
            anonymized_at=timezone.now() - timedelta(days=dias)
        )
        return usuario

    def test_dentro_do_prazo_nada_e_descartado(self):
        usuario = self._conta_excluida_ha("recente", dias=180)

        resultado = descartar_contas_excluidas()

        self.assertEqual(resultado.registros_de_progresso, 0)
        self.assertEqual(resultado.contas, 0)
        self.assertTrue(EventoXP.objects.filter(user=usuario).exists())

    def test_apos_um_ano_descarta_o_progresso_e_mantem_a_prova_de_aceite(self):
        usuario = self._conta_excluida_ha("antiga", dias=400)

        resultado = descartar_contas_excluidas()

        self.assertGreater(resultado.registros_de_progresso, 0)
        self.assertEqual(resultado.contas, 0)
        self.assertFalse(EventoXP.objects.filter(user=usuario).exists())
        self.assertTrue(User.objects.filter(pk=usuario.pk).exists())
        self.assertEqual(AceiteDeTermos.objects.filter(user=usuario).count(), 2)

    def test_apos_cinco_anos_descarta_a_conta_e_os_aceites(self):
        usuario = self._conta_excluida_ha("encerrada", dias=365 * 5 + 1)

        resultado = descartar_contas_excluidas()

        self.assertEqual(resultado.contas, 1)
        self.assertFalse(User.objects.filter(pk=usuario.pk).exists())
        self.assertFalse(AceiteDeTermos.objects.filter(user_id=usuario.pk).exists())

    def test_conta_ativa_nunca_e_descartada(self):
        ativo = criar_aluno("ativo")
        EventoXP.objects.create(user=ativo, xp=50, origem=Origem.AJUSTE)
        EventoXP.objects.filter(user=ativo).update(
            criado_em=timezone.now() - timedelta(days=365 * 10)
        )

        descartar_contas_excluidas()

        self.assertTrue(User.objects.filter(pk=ativo.pk).exists())
        self.assertTrue(EventoXP.objects.filter(user=ativo).exists())

    def test_simulacao_conta_sem_apagar(self):
        usuario = self._conta_excluida_ha("simulada", dias=365 * 6)

        resultado = descartar_contas_excluidas(simular=True)

        self.assertEqual(resultado.contas, 1)
        self.assertGreater(resultado.registros_de_progresso, 0)
        self.assertTrue(User.objects.filter(pk=usuario.pk).exists())
        self.assertTrue(EventoXP.objects.filter(user=usuario).exists())

    def test_comando_dry_run_relata_e_nao_apaga(self):
        usuario = self._conta_excluida_ha("comando", dias=400)
        saida = StringIO()

        call_command("limpar_contas_excluidas", "--dry-run", stdout=saida)

        self.assertIn("seriam descartados", saida.getvalue())
        self.assertTrue(EventoXP.objects.filter(user=usuario).exists())

    def test_comando_descarta(self):
        usuario = self._conta_excluida_ha("descartada", dias=400)
        saida = StringIO()

        call_command("limpar_contas_excluidas", stdout=saida)

        self.assertIn("descartados", saida.getvalue())
        self.assertFalse(EventoXP.objects.filter(user=usuario).exists())
