from rest_framework import serializers

from .models import Aula, Exercicio, Trilha

# `fields` sempre em allowlist explícita: `__all__` e `exclude` são proibidos aqui.


class ExercicioResumoSerializer(serializers.ModelSerializer[Exercicio]):
    dificuldade_label = serializers.CharField(
        source="get_dificuldade_display", read_only=True
    )
    tipo_label = serializers.CharField(source="get_tipo_display", read_only=True)

    class Meta:
        model = Exercicio
        fields = [
            "id",
            "titulo",
            "slug",
            "tipo",
            "tipo_label",
            "dificuldade",
            "dificuldade_label",
            "ordem",
        ]
        read_only_fields = fields


class AulaSerializer(serializers.ModelSerializer[Aula]):
    exercicios = ExercicioResumoSerializer(many=True, read_only=True)
    pre_requisito = serializers.SlugField(
        source="pre_requisito.slug", read_only=True, default=None
    )

    class Meta:
        model = Aula
        fields = [
            "id",
            "titulo",
            "slug",
            "conteudo",
            "ordem",
            "pre_requisito",
            "exercicios",
        ]
        read_only_fields = fields


class TrilhaListaSerializer(serializers.ModelSerializer[Trilha]):
    total_aulas = serializers.IntegerField(read_only=True)
    total_exercicios = serializers.IntegerField(read_only=True)

    class Meta:
        model = Trilha
        fields = [
            "id",
            "nome",
            "slug",
            "descricao",
            "ordem",
            "total_aulas",
            "total_exercicios",
        ]
        read_only_fields = fields


class TrilhaDetalheSerializer(serializers.ModelSerializer[Trilha]):
    aulas = AulaSerializer(many=True, read_only=True)

    class Meta:
        model = Trilha
        fields = ["id", "nome", "slug", "descricao", "ordem", "aulas"]
        read_only_fields = fields


class ExercicioDetalheSerializer(serializers.ModelSerializer[Exercicio]):
    dificuldade_label = serializers.CharField(
        source="get_dificuldade_display", read_only=True
    )
    tipo_label = serializers.CharField(source="get_tipo_display", read_only=True)
    aula_titulo = serializers.CharField(source="aula.titulo", read_only=True)
    aula_slug = serializers.SlugField(source="aula.slug", read_only=True)
    trilha_nome = serializers.CharField(source="trilha.nome", read_only=True)
    trilha_slug = serializers.SlugField(source="trilha.slug", read_only=True)

    class Meta:
        model = Exercicio
        fields = [
            "id",
            "titulo",
            "slug",
            "enunciado",
            "tipo",
            "tipo_label",
            "dificuldade",
            "dificuldade_label",
            "ordem",
            "aula_titulo",
            "aula_slug",
            "trilha_nome",
            "trilha_slug",
        ]
        read_only_fields = fields
