from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


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

    class Meta:
        model = User
        fields = ("email", "nickname", "senha", "senha_confirmacao")

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
        return User.objects.create_user(
            email=dados["email"],
            nickname=dados["nickname"],
            password=dados["senha"],
        )


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
