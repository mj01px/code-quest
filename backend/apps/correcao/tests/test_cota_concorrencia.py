"""RNF17: o teto diário por usuário segura requisições simultâneas.

Sem a trava, as threads leriam o mesmo total de chamadas do dia e passariam
juntas pelo teto. Com ela, só a primeira reserva a chamada.
"""

from django.test import TransactionTestCase, override_settings

from apps.contas.models import User
from apps.contas.tests.helpers import ao_mesmo_tempo, criar_aluno
from apps.correcao.excecoes import CotaDoUsuarioEsgotada
from apps.correcao.models import Modo, Submissao
from apps.correcao.services import _reservar_chamada
from apps.trilhas.models import Aula, Exercicio, StatusEditorial, Trilha


@override_settings(JUDGE0_LIMITE_POR_USUARIO=1, JUDGE0_LIMITE_DIARIO=1000)
class CotaSimultaneaTest(TransactionTestCase):
    def _fixture_teardown(self):
        # sem flush: ele apagaria o catálogo semeado (--reuse-db)
        Submissao.objects.filter(user__nickname="cota_conc").delete()
        Trilha.objects.filter(slug="cota-conc").delete()
        User.objects.filter(email__endswith="@example.com").delete()

    def test_so_uma_chamada_passa_pelo_teto(self):
        user = criar_aluno("cota_conc")
        trilha = Trilha.objects.create(
            slug="cota-conc", nome="Cota", descricao="x",
            status=StatusEditorial.PUBLICADO,
        )
        aula = Aula.objects.create(
            trilha=trilha, slug="a", titulo="A", conteudo="x",
            status=StatusEditorial.PUBLICADO,
        )
        exercicio = Exercicio.objects.create(
            aula=aula, slug="e", titulo="E", enunciado="x",
            status=StatusEditorial.PUBLICADO,
        )

        resultados = ao_mesmo_tempo(
            lambda: _reservar_chamada(
                Submissao(user=user, exercicio=exercicio, modo=Modo.EXECUTAR, codigo="x")
            )
        )

        self.assertEqual(resultados.count(None), 1)
        self.assertEqual(
            sum(isinstance(r, CotaDoUsuarioEsgotada) for r in resultados), 4
        )
        self.assertEqual(Submissao.objects.filter(user=user).count(), 1)
