from contextlib import redirect_stdout
from datetime import date, timedelta
from io import StringIO
from typing import Any

from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.contas.tests.helpers import criar_aluno
from apps.correcao.models import EspecificacaoDeCodigo
from apps.progressao.models import EventoXP, Origem
from apps.progressao.sequencia import exigir_liberado
from apps.progressao.services import progresso_das_trilhas, trilha_atual
from apps.trilhas.desafios import desafio_do_dia, desafios_publicados
from apps.trilhas.management.commands.seed_desafios import (
    DESAFIOS,
    TRILHA_DOS_DESAFIOS,
)
from apps.trilhas.models import Exercicio, Tipo, Trilha


def _semear() -> None:
    with redirect_stdout(StringIO()):
        call_command("seed_desafios")


def _executar(solucao: str, funcao: str, *argumentos: Any) -> Any:
    escopo: dict[str, Any] = {}
    exec(solucao, escopo)
    return escopo[funcao](*argumentos)


class SeedDesafiosTest(TestCase):
    def setUp(self) -> None:
        _semear()

    def test_publica_cinco_desafios_de_codigo_com_editor(self) -> None:
        desafios = list(desafios_publicados())

        self.assertEqual(len(desafios), 5)
        self.assertTrue(all(d.tipo == Tipo.CODIGO for d in desafios))
        self.assertEqual(
            EspecificacaoDeCodigo.objects.filter(exercicio__in=desafios).count(), 5
        )

    def test_rodar_de_novo_nao_duplica(self) -> None:
        _semear()

        self.assertEqual(Trilha.objects.filter(slug=TRILHA_DOS_DESAFIOS).count(), 1)
        self.assertEqual(
            Exercicio.objects.filter(trilha__slug=TRILHA_DOS_DESAFIOS).count(), 5
        )

    def test_solucoes_de_referencia_batem_com_os_exemplos(self) -> None:
        exemplos = {
            "palindromo": (("Ame a ema",), True),
            "fizzbuzz": ((5,), ["1", "2", "Fizz", "4", "Buzz"]),
            "contar-vogais": (("Programação",), 5),
            "maior-sem-max": (([3, 9, 2],), 9),
            "relogio-digital": ((3725,), "01:02:05"),
        }
        for dados in DESAFIOS:
            argumentos, esperado = exemplos[dados["slug"]]
            with self.subTest(dados["slug"]):
                self.assertEqual(
                    _executar(dados["solucao_autor"], dados["funcao"], *argumentos),
                    esperado,
                )


class DesafioDoDiaTest(TestCase):
    def setUp(self) -> None:
        _semear()

    def test_um_por_dia_em_rodizio(self) -> None:
        inicio = date(2026, 11, 4)
        cinco_dias = [desafio_do_dia(inicio + timedelta(days=i)) for i in range(5)]

        self.assertEqual(len({d.slug for d in cinco_dias if d}), 5)
        self.assertEqual(desafio_do_dia(inicio), desafio_do_dia(inicio + timedelta(5)))

    def test_sem_desafios_devolve_nulo(self) -> None:
        Exercicio.objects.filter(trilha__slug=TRILHA_DOS_DESAFIOS).delete()

        resposta = APIClient().get(reverse("trilhas:desafio-de-hoje"))

        self.assertEqual(resposta.status_code, 200)
        self.assertIsNone(resposta.data["desafio"])

    def test_hoje_traz_os_proximos_quatro_dias_do_rodizio(self) -> None:
        resposta = APIClient().get(reverse("trilhas:desafio-de-hoje"))

        proximos = resposta.data["proximos"]
        hoje = date.fromisoformat(resposta.data["dia"])
        self.assertEqual(len(proximos), 4)
        self.assertEqual(
            [p["dia"] for p in proximos],
            [str(hoje + timedelta(days=i)) for i in range(1, 5)],
        )
        slugs = {resposta.data["desafio"]["slug"], *(p["slug"] for p in proximos)}
        self.assertEqual(len(slugs), 5)
        amanha = desafio_do_dia(hoje + timedelta(days=1))
        self.assertEqual(proximos[0]["slug"], amanha.slug if amanha else None)

    def test_endpoint_de_hoje_e_lista(self) -> None:
        hoje = APIClient().get(reverse("trilhas:desafio-de-hoje"))
        lista = APIClient().get(reverse("trilhas:desafios"))

        self.assertEqual(hoje.status_code, 200)
        self.assertEqual(hoje.data["desafio"]["trilha_slug"], TRILHA_DOS_DESAFIOS)
        self.assertEqual(len(lista.data), 5)


class DesacoplamentoTest(TestCase):
    def setUp(self) -> None:
        _semear()
        self.aluno = criar_aluno()
        self.desafio = Exercicio.objects.select_related("trilha", "aula").get(
            trilha__slug=TRILHA_DOS_DESAFIOS, slug="relogio-digital"
        )

    def test_fica_fora_do_catalogo(self) -> None:
        resposta = APIClient().get(reverse("trilhas:trilha-lista"))

        slugs = [t["slug"] for t in resposta.data]
        self.assertNotIn(TRILHA_DOS_DESAFIOS, slugs)

    def test_qualquer_desafio_esta_liberado(self) -> None:
        with self.settings(PROGRESSAO_SEQUENCIAL=True):
            exigir_liberado(
                user=self.aluno,
                trilha=self.desafio.trilha,
                tipo="EXERCICIO",
                aula_slug=self.desafio.aula.slug,
                exercicio_slug=self.desafio.slug,
            )

    def test_nao_vira_trilha_atual_nem_progresso(self) -> None:
        EventoXP.objects.create(
            user=self.aluno, exercicio=self.desafio, origem=Origem.EXERCICIO, xp=50
        )

        self.assertIsNone(trilha_atual(user=self.aluno))
        self.assertEqual(progresso_das_trilhas(user=self.aluno), [])
