from rest_framework import serializers

from apps.trilhas.models import Exercicio

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
