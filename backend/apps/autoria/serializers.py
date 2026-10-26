from rest_framework import serializers

from apps.trilhas.models import Exercicio, StatusEditorial
from apps.trilhas.serializers import ExercicioDetalheSerializer

from .services import MODELOS

# Única rota autorizada a serializar `solucao_autor`.


class SolucaoAutorSerializer(serializers.ModelSerializer[Exercicio]):
    trilha_slug = serializers.SlugField(source="trilha.slug", read_only=True)
    exercicio_slug = serializers.SlugField(source="slug", read_only=True)
    status_editorial = serializers.CharField(source="status", read_only=True)

    class Meta:
        model = Exercicio
        fields = [
            "trilha_slug",
            "exercicio_slug",
            "solucao_autor",
            "status_editorial",
        ]
        read_only_fields = fields


# Item das filas editoriais; serve aos três models, por isso não é ModelSerializer.
class ItemEditorialSerializer(serializers.Serializer[object]):
    id = serializers.IntegerField(read_only=True)
    tipo = serializers.ChoiceField(choices=list(MODELOS), read_only=True)
    titulo = serializers.CharField(read_only=True)
    status_editorial = serializers.ChoiceField(StatusEditorial.choices, read_only=True)


# Exercício na leitura editorial: o detalhe público mais o código inicial. A
# solução fica de fora, como no detalhe público; ela tem rota própria.
class ExercicioEditorialSerializer(ExercicioDetalheSerializer):
    # Exercício teórico não tem especificação de código: vem null.
    codigo_inicial = serializers.CharField(
        source="especificacao_codigo.codigo_inicial", read_only=True, allow_null=True
    )

    class Meta(ExercicioDetalheSerializer.Meta):
        fields = [*ExercicioDetalheSerializer.Meta.fields, "codigo_inicial"]
        read_only_fields = fields
