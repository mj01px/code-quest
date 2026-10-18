"""Sequencia diaria ligada ao credito real de XP."""

from datetime import date, datetime
from unittest import mock
from zoneinfo import ZoneInfo

from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.contas.tests.helpers import criar_aluno
from apps.gamificacao.models import UserCreature
from apps.gamificacao.services import select_starter_creature
from apps.progressao.models import EventoXP, Sequencia
from apps.progressao.services import creditar_exercicio, ler_sequencia

from .test_credito_xp import criar_exercicio


class SequenciaTest(TestCase):
    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)
        self.user = criar_aluno()
        select_starter_creature(user=self.user, creature_slug="shellby")

    def creditar(self, slug, dia):
        with mock.patch(
            "apps.progressao.services.timezone.localdate", return_value=dia
        ):
            return creditar_exercicio(
                user=self.user, exercicio=criar_exercicio(slug=slug)
            )

    def test_primeira_conclusao_cria_sequencia(self):
        resultado = self.creditar("primeiro", date(2026, 10, 13))
        sequencia = Sequencia.objects.get(user=self.user)

        self.assertEqual(EventoXP.objects.filter(user=self.user).count(), 1)
        self.assertEqual((sequencia.atual, sequencia.recorde), (1, 1))
        self.assertEqual(sequencia.ultimo_dia, date(2026, 10, 13))
        self.assertEqual(
            resultado.sequencia, {"atual": 1, "recorde": 1, "aumentou": True}
        )

    def test_dia_seguinte_soma_um(self):
        self.creditar("primeiro", date(2026, 10, 13))
        resultado = self.creditar("segundo", date(2026, 10, 14))

        self.assertEqual(
            resultado.sequencia, {"atual": 2, "recorde": 2, "aumentou": True}
        )

    def test_segunda_conclusao_no_mesmo_dia_nao_soma(self):
        self.creditar("primeiro", date(2026, 10, 13))
        resultado = self.creditar("segundo", date(2026, 10, 13))

        self.assertEqual(
            resultado.sequencia, {"atual": 1, "recorde": 1, "aumentou": False}
        )

    def test_dia_perdido_reinicia_e_preserva_recorde(self):
        self.creditar("primeiro", date(2026, 10, 11))
        self.creditar("segundo", date(2026, 10, 12))
        resultado = self.creditar("terceiro", date(2026, 10, 14))

        self.assertEqual(
            resultado.sequencia, {"atual": 1, "recorde": 2, "aumentou": True}
        )

    def test_repetir_exercicio_nao_altera_sequencia(self):
        exercicio = criar_exercicio(slug="primeiro")
        with mock.patch(
            "apps.progressao.services.timezone.localdate",
            return_value=date(2026, 10, 13),
        ):
            creditar_exercicio(user=self.user, exercicio=exercicio)
        with mock.patch(
            "apps.progressao.services.timezone.localdate",
            return_value=date(2026, 10, 14),
        ):
            repeticao = creditar_exercicio(user=self.user, exercicio=exercicio)

        self.assertTrue(repeticao.ja_concluido)
        self.assertEqual(
            repeticao.sequencia, {"atual": 1, "recorde": 1, "aumentou": False}
        )
        self.assertEqual(
            Sequencia.objects.get(user=self.user).ultimo_dia, date(2026, 10, 13)
        )

    def test_trocar_criatura_nao_troca_sequencia(self):
        self.creditar("primeiro", date(2026, 10, 13))
        outra = UserCreature.objects.create(
            user=self.user, creature_id="slyth", is_active=False
        )
        UserCreature.objects.filter(user=self.user, is_active=True).update(
            is_active=False
        )
        outra.is_active = True
        outra.save(update_fields=["is_active"])

        resultado = self.creditar("segundo", date(2026, 10, 14))
        self.assertEqual(resultado.sequencia["atual"], 2)
        self.assertEqual(Sequencia.objects.filter(user=self.user).count(), 1)

    def test_leitura_mantem_ontem_e_zera_anteontem(self):
        self.creditar("primeiro", date(2026, 10, 11))
        self.creditar("segundo", date(2026, 10, 12))
        with mock.patch(
            "apps.progressao.services.timezone.localdate",
            return_value=date(2026, 10, 13),
        ):
            ontem = ler_sequencia(user=self.user)
        with mock.patch(
            "apps.progressao.services.timezone.localdate",
            return_value=date(2026, 10, 14),
        ):
            anteontem = ler_sequencia(user=self.user)

        self.assertEqual(ontem["atual"], 2)
        self.assertFalse(ontem["feito_hoje"])
        self.assertEqual(anteontem["atual"], 0)
        self.assertEqual(anteontem["recorde"], 2)

    def test_feito_hoje_e_aluno_sem_historico(self):
        dia = date(2026, 10, 13)
        with mock.patch(
            "apps.progressao.services.timezone.localdate", return_value=dia
        ):
            self.assertEqual(
                ler_sequencia(user=self.user),
                {"atual": 0, "recorde": 0, "feito_hoje": False, "ultimo_dia": None},
            )
        self.creditar("primeiro", dia)
        with mock.patch(
            "apps.progressao.services.timezone.localdate", return_value=dia
        ):
            self.assertTrue(ler_sequencia(user=self.user)["feito_hoje"])

    def test_credito_antes_e_depois_da_meia_noite_local(self):
        fuso = ZoneInfo("America/Sao_Paulo")
        with timezone.override(fuso):
            with mock.patch(
                "apps.progressao.services.timezone.now",
                return_value=datetime(2026, 10, 13, 23, 59, tzinfo=fuso),
            ):
                antes = creditar_exercicio(
                    user=self.user, exercicio=criar_exercicio(slug="antes")
                )
            with mock.patch(
                "apps.progressao.services.timezone.now",
                return_value=datetime(2026, 10, 14, 0, 1, tzinfo=fuso),
            ):
                depois = creditar_exercicio(
                    user=self.user, exercicio=criar_exercicio(slug="depois")
                )

        self.assertEqual(antes.sequencia["atual"], 1)
        self.assertEqual(depois.sequencia["atual"], 2)

    def test_api_exige_login_e_responde_sem_historico(self):
        url = reverse("progressao:minha-sequencia")
        self.assertEqual(APIClient().get(url).status_code, 401)

        client = APIClient()
        client.force_authenticate(user=self.user)
        resposta = client.get(url)
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(
            resposta.data,
            {"atual": 0, "recorde": 0, "feito_hoje": False, "ultimo_dia": None},
        )

    def test_api_conclusao_informa_aumento_so_no_primeiro_credito_do_dia(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        primeiro = criar_exercicio(slug="primeiro")
        segundo = criar_exercicio(slug="segundo")

        def concluir(exercicio):
            return client.post(
                reverse(
                    "progressao:concluir-exercicio",
                    kwargs={
                        "trilha_slug": exercicio.trilha.slug,
                        "exercicio_slug": exercicio.slug,
                    },
                )
            )

        with mock.patch(
            "apps.progressao.services.timezone.localdate",
            return_value=date(2026, 10, 13),
        ):
            primeira = concluir(primeiro)
            segunda = concluir(segundo)
            repetida = concluir(primeiro)

        self.assertEqual(
            primeira.data["sequencia"], {"atual": 1, "recorde": 1, "aumentou": True}
        )
        self.assertEqual(
            segunda.data["sequencia"], {"atual": 1, "recorde": 1, "aumentou": False}
        )
        self.assertEqual(
            repetida.data["sequencia"], {"atual": 1, "recorde": 1, "aumentou": False}
        )
