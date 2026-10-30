from rest_framework import serializers


class PeriodoSerializer(serializers.Serializer):
    inicio = serializers.DateField()
    fim = serializers.DateField()
    fecha_em = serializers.DateTimeField()


class CriaturaDoRankingSerializer(serializers.Serializer):
    nome = serializers.CharField()
    sprite = serializers.CharField(allow_null=True)


class LinhaDoRankingSerializer(serializers.Serializer):
    posicao = serializers.IntegerField()
    nickname = serializers.CharField()
    xp = serializers.IntegerField()
    criatura = CriaturaDoRankingSerializer(allow_null=True)
    voce = serializers.BooleanField()


class MinhaPosicaoSerializer(serializers.Serializer):
    nickname = serializers.CharField()
    criatura = CriaturaDoRankingSerializer(allow_null=True)
    posicao = serializers.IntegerField(allow_null=True)
    xp = serializers.IntegerField()
    faltam_para_subir = serializers.IntegerField(allow_null=True)
    podios = serializers.IntegerField()
    vitorias = serializers.IntegerField()


class RankingMensalSerializer(serializers.Serializer):
    mes = PeriodoSerializer()
    topo = LinhaDoRankingSerializer(many=True)
    voce = MinhaPosicaoSerializer()

