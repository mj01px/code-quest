"""Requisições simultâneas de verdade, cada thread com sua conexão."""

import threading

from django.core.exceptions import ValidationError
from django.db import connection
from django.test import TransactionTestCase, override_settings
from rest_framework.exceptions import PermissionDenied

from apps.auditoria.models import RegistroDeAuditoria
from apps.clas.models import Cargo, Cla, MembroDoCla
from apps.clas.services import entrar_no_cla, transferir_lideranca
from apps.clas.tests.helpers import dar_nivel, montar_cla
from apps.contas.models import User
from apps.contas.tests.helpers import criar_aluno


def ao_mesmo_tempo(*chamadas):
    """Roda as chamadas em paralelo e devolve "ok" ou o código do erro de cada uma."""
    largada = threading.Barrier(len(chamadas))
    resultados = [None] * len(chamadas)

    def rodar(indice, chamada):
        try:
            largada.wait()
            chamada()
            resultados[indice] = "ok"
        except (ValidationError, PermissionDenied) as erro:
            resultados[indice] = getattr(erro, "code", None) or erro.get_codes()
        finally:
            connection.close()

    threads = [
        threading.Thread(target=rodar, args=(i, c)) for i, c in enumerate(chamadas)
    ]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=30)
    return sorted(resultados)


class ConcorrenciaTest(TransactionTestCase):
    def _fixture_teardown(self):
        # sem flush: ele apagaria níveis, criaturas e RBAC semeados no banco
        # de teste, que é reaproveitado entre execuções (--reuse-db)
        Cla.objects.all().delete()
        RegistroDeAuditoria.objects.all().delete()
        User.objects.filter(email__endswith="@example.com").delete()

    def _aluno(self, nickname, nivel=5):
        user = criar_aluno(nickname)
        dar_nivel(user, nivel)
        return user

    @override_settings(CLA_LIMITE_MEMBROS=2)
    def test_duas_entradas_na_ultima_vaga(self):
        cla = montar_cla(criar_aluno("conc_lider"))
        a, b = self._aluno("conc_a"), self._aluno("conc_b")

        resultados = ao_mesmo_tempo(
            lambda: entrar_no_cla(user=a, tag=cla.tag),
            lambda: entrar_no_cla(user=b, tag=cla.tag),
        )

        self.assertEqual(resultados, ["cla_cheio", "ok"])
        self.assertEqual(cla.membros.count(), 2)

    def test_mesmo_usuario_em_dois_clas(self):
        cla1 = montar_cla(criar_aluno("conc_lider1"))
        cla2 = montar_cla(criar_aluno("conc_lider2"), nome="Outro")
        user = self._aluno("conc_user")

        resultados = ao_mesmo_tempo(
            lambda: entrar_no_cla(user=user, tag=cla1.tag),
            lambda: entrar_no_cla(user=user, tag=cla2.tag),
        )

        self.assertEqual(resultados, ["ja_em_cla", "ok"])
        self.assertEqual(MembroDoCla.objects.filter(user=user).count(), 1)

    def test_duas_transferencias_ao_mesmo_tempo(self):
        lider = criar_aluno("conc_lider")
        cla = montar_cla(lider)
        a = MembroDoCla.objects.create(cla=cla, user=criar_aluno("conc_a"))
        b = MembroDoCla.objects.create(cla=cla, user=criar_aluno("conc_b"))

        resultados = ao_mesmo_tempo(
            lambda: transferir_lideranca(user=lider, tag=cla.tag, membro_id=a.pk),
            lambda: transferir_lideranca(user=lider, tag=cla.tag, membro_id=b.pk),
        )

        self.assertEqual(resultados, ["cargo_insuficiente", "ok"])
        self.assertEqual(cla.membros.filter(cargo=Cargo.LIDER).count(), 1)
        self.assertEqual(
            cla.membros.get(user=lider).cargo, Cargo.COLIDER
        )
