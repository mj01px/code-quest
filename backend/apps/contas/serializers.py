from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .documentos import VERSAO_MAX_LENGTH, Documento, versao_vigente
from .models import AceiteDeTermos

User = get_user_model()


def _ip_do_cliente(request) -> str | None:
    """
    Lê REMOTE_ADDR direto, nunca X-Forwarded-For.

    O projeto roda com NUM_PROXIES = 0 em `config/settings.py`, ou seja, já
    decidiu ignorar cabeçalho que o próprio cliente controla. Se um dia entrar
    um proxy reverso na frente, os dois lugares mudam juntos.
    """
    if request is None:
        return None
    return request.META.get("REMOTE_ADDR") or None


class UsuarioSerializer(serializers.ModelSerializer):
    papel = serializers.CharField(source="role", read_only=True)
    papel_rotulo = serializers.CharField(source="get_role_display", read_only=True)
    permissoes = serializers.SerializerMethodField()
    criado_em = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "nickname",
            "papel",
            "papel_rotulo",
            "permissoes",
            "criado_em",
        )
        read_only_fields = ("id", "email")

    def get_permissoes(self, obj) -> list[str]:
        return sorted(obj.get_role_permissions())

    def validate_nickname(self, valor):
        existente = User.objects.filter(nickname__iexact=valor)
        if self.instance is not None:
            existente = existente.exclude(pk=self.instance.pk)
        if existente.exists():
            raise serializers.ValidationError(
                "Este nickname já está em uso.", code="nickname_em_uso"
            )
        return valor


class RegistroSerializer(serializers.ModelSerializer):
    email = serializers.EmailField()
    senha = serializers.CharField(
        write_only=True, style={"input_type": "password"}, trim_whitespace=False
    )
    senha_confirmacao = serializers.CharField(
        write_only=True, style={"input_type": "password"}, trim_whitespace=False
    )

    aceite_documentos = serializers.BooleanField(write_only=True, required=True)

    # O cliente ecoa a versão que exibiu em vez de o servidor carimbar a atual.
    # É o que impede uma aba velha em cache aceitar o texto antigo e ficar
    # registrada como se tivesse lido o novo.
    versao_termos = serializers.CharField(
        write_only=True, required=True, max_length=VERSAO_MAX_LENGTH
    )
    versao_privacidade = serializers.CharField(
        write_only=True, required=True, max_length=VERSAO_MAX_LENGTH
    )

    class Meta:
        model = User
        fields = (
            "email",
            "nickname",
            "senha",
            "senha_confirmacao",
            "aceite_documentos",
            "versao_termos",
            "versao_privacidade",
        )

    def validate_email(self, valor):
        email = User.objects.normalize_email(valor).lower()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError(
                "Já existe uma conta com este e-mail.", code="email_em_uso"
            )
        return email

    def validate_nickname(self, valor):
        if User.objects.filter(nickname__iexact=valor).exists():
            raise serializers.ValidationError(
                "Este nickname já está em uso.", code="nickname_em_uso"
            )
        return valor

    def validate_aceite_documentos(self, valor):
        if valor is not True:
            raise serializers.ValidationError(
                "É preciso aceitar os Termos de Uso e o Protocolo de Dados "
                "para criar a conta.",
                code="aceite_obrigatorio",
            )
        return valor

    def _validar_versao(self, documento, valor):
        if valor != versao_vigente(documento):
            raise serializers.ValidationError(
                "Os documentos foram atualizados. Recarregue a página e leia "
                "a versão nova antes de continuar.",
                code="versao_desatualizada",
            )
        return valor

    def validate_versao_termos(self, valor):
        return self._validar_versao(Documento.TERMOS, valor)

    def validate_versao_privacidade(self, valor):
        return self._validar_versao(Documento.PRIVACIDADE, valor)

    def validate(self, dados):
        if dados["senha"] != dados["senha_confirmacao"]:
            raise serializers.ValidationError(
                {
                    "senha_confirmacao": serializers.ErrorDetail(
                        "As senhas não conferem.", code="senha_diferente"
                    )
                }
            )

        provisorio = User(email=dados["email"], nickname=dados["nickname"])
        try:
            validate_password(dados["senha"], provisorio)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"senha": list(exc.messages)}) from None

        return dados

    def create(self, dados):
        ip = _ip_do_cliente(self.context.get("request"))

        # Conta e aceite nascem na mesma transação: uma conta sem o registro do
        # aceite seria exatamente o que não se consegue provar depois.
        with transaction.atomic():
            usuario = User.objects.create_user(
                email=dados["email"],
                nickname=dados["nickname"],
                password=dados["senha"],
            )
            AceiteDeTermos.registrar_vigentes(usuario, ip=ip)

        return usuario


class LoginSerializer(TokenObtainPairSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields.pop("password", None)
        self.fields["senha"] = serializers.CharField(
            write_only=True, style={"input_type": "password"}, trim_whitespace=False
        )

    def validate(self, attrs):
        attrs = dict(attrs)
        attrs["password"] = attrs.pop("senha", "")
        identificador = attrs.get(self.username_field) or ""
        attrs[self.username_field] = identificador.strip().lower()

        dados = super().validate(attrs)
        dados["usuario"] = UsuarioSerializer(self.user).data
        return dados


class DocumentoLegalSerializer(serializers.Serializer):
    documento = serializers.CharField()
    rotulo = serializers.CharField()
    versao = serializers.CharField()
    vigente_desde = serializers.DateField()
    caminho = serializers.CharField()


class DocumentosLegaisSerializer(serializers.Serializer):
    """Resposta de leitura pública: o que o cadastro precisa exibir e ecoar."""

    termos = DocumentoLegalSerializer()
    privacidade = DocumentoLegalSerializer()
