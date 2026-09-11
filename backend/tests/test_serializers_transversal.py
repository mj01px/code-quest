"""Nenhum serializer do projeto expõe a solução do autor, exceto o autorizado.

Esta varredura nasceu dentro de `apps/trilhas/tests/test_serializers.py` e só
olhava para `apps.trilhas.serializers`. Mora aqui agora porque a regra é do
projeto inteiro, não de uma app: `progressao`, `gamificacao` e `contas` também
serializam a partir de modelos que alcançam `Exercicio` por relação.

Três camadas, porque a allowlist de `Meta.fields` sozinha não segura:

1. `Meta.fields` — a allowlist declarada.
2. `Meta.exclude` e `fields = "__all__"` — proibidos: um campo novo no model
   viraria campo público sozinho.
3. Campos declarados na classe — um `SerializerMethodField` chamado `dica` que
   devolvesse `obj.solucao_autor` passa pelas duas primeiras intacto. Aqui
   qualquer campo cujo nome cite `solucao` ou `autor` precisa estar na
   allowlist, e o corpo do método `get_<campo>` é lido atrás do campo proibido.
"""

import importlib
import inspect
import pkgutil

from django.test import TestCase
from rest_framework import serializers as drf

import apps

CAMPOS_PROIBIDOS = frozenset({"solucao_autor", "status"})

# Palavras que fazem um campo declarado merecer inspeção do corpo do método.
SUSPEITAS = ("solucao", "autor")

# A única exceção autorizada do projeto. A rota de autoria existe justamente
# para serializar `solucao_autor`, sob `trilhas.view_solution`.
ALLOWLIST = frozenset({"apps.autoria.serializers.SolucaoAutorSerializer"})


def modulos_de_serializers():
    """Todo `serializers.py` sob `apps/`, importado."""
    encontrados = []
    for info in pkgutil.iter_modules(apps.__path__):
        if not info.ispkg:
            continue
        nome = f"apps.{info.name}.serializers"
        try:
            encontrados.append((nome, importlib.import_module(nome)))
        except ModuleNotFoundError:
            continue  # app sem serializers é caso normal, não falha
    return encontrados


def serializers_do_projeto():
    """Cada `Serializer` definido num módulo de serializers, com seu caminho.

    Filtra por `__module__` para não varrer duas vezes o que foi importado de
    outro módulo — e para que o caminho reportado seja onde a classe mora.
    """
    vistos = []
    for nome, modulo in modulos_de_serializers():
        for atributo in dir(modulo):
            obj = getattr(modulo, atributo)
            if not (isinstance(obj, type) and issubclass(obj, drf.BaseSerializer)):
                continue
            if obj.__module__ != nome:
                continue
            vistos.append((f"{nome}.{atributo}", obj))
    return vistos


def campos_declarados(serializer):
    """Campos declarados na classe, sem instanciar o serializer.

    Tem que sair de `_declared_fields`, e não de `vars(cls)`: a metaclasse do
    DRF **remove** os campos dos atributos de classe e os guarda ali. Varrer
    `vars` devolve dicionário vazio para todo serializer, e as asserções que
    dependem dele passam sem testar nada.
    """
    return dict(getattr(serializer, "_declared_fields", {}))


