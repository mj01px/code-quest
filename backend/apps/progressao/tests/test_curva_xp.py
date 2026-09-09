"""A curva de XP não é livre: ela é calibrada contra os limiares de evolução.

Os níveis 10 e 25 são os que a gamificação usa em STAGE_MIN_LEVELS para trocar
o estágio da criatura. Recalibrar a curva sem olhar para eles muda o momento em
que a criatura evolui, que é a recompensa mais visível da plataforma.
"""

from django.test import TestCase

from apps.progressao.models import Nivel
from apps.progressao.services import nivel_para_xp


class CurvaDeNivelTest(TestCase):
    def test_seed_criou_a_tabela_inteira(self):
        self.assertEqual(Nivel.objects.count(), 30)

    def test_nivel_um_comeca_do_zero(self):
        self.assertEqual(Nivel.objects.get(numero=1).xp_necessario, 0)

    def test_limiares_batem_com_os_estagios_da_criatura(self):
        self.assertEqual(Nivel.objects.get(numero=10).xp_necessario, 4500)
        self.assertEqual(Nivel.objects.get(numero=25).xp_necessario, 30000)

    def test_xp_resolve_para_o_nivel_certo(self):
        casos = {
            0: 1,
            99: 1,
            100: 2,
            4499: 9,
            4500: 10,
            29999: 24,
            30000: 25,
        }
        for xp, esperado in casos.items():
            with self.subTest(xp=xp):
                self.assertEqual(nivel_para_xp(xp).numero, esperado)

    def test_xp_acima_do_teto_trava_no_ultimo_nivel(self):
        self.assertEqual(nivel_para_xp(999_999).numero, 30)

    def test_curva_e_estritamente_crescente(self):
        valores = list(Nivel.objects.order_by("numero").values_list("xp_necessario", flat=True))
        self.assertEqual(valores, sorted(set(valores)))