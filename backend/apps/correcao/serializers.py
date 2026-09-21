from rest_framework import serializers
from .models import CasoDeTeste, EspecificacaoDeCodigo
from .services import LIMITE_DE_CARACTERES


class EnvioDeCodigoSerializer(serializers.Serializer):
    codigo = serializers.CharField(trim_whitespace=False, allow_blank=True)

class ExemploSerializer(serializers.ModelSerializer):
    class Meta:
        model = CasoDeTeste
        fields = ("ordem", "argumentos", "esperado", "erro_esperado")
        read_only_fields = fields

class EspecificacaoSerializer(serializers.ModelSerializer):
    exemplos = serializers.SerializerMethodField()
    limite_de_caracteres = serializers.SerializerMethodField()

    class Meta:
        model = EspecificacaoDeCodigo
        fields = (
            "linguagem",
            "funcao",
            "codigo_inicial",
            "requisitos",
            "limite_de_caracteres",
            "exemplos",
        )
        read_only_fields = fields

    def get_exemplos(self, obj) -> list[dict]:
        visiveis = [c for c in obj.casos.all() if c.visivel]
        return ExemploSerializer(visiveis, many=True).data

    def get_limite_de_caracteres(self, obj) -> int:
        return LIMITE_DE_CARACTERES



class ResultadoDoCasoSerializer(serializers.Serializer):
    ordem = serializers.IntegerField(read_only=True)
    visivel = serializers.BooleanField(read_only=True)
    passou = serializers.BooleanField(read_only=True)
    argumentos = serializers.JSONField(read_only=True, required=False)
    esperado = serializers.JSONField(read_only=True, required=False)
    erro_esperado = serializers.CharField(read_only=True, required=False)
    obtido = serializers.JSONField(read_only=True, required=False)
    erro = serializers.CharField(read_only=True, required=False)


class CorrecaoSerializer(serializers.Serializer):
    modo = serializers.CharField(read_only=True)
    veredito = serializers.CharField(read_only=True)
    aprovado = serializers.BooleanField(read_only=True)
    aprovados = serializers.IntegerField(read_only=True)
    total = serializers.IntegerField(read_only=True)
    casos = ResultadoDoCasoSerializer(many=True, read_only=True)
    saida = serializers.CharField(read_only=True)
    erro = serializers.CharField(read_only=True)
    tempo = serializers.FloatField(read_only=True, allow_null=True)
    memoria = serializers.IntegerField(read_only=True, allow_null=True)