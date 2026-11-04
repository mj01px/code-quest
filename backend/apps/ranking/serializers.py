from rest_framework import serializers


class PeriodoSerializer(serializers.Serializer[object]):
    inicio = serializers.DateField()
    fim = serializers.DateField()
    fecha_em = serializers.DateTimeField()


class CriaturaDoRankingSerializer(serializers.Serializer[object]):
    nome = serializers.CharField()
    sprite = serializers.CharField(allow_null=True)


class LinhaDoRankingSerializer(serializers.Serializer[object]):
    posicao = serializers.IntegerField()
    nickname = serializers.CharField()
    xp = serializers.IntegerField()
    criatura = CriaturaDoRankingSerializer(allow_null=True)
    voce = serializers.BooleanField()


class MinhaPosicaoSerializer(serializers.Serializer[object]):
    nickname = serializers.CharField()
    criatura = CriaturaDoRankingSerializer(allow_null=True)
    posicao = serializers.IntegerField(allow_null=True)
    xp = serializers.IntegerField()
    faltam_para_subir = serializers.IntegerField(allow_null=True)
    podios = serializers.IntegerField()
    vitorias = serializers.IntegerField()


class RankingMensalSerializer(serializers.Serializer[object]):
    mes = PeriodoSerializer()
    topo = LinhaDoRankingSerializer(many=True)
    voce = MinhaPosicaoSerializer()


class ConquistaDoPerfilSerializer(serializers.Serializer[object]):
    slug = serializers.SlugField()
    nome = serializers.CharField()
    descricao = serializers.CharField()
    icone = serializers.CharField()
    desbloqueada_em = serializers.DateTimeField()


class ConquistaBloqueadaSerializer(serializers.Serializer[object]):
    slug = serializers.SlugField()
    nome = serializers.CharField()
    icone = serializers.CharField(allow_blank=True)
    oculta = serializers.BooleanField()


class TrilhaDoPerfilSerializer(serializers.Serializer[object]):
    slug = serializers.SlugField()
    nome = serializers.CharField()
    percentual = serializers.IntegerField()


class PerfilPublicoSerializer(serializers.Serializer[object]):
    nickname = serializers.CharField()
    criatura = CriaturaDoRankingSerializer(allow_null=True)
    nivel = serializers.IntegerField(allow_null=True)
    titulo_do_nivel = serializers.CharField(allow_blank=True)
    xp_total = serializers.IntegerField()
    xp_no_nivel = serializers.IntegerField()
    xp_para_o_proximo = serializers.IntegerField(allow_null=True)
    membro_desde = serializers.DateField()
    cla = serializers.CharField(allow_null=True)
    sequencia_atual = serializers.IntegerField()
    sequencia_recorde = serializers.IntegerField()
    total_conquistas = serializers.IntegerField()
    conquistas = ConquistaDoPerfilSerializer(many=True)
    conquistas_bloqueadas = ConquistaBloqueadaSerializer(many=True)
    trilhas = TrilhaDoPerfilSerializer(many=True)
