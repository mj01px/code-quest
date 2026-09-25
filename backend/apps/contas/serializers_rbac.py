"""Serializers do painel de RBAC do admin: catálogo de permissões, níveis de
acesso (CRUD) e a atribuição de nível a um usuário.
"""

from rest_framework import serializers

from .models import NivelDeAcesso, Permissao, User


class PermissaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permissao
        fields = ("codename", "rotulo", "modulo")


class NivelDeAcessoSerializer(serializers.ModelSerializer):
    # A UI trabalha com codenames; expomos e recebemos as permissões por eles.
    permissoes = serializers.SlugRelatedField(
        slug_field="codename",
        queryset=Permissao.objects.all(),
        many=True,
        required=False,
    )
    # Anotado na view (Count) para não disparar uma consulta por linha; no
    # create/update a instância não vem anotada, então caímos no count().
    qtd_usuarios = serializers.SerializerMethodField()

    def get_qtd_usuarios(self, obj) -> int:
        anotado = getattr(obj, "qtd_usuarios", None)
        return anotado if anotado is not None else obj.usuarios.count()

    class Meta:
        model = NivelDeAcesso
        fields = (
            "id",
            "nome",
            "descricao",
            "sistema",
            "acesso_admin",
            "permissoes",
            "qtd_usuarios",
            "criado_em",
        )
        read_only_fields = ("id", "sistema", "qtd_usuarios", "criado_em")

    def validate_nome(self, valor):
        valor = valor.strip()
        if not valor:
            raise serializers.ValidationError(
                "O nome é obrigatório.", code="nome_vazio"
            )
        existente = NivelDeAcesso.objects.filter(nome__iexact=valor)
        if self.instance is not None:
            existente = existente.exclude(pk=self.instance.pk)
        if existente.exists():
            raise serializers.ValidationError(
                "Já existe um nível com esse nome.", code="nome_em_uso"
            )
        return valor

    def update(self, instance, validated_data):
        # Um nível de sistema pode ter descrição/permissões ajustadas, mas não
        # ser renomeado nem ter o acesso ao painel alterado — o "Admin" é a
        # âncora de recuperação (createsuperuser sempre cai nele).
        if instance.sistema:
            validated_data.pop("nome", None)
            validated_data.pop("acesso_admin", None)
        return super().update(instance, validated_data)


class UsuarioAdminSerializer(serializers.ModelSerializer):
    papel = serializers.CharField(source="role", read_only=True)
    papel_rotulo = serializers.CharField(source="get_role_display", read_only=True)
    criado_em = serializers.DateTimeField(source="created_at", read_only=True)
    nivel = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "nickname",
            "email",
            "papel",
            "papel_rotulo",
            "criado_em",
            "nivel",
        )

    def get_nivel(self, obj) -> dict | None:
        if obj.nivel_de_acesso_id is None:
            return None
        return {"id": str(obj.nivel_de_acesso_id), "nome": obj.nivel_de_acesso.nome}


class AtribuirNivelSerializer(serializers.Serializer):
    nivel_de_acesso = serializers.PrimaryKeyRelatedField(
        queryset=NivelDeAcesso.objects.all(),
        allow_null=True,
    )