class VarreduraCobreOProjetoTest(TestCase):
    def test_acha_todos_os_modulos_de_serializers(self):
        nomes = {nome for nome, _ in modulos_de_serializers()}

        # Se um destes sumir da varredura, ela deixou de proteger uma app
        # inteira em silêncio.
        self.assertEqual(
            nomes,
            {
                "apps.autoria.serializers",
                "apps.contas.serializers",
                "apps.gamificacao.serializers",
                "apps.progressao.serializers",
                "apps.trilhas.serializers",
            },
        )

    def test_acha_uma_quantidade_plausivel_de_serializers(self):
        self.assertGreaterEqual(len(serializers_do_projeto()), 15)

    def test_a_varredura_enxerga_campos_declarados(self):
        # Guarda contra varredura vacuosa: `vars(cls)` devolveria vazio aqui,
        # porque a metaclasse do DRF move os campos para `_declared_fields`.
        # Sem esta asserção, as três camadas abaixo passariam sem testar nada.
        por_caminho = dict(serializers_do_projeto())
        alvo = por_caminho["apps.autoria.serializers.SolucaoAutorSerializer"]

        self.assertEqual(
            set(campos_declarados(alvo)),
            {"trilha_slug", "exercicio_slug", "status_editorial"},
        )

    def test_a_allowlist_aponta_para_classes_que_existem(self):
        caminhos = {caminho for caminho, _ in serializers_do_projeto()}

        # Allowlist com entrada morta vira permissão silenciosa para o próximo
        # serializer que herdar o nome.
        self.assertTrue(ALLOWLIST <= caminhos, ALLOWLIST - caminhos)


class NenhumSerializerVazaSolucaoTest(TestCase):
    def test_nenhuma_allowlist_declara_campo_proibido(self):
        for caminho, serializer in serializers_do_projeto():
            meta = getattr(serializer, "Meta", None)
            campos = getattr(meta, "fields", None)
            if not isinstance(campos, (list, tuple)):
                continue

            with self.subTest(serializer=caminho):
                proibidos = set(campos) & CAMPOS_PROIBIDOS
                if caminho in ALLOWLIST:
                    continue
                self.assertEqual(proibidos, set())

    def test_nenhum_serializer_usa_all_ou_exclude(self):
        for caminho, serializer in serializers_do_projeto():
            meta = getattr(serializer, "Meta", None)
            if meta is None:
                continue

            with self.subTest(serializer=caminho):
                # `__all__` faria um campo novo no model virar campo público
                # sozinho — inclusive na app de autoria.
                self.assertNotEqual(getattr(meta, "fields", None), "__all__")
                self.assertFalse(hasattr(meta, "exclude"))

    def test_nenhum_campo_declarado_cita_solucao_fora_da_allowlist(self):
        for caminho, serializer in serializers_do_projeto():
            if caminho in ALLOWLIST:
                continue

            for nome in campos_declarados(serializer):
                with self.subTest(serializer=caminho, campo=nome):
                    citado = any(p in nome.lower() for p in SUSPEITAS)
                    self.assertFalse(
                        citado,
                        f"{caminho}.{nome} cita solução/autor e não está na "
                        "allowlist. Se for legítimo, registre em ALLOWLIST.",
                    )

    def test_nenhum_metodo_de_campo_le_solucao_autor(self):
        # A camada que pega o `SerializerMethodField` disfarçado: o nome pode
        # ser inocente, mas o corpo do método não mente.
        for caminho, serializer in serializers_do_projeto():
            if caminho in ALLOWLIST:
                continue

            for nome, campo in campos_declarados(serializer).items():
                if not isinstance(campo, drf.SerializerMethodField):
                    continue

                metodo = getattr(serializer, campo.method_name or f"get_{nome}", None)
                if metodo is None:
                    continue

                with self.subTest(serializer=caminho, campo=nome):
                    corpo = inspect.getsource(metodo)
                    self.assertNotIn("solucao_autor", corpo)

    def test_nenhum_source_aponta_para_campo_proibido(self):
        # `serializers.CharField(source="solucao_autor")` com nome inocente é o
        # caminho mais curto de todos para o vazamento.
        for caminho, serializer in serializers_do_projeto():
            if caminho in ALLOWLIST:
                continue

            for nome, campo in campos_declarados(serializer).items():
                origem = getattr(campo, "source", None)
                if not isinstance(origem, str):
                    continue

                with self.subTest(serializer=caminho, campo=nome):
                    partes = set(origem.split("."))
                    self.assertEqual(partes & CAMPOS_PROIBIDOS, set())
