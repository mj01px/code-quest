from rest_framework import serializers

from .models import NIVEL_MINIMO_GLOBAL, Bandeira, Cargo, Cla, MembroDoCla, TipoDeCla
from .validators import DESCRICAO_MAX_LENGTH, NOME_MAX_LENGTH, normalizar_nome


class ClaSerializer(serializers.ModelSerializer):
    bandeira_rotulo = serializers.CharField(source="get_bandeira_display", read_only=True)
    tipo_rotulo = serializers.CharField(source="get_tipo_display", read_only=True)
    total_membros = serializers.IntegerField(read_only=True)

    class Meta:
        model = Cla
        fields = (
            "tag",
            "nome",
            "descricao",
            "bandeira",
            "bandeira_rotulo",
            "tipo",
            "tipo_rotulo",
            "nivel_minimo",
            "total_membros",
            "criado_em",
        )
        read_only_fields = fields


class MeuClaSerializer(serializers.ModelSerializer):
    cla = serializers.SerializerMethodField()
    cargo_rotulo = serializers.CharField(source="get_cargo_display", read_only=True)

    class Meta:
        model = MembroDoCla
        fields = ("cla", "cargo", "cargo_rotulo", "entrou_em")
        read_only_fields = fields

    def get_cla(self, obj) -> dict:
        # o total vem anotado no membro, não no clã
        obj.cla.total_membros = obj.total_membros
        return ClaSerializer(obj.cla, context=self.context).data


class CriarClaSerializer(serializers.Serializer):
    # o tamanho mínimo e os caracteres ficam no validador do model
    nome = serializers.CharField(max_length=NOME_MAX_LENGTH * 2, trim_whitespace=False)
    descricao = serializers.CharField(
        max_length=DESCRICAO_MAX_LENGTH, required=False, allow_blank=True, default=""
    )
    bandeira = serializers.ChoiceField(choices=Bandeira.choices)
    tipo = serializers.ChoiceField(choices=TipoDeCla.choices, default=TipoDeCla.PUBLICO)
    nivel_minimo = serializers.IntegerField(default=NIVEL_MINIMO_GLOBAL)

    def validate_nome(self, valor):
        return normalizar_nome(valor)

    def validate_descricao(self, valor):
        return valor.strip()


class EditarClaSerializer(serializers.Serializer):
    descricao = serializers.CharField(
        max_length=DESCRICAO_MAX_LENGTH, required=False, allow_blank=True
    )
    bandeira = serializers.ChoiceField(choices=Bandeira.choices, required=False)
    tipo = serializers.ChoiceField(choices=TipoDeCla.choices, required=False)
    nivel_minimo = serializers.IntegerField(required=False)

    def validate(self, dados):
        if "nome" in self.initial_data:
            raise serializers.ValidationError(
                {"nome": "O nome do clã não pode ser alterado."},
                code="nome_nao_editavel",
            )
        if "descricao" in dados:
            dados["descricao"] = dados["descricao"].strip()
        return dados


class MembroSerializer(serializers.ModelSerializer):
    nickname = serializers.CharField(source="user.nickname", read_only=True)
    cargo_rotulo = serializers.CharField(source="get_cargo_display", read_only=True)

    class Meta:
        model = MembroDoCla
        fields = ("id", "nickname", "cargo", "cargo_rotulo", "entrou_em")
        read_only_fields = fields


class MudarCargoSerializer(serializers.Serializer):
    # líder só muda por transferência
    cargo = serializers.ChoiceField(
        choices=[(Cargo.COLIDER, Cargo.COLIDER.label), (Cargo.MEMBRO, Cargo.MEMBRO.label)]
    )


class TransferirLiderancaSerializer(serializers.Serializer):
    membro_id = serializers.UUIDField()
