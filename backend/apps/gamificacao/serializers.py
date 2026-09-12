from django.conf import settings
from rest_framework import serializers

from .models import Creature, CreatureStage, UserCreature, XpBonus


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
    # O botão de evoluir precisa de três respostas: existe próximo estágio,
    # qual o nível que ele pede, e se já dá para apertar agora. O nível sai do
    # progresso DESTA criatura: cada uma acumula o próprio XP, e uma reserva
    # recém-comprada está no nível 1 por mais alto que a principal esteja.
    proximo_estagio = serializers.SerializerMethodField()
    nivel_para_evoluir = serializers.SerializerMethodField()
    pode_evoluir = serializers.SerializerMethodField()
    nivel = serializers.SerializerMethodField()

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
            "proximo_estagio",
            "nivel_para_evoluir",
            "pode_evoluir",
            "nivel",
        )

    def get_sprite(self, obj) -> str | None:
        for estagio in obj.creature.stages.all():
            if estagio.stage == obj.current_stage:
                return _url_sprite(estagio.sprite)
        return None

    def _seguinte(self, obj):
        for estagio in obj.creature.stages.all():
            if estagio.stage == obj.current_stage + 1:
                return estagio
        return None

    def get_proximo_estagio(self, obj) -> int | None:
        seguinte = self._seguinte(obj)
        return seguinte.stage if seguinte else None

    def get_nivel_para_evoluir(self, obj) -> int | None:
        seguinte = self._seguinte(obj)
        return seguinte.min_level if seguinte else None

    def get_pode_evoluir(self, obj) -> bool:
        seguinte = self._seguinte(obj)
        if seguinte is None:
            return False
        return self._nivel(obj) >= seguinte.min_level

    def get_nivel(self, obj) -> int:
        return self._nivel(obj)

    def _nivel(self, obj) -> int:
        """O nível desta criatura. Sem linha de progresso, ela está no nível 1.

        A linha só nasce no primeiro crédito de XP, então criatura recém-
        adquirida não tem nenhuma — e isso não é erro, é o começo.
        """
        progresso = getattr(obj, "progresso", None)
        return progresso.nivel_id if progresso is not None else 1


class EvolucaoSerializer(serializers.Serializer):
    """O que a animação de evolução precisa saber.

    `estagio_anterior` e o estágio atual da criatura são os dois sprites da
    transição. `evoluiu` vem falso quando outro pedido chegou primeiro: a
    criatura já está na forma nova e não há transição a mostrar.
    """

    evoluiu = serializers.BooleanField(read_only=True)
    estagio_anterior = serializers.IntegerField(read_only=True)
    criatura = MinhaCriaturaSerializer(read_only=True)


class EscolhaInicialSerializer(serializers.Serializer):
    criatura = serializers.SlugField(max_length=32)


class CriaturaAtivaSerializer(serializers.Serializer):
    criatura = serializers.SlugField(max_length=32)


class AquisicaoCriaturaSerializer(serializers.Serializer):
    criatura = serializers.SlugField(max_length=32)


class BonusXpSerializer(serializers.ModelSerializer):
    """O bônus como a interface precisa dele: já resolvido em nome e slug."""

    criatura = serializers.SlugRelatedField(
        source="creature", slug_field="slug", read_only=True
    )
    criatura_nome = serializers.CharField(source="creature.name", read_only=True)
    trilha = serializers.SlugRelatedField(slug_field="slug", read_only=True)
    trilha_nome = serializers.CharField(source="trilha.nome", read_only=True)
    multiplicador = serializers.DecimalField(
        source="multiplier",
        max_digits=3,
        decimal_places=2,
        coerce_to_string=False,
        read_only=True,
    )

    class Meta:
        model = XpBonus
        fields = (
            "criatura",
            "criatura_nome",
            "trilha",
            "trilha_nome",
            "multiplicador",
        )
