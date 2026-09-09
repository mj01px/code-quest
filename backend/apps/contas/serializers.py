from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .documentos import VERSAO_MAX_LENGTH, Documento, versao_vigente
from .models import AceiteDeTermos
from .senha import ler_token as ler_token_senha
from .senha import token_confere
from .verificacao import ler_token

User = get_user_model()

CREDENCIAL_INVALIDA = (
    "E-mail ou senha incorretos. Se errou várias vezes, espere alguns minutos "
    "ou redefina sua senha."
)


def _ip_do_cliente(request) -> str | None:
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
        return User.objects.normalize_email(valor).lower()

    def validate_nickname(self, valor):
        if User.objects.filter(nickname__iexact=valor).exists():
            raise serializers.ValidationError(
                "Este nickname já está em uso.", code="nickname_em_uso"
            )
        return valor

    def validate_aceite_documentos(self, valor):
        if valor is not True:
            raise serializers.ValidationError(
                "É preciso aceitar os Termos de Uso e a Política de Privacidade "
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
        email = identificador.strip().lower()
        attrs[self.username_field] = email

        candidato = User.objects.filter(email=email).first()

        if candidato is not None and candidato.esta_bloqueado:
            raise AuthenticationFailed(CREDENCIAL_INVALIDA, "credencial_invalida")

        try:
            dados = super().validate(attrs)
        except AuthenticationFailed:
            if candidato is not None:
                candidato.registrar_falha_de_login()
            raise AuthenticationFailed(
                CREDENCIAL_INVALIDA, "credencial_invalida"
            ) from None

        self.user.registrar_login_valido()

        if not self.user.email_verificado:
            raise serializers.ValidationError(
                {
                    "email": serializers.ErrorDetail(
                        "Confirme seu e-mail antes de entrar. "
                        "Enviamos um link quando você criou a conta.",
                        code="email_nao_verificado",
                    )
                }
            )

        dados["usuario"] = UsuarioSerializer(self.user).data
        return dados


class VerificarEmailSerializer(serializers.Serializer):
    token = serializers.CharField(write_only=True, max_length=500)

    def validate_token(self, valor):
        uid = ler_token(valor)
        if uid is None:
            raise serializers.ValidationError(
                "Link inválido ou expirado. Peça um novo e-mail de confirmação.",
                code="token_invalido",
            )

        usuario = User.objects.filter(pk=uid).first()
        if usuario is None:
            raise serializers.ValidationError(
                "Link inválido ou expirado. Peça um novo e-mail de confirmação.",
                code="token_invalido",
            )

        self.usuario = usuario
        return valor


class ReenviarVerificacaoSerializer(serializers.Serializer):
    email = serializers.EmailField(write_only=True)

    def validate_email(self, valor):
        return User.objects.normalize_email(valor).lower()


class DocumentoLegalSerializer(serializers.Serializer):
    documento = serializers.CharField()
    rotulo = serializers.CharField()
    versao = serializers.CharField()
    vigente_desde = serializers.DateField()
    caminho = serializers.CharField()


class DocumentosLegaisSerializer(serializers.Serializer):
    termos = DocumentoLegalSerializer()
    privacidade = DocumentoLegalSerializer()


class SenhaEsquecidaSerializer(serializers.Serializer):
    email = serializers.EmailField(write_only=True)

    def validate_email(self, valor):
        return User.objects.normalize_email(valor).lower()


class RedefinirSenhaSerializer(serializers.Serializer):
    token = serializers.CharField(write_only=True, max_length=500)
    senha = serializers.CharField(
        write_only=True, style={"input_type": "password"}, trim_whitespace=False
    )
    senha_confirmacao = serializers.CharField(
        write_only=True, style={"input_type": "password"}, trim_whitespace=False
    )

    def _recusar(self):
        raise serializers.ValidationError(
            {
                "token": serializers.ErrorDetail(
                    "Link inválido, expirado ou já usado. Peça outro.",
                    code="token_invalido",
                )
            }
        )

    def validate(self, dados):
        if dados["senha"] != dados["senha_confirmacao"]:
            raise serializers.ValidationError(
                {
                    "senha_confirmacao": serializers.ErrorDetail(
                        "As senhas não conferem.", code="senha_diferente"
                    )
                }
            )

        lido = ler_token_senha(dados["token"])
        if lido is None:
            self._recusar()

        usuario = User.objects.filter(pk=lido["uid"], is_active=True).first()
        if usuario is None or not token_confere(lido, usuario):
            self._recusar()

        try:
            validate_password(dados["senha"], usuario)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"senha": list(exc.messages)}) from None

        self.usuario = usuario
        return dados
