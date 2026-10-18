from rest_framework import serializers


class ConquistaSerializer(serializers.Serializer):
    slug = serializers.SlugField(read_only=True, allow_null=True)
    nome = serializers.CharField(read_only=True)
    descricao = serializers.CharField(read_only=True)
    icone = serializers.CharField(read_only=True)
    oculta = serializers.BooleanField(read_only=True)
    desbloqueada = serializers.BooleanField(read_only=True)
    desbloqueada_em = serializers.DateTimeField(read_only=True, allow_null=True)
    vista = serializers.BooleanField(read_only=True)
    progresso = serializers.IntegerField(read_only=True, allow_null=True)
    meta = serializers.IntegerField(read_only=True, allow_null=True)
    raridade = serializers.FloatField(read_only=True)
