from rest_framework import serializers

from apps.gamificacao.serializers import MinhaCriaturaSerializer

from .models import Nivel, ProgressoCriatura


class NivelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Nivel
        fields = ("numero", "titulo", "xp_necessario")


class ProgressoSerializer(serializers.ModelSerializer):
    criatura = MinhaCriaturaSerializer(source="user_creature", read_only=True)
    nivel = NivelSerializer(read_only=True)
    proximo_nivel = NivelSerializer(read_only=True, allow_null=True)
    xp_no_nivel = serializers.IntegerField(read_only=True)
    xp_para_o_proximo = serializers.IntegerField(read_only=True, allow_null=True)

    class Meta:
        model = ProgressoCriatura
        fields = (
            "criatura",
            "xp_total",
            "nivel",
            "proximo_nivel",
            "xp_no_nivel",
            "xp_para_o_proximo",
            "atualizado_em",
        )


class ResultadoXPSerializer(serializers.Serializer):
    xp_ganho = serializers.IntegerField(read_only=True)
    ja_concluido = serializers.BooleanField(read_only=True)
    subiu_de_nivel = serializers.BooleanField(read_only=True)
    evoluiu = serializers.BooleanField(read_only=True)
    progresso = ProgressoSerializer(read_only=True)