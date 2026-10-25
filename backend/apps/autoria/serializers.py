from rest_framework import serializers

from apps.trilhas.models import Exercicio, StatusEditorial

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
