"""Varredura do namespace de autoria, inclusive das views futuras.

A opção de namespace isolado foi escolhida por causa deste teste: aqui não há
view legitimamente pública, então dá para exigir a permissão em todas elas.
Em `apps.trilhas` isso seria impossível — três views de lá são `AllowAny`.

A varredura inspeciona **comportamento** (`get_permissions()`, `get_throttles()`)
e não os atributos de classe: uma view que sobrescreva esses métodos passaria
por uma leitura de atributo sem que o atributo valha nada em runtime.
"""

from django.test import TestCase
from django.urls import get_resolver
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle

PREFIXO = "apps.autoria"


def views_de_autoria():
    """Toda view de `apps.autoria`, registrada onde quer que seja.

    Varre a URLconf do projeto, e não `apps.autoria.urls`: uma view daqui
    pendurada em outro módulo de urls é justamente o atalho que escaparia.
    """
    achadas = []
    for rota in get_resolver().url_patterns:
        achadas.extend(_descer(rota))
    return achadas


def _descer(no):
    padroes = getattr(no, "url_patterns", None)
    if padroes is not None:
        return [v for filho in padroes for v in _descer(filho)]

    cls = getattr(no.callback, "cls", None)
    if cls is not None and cls.__module__.startswith(PREFIXO):
        return [(no.name, cls)]
    return []


class TodaViewDeAutoriaExigePermissaoTest(TestCase):
    def setUp(self):
        self.views = views_de_autoria()

    def test_ha_views_para_varrer(self):
        # Se a varredura parar de achar views, os testes abaixo passam vazios.
        self.assertGreaterEqual(len(self.views), 1)

    def test_toda_view_exige_autenticacao_e_permissao_de_solucao(self):
        for nome, cls in self.views:
            with self.subTest(rota=nome):
                classes = [type(p) for p in cls().get_permissions()]
                nomes = [c.__name__ for c in classes]

                self.assertIn(IsAuthenticated, classes)
                self.assertIn("HasPerm[trilhas.view_solution]", nomes)

    def test_nenhuma_view_e_publica(self):
        for nome, cls in self.views:
            with self.subTest(rota=nome):
                nomes = [type(p).__name__ for p in cls().get_permissions()]

                self.assertNotIn("AllowAny", nomes)

    def test_toda_view_usa_throttle_de_escopo_proprio(self):
        # `throttle_scope` sozinho é decoração: só `ScopedRateThrottle` o lê.
        # Sem a classe, a view cai no balde `user`, compartilhado com a API
        # inteira — exatamente o que o escopo existe para impedir.
        for nome, cls in self.views:
            with self.subTest(rota=nome):
                classes = [type(t) for t in cls().get_throttles()]

                self.assertEqual(classes, [ScopedRateThrottle])
                self.assertEqual(cls.throttle_scope, "autoria")
