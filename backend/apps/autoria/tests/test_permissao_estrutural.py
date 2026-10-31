"""Varredura do namespace de autoria, inclusive das views futuras.

A opção de namespace isolado foi escolhida por causa deste teste: aqui não há
view legitimamente pública, então dá para exigir a permissão em todas elas.
Em `apps.trilhas` isso seria impossível, porque três views de lá são `AllowAny`.

A varredura inspeciona **comportamento** (`get_permissions()`, `get_throttles()`)
e não os atributos de classe: uma view que sobrescreva esses métodos passaria
por uma leitura de atributo sem que o atributo valha nada em runtime.
"""

from django.test import TestCase
from django.urls import get_resolver
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle

PREFIXO = "apps.autoria"

# Permissão exigida por rota. Rota nova sem entrada aqui reprova a varredura:
# a falta de mapeamento é tratada como falta de permissão.
PERMISSAO_POR_ROTA = {
    "solucao-autor": "HasPerm[trilhas.view_solution]",
    "submeter": "HasPerm[trilhas.submit_review]",
    "aprovar": "HasPerm[trilhas.review]",
    "devolver": "HasPerm[trilhas.review]",
    # O autor publica o próprio conteúdo aprovado; o dono é cobrado no serviço.
    "publicar": "HasAnyPerm[trilhas.publish,trilhas.submit_review]",
    "rascunhos": "HasPerm[trilhas.submit_review]",
    "aprovados": "HasPerm[trilhas.submit_review]",
    "fila-revisao": "HasPerm[trilhas.review]",
    "meus-envios": "HasPerm[trilhas.submit_review]",
    "detalhe": "HasAnyPerm[trilhas.submit_review,trilhas.review]",
    "criar-trilha": "HasPerm[trilhas.create,trilhas.create_trilha]",
    "criar-aula": "HasPerm[trilhas.create,trilhas.create_aula]",
    "criar-exercicio": "HasPerm[trilhas.create,trilhas.create_exercicio]",
    "rascunho": "HasPerm[trilhas.create]",
    "criar-flashcard": "HasPerm[trilhas.create]",
    "flashcard": "HasPerm[trilhas.create]",
    "criar-questao": "HasPerm[trilhas.create,trilhas.create_exercicio]",
    "questao": "HasPerm[trilhas.create]",
    "admin-solicitacoes": "HasPerm[usuarios.grant_author]",
    "admin-solicitacao-aprovar": "HasPerm[usuarios.grant_author]",
    "admin-solicitacao-rejeitar": "HasPerm[usuarios.grant_author]",
    # Pedir autoria é de qualquer conta logada: o login é a permissão.
    "solicitacoes": "IsAuthenticated",
    "minha-solicitacao": "IsAuthenticated",
}


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

    def test_toda_view_exige_autenticacao_e_a_permissao_da_rota(self):
        for nome, cls in self.views:
            with self.subTest(rota=nome):
                classes = [type(p) for p in cls().get_permissions()]
                nomes = [c.__name__ for c in classes]

                self.assertIn(nome, PERMISSAO_POR_ROTA)
                self.assertIn(IsAuthenticated, classes)
                self.assertIn(PERMISSAO_POR_ROTA[nome], nomes)

    def test_nenhuma_view_e_publica(self):
        for nome, cls in self.views:
            with self.subTest(rota=nome):
                nomes = [type(p).__name__ for p in cls().get_permissions()]

                self.assertNotIn("AllowAny", nomes)

    def test_toda_view_usa_throttle_de_escopo_proprio(self):
        # `throttle_scope` sozinho é decoração: só `ScopedRateThrottle` o lê.
        # Sem a classe, a view cai no balde `user`, compartilhado com a API
        # inteira, exatamente o que o escopo existe para impedir.
        for nome, cls in self.views:
            with self.subTest(rota=nome):
                classes = [type(t) for t in cls().get_throttles()]

                self.assertEqual(classes, [ScopedRateThrottle])
                esperado = "autoria" if nome == "solucao-autor" else "editorial"
                self.assertEqual(cls.throttle_scope, esperado)
