from typing import Any, cast

from rest_framework import serializers

from .models import CasoDeTeste, EspecificacaoDeCodigo
from .services import LIMITE_DE_CARACTERES, CasoJulgado, Correcao, codigo_aprovado


# Só valida a entrada; nunca serializa uma instância.
class EnvioDeCodigoSerializer(serializers.Serializer[None]):
    codigo = serializers.CharField(trim_whitespace=False, allow_blank=True)

class ExemploSerializer(serializers.ModelSerializer[CasoDeTeste]):
    class Meta:
        model = CasoDeTeste
        fields = ("ordem", "argumentos", "esperado", "erro_esperado")
        read_only_fields = fields

class EspecificacaoSerializer(serializers.ModelSerializer[EspecificacaoDeCodigo]):
    exemplos = serializers.SerializerMethodField()
    limite_de_caracteres = serializers.SerializerMethodField()
    codigo_aprovado = serializers.SerializerMethodField()

    class Meta:
        model = EspecificacaoDeCodigo
        fields = (
            "linguagem",
            "funcao",
            "codigo_inicial",
            "requisitos",
            "limite_de_caracteres",
            "codigo_aprovado",
            "exemplos",
        )
        read_only_fields = fields

    # Any e o valor JSON de cada campo; o drf-spectacular le esta anotacao e
    # com `object` publicaria `exemplos` como string no schema.
    def get_exemplos(self, obj: EspecificacaoDeCodigo) -> list[dict[str, Any]]:
        visiveis = [c for c in obj.casos.all() if c.visivel]
        # many=True devolve ReturnList em runtime; o stub tipa `.data` como
        # ReturnDict para qualquer Serializer.
        return cast(list[dict[str, Any]], ExemploSerializer(visiveis, many=True).data)

    def get_limite_de_caracteres(self, obj: EspecificacaoDeCodigo) -> int:
        return LIMITE_DE_CARACTERES

    def get_codigo_aprovado(self, obj: EspecificacaoDeCodigo) -> str:
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            return ""
        return codigo_aprovado(user=request.user, exercicio=obj.exercicio_id)





class ResultadoDoCasoSerializer(serializers.Serializer[CasoJulgado]):
    ordem = serializers.IntegerField(read_only=True)
    visivel = serializers.BooleanField(read_only=True)
    passou = serializers.BooleanField(read_only=True)
    argumentos = serializers.JSONField(read_only=True, required=False)
    esperado = serializers.JSONField(read_only=True, required=False)
    erro_esperado = serializers.CharField(read_only=True, required=False)
    obtido = serializers.JSONField(read_only=True, required=False)
    erro = serializers.CharField(read_only=True, required=False)


class CorrecaoSerializer(serializers.Serializer[Correcao]):
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
