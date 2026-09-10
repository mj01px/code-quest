from django.conf import settings
from rest_framework import serializers

from .models import Creature, CreatureStage, UserCreature


def _url_sprite(nome):
    if not nome:
        return None
    return f"{settings.SPRITE_BASE_URL}{nome}"


class EstagioSerializer(serializers.ModelSerializer):
    estagio = serializers.IntegerField(source="stage", read_only=True)
    rotulo = serializers.CharField(source="get_stage_display", read_only=True)
    nivel_minimo = serializers.IntegerField(source="min_level", read_only=True)
    sprite = serializers.SerializerMethodField()
    sprite_dialogo = serializers.SerializerMethodField()

    class Meta:
        model = CreatureStage
        fields = ("estagio", "rotulo", "nivel_minimo", "sprite", "sprite_dialogo")

    def get_sprite(self, obj) -> str:
        return _url_sprite(obj.sprite)

    def get_sprite_dialogo(self, obj) -> str | None:
        return _url_sprite(obj.sprite_dialog)


class CriaturaSerializer(serializers.ModelSerializer):
    nome = serializers.CharField(source="name", read_only=True)
    especie = serializers.CharField(source="species", read_only=True)
    dominio = serializers.CharField(source="domain", read_only=True)
    dominio_rotulo = serializers.CharField(source="get_domain_display", read_only=True)
    chamada = serializers.CharField(source="tagline", read_only=True)
    tipo = serializers.CharField(source="type_label", read_only=True)
    descricao = serializers.CharField(source="description", read_only=True)
    atributo_nome = serializers.CharField(source="attribute_label", read_only=True)
    atributo_valor = serializers.IntegerField(source="attribute_value", read_only=True)
    cor_base = serializers.CharField(source="base_color", read_only=True)
    cor_contorno = serializers.CharField(source="outline_color", read_only=True)
    cor_acento = serializers.CharField(source="accent_color", read_only=True)
    disponivel = serializers.BooleanField(source="is_available", read_only=True)
    ordem = serializers.IntegerField(source="display_order", read_only=True)
    estagios = EstagioSerializer(source="stages", many=True, read_only=True)

    class Meta:
        model = Creature
        fields = (
            "slug",
            "nome",
            "especie",
            "dominio",
            "dominio_rotulo",
            "chamada",
            "tipo",
            "descricao",
            "atributo_nome",
            "atributo_valor",
            "cor_base",
            "cor_contorno",
            "cor_acento",
            "disponivel",
            "ordem",
            "estagios",
        )


class MinhaCriaturaSerializer(serializers.ModelSerializer):
    criatura = CriaturaSerializer(source="creature", read_only=True)
    estagio_atual = serializers.IntegerField(source="current_stage", read_only=True)
    inicial = serializers.BooleanField(source="is_starter", read_only=True)
    ativa = serializers.BooleanField(source="is_active", read_only=True)
    adquirida_em = serializers.DateTimeField(source="acquired_at", read_only=True)
    evoluiu_em = serializers.DateTimeField(source="evolved_at", read_only=True)
    sprite = serializers.SerializerMethodField()

    class Meta:
        model = UserCreature
        fields = (
            "id",
            "criatura",
            "estagio_atual",
            "inicial",
            "ativa",
            "adquirida_em",
            "evoluiu_em",
            "sprite",
        )

    def get_sprite(self, obj) -> str | None:
        for estagio in obj.creature.stages.all():
            if estagio.stage == obj.current_stage:
                return _url_sprite(estagio.sprite)
        return None


class EscolhaInicialSerializer(serializers.Serializer):
    criatura = serializers.SlugField(max_length=32)


class CriaturaAtivaSerializer(serializers.Serializer):
    criatura = serializers.SlugField(max_length=32)


class AquisicaoCriaturaSerializer(serializers.Serializer):
    criatura = serializers.SlugField(max_length=32)
