from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.auditoria.services import AcaoAuditoria, registrar

from .documentos import VERSAO_MAX_LENGTH, Documento, versao_vigente
from .exclusao import ler_token as ler_token_exclusao
from .exclusao import token_confere as token_confere_exclusao
from .models import AceiteDeTermos
from .senha import ler_token as ler_token_senha
from .senha import token_confere
from .troca_email import ler_token as ler_token_troca
from .troca_email import token_confere as token_confere_troca
from .verificacao import ler_token, ler_token_qualquer_idade

User = get_user_model()

CREDENCIAL_INVALIDA = (
    "E-mail ou senha incorretos. Se errou várias vezes, espere alguns minutos "
    "ou redefina sua senha."
)


def _ip_do_cliente(request) -> str | None:
    if request is None:
        return None
    return request.META.get("REMOTE_ADDR") or None


def _erro_link_ja_usado(mensagem: str) -> serializers.ValidationError:
    """Erro para o link cuja ação já foi feita (assinatura ok, mas a 'marca' já
    mudou). O código deixa a interface mostrar uma mensagem afirmativa em vez de
    'link inválido'."""
    return serializers.ValidationError(
        {"token": serializers.ErrorDetail(mensagem, code="link_ja_usado")}
    )


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
        request = self.context.get("request")
        attrs = dict(attrs)
        attrs["password"] = attrs.pop("senha", "")
        identificador = attrs.get(self.username_field) or ""
        email = identificador.strip().lower()
        attrs[self.username_field] = email

        candidato = User.objects.filter(email=email).first()

        if candidato is not None and candidato.esta_bloqueado:
            registrar(
                AcaoAuditoria.LOGIN_FALHA,
                request=request,
                actor=candidato,
                motivo="bloqueado",
            )
            raise AuthenticationFailed(CREDENCIAL_INVALIDA, "credencial_invalida")

        try:
            dados = super().validate(attrs)
        except AuthenticationFailed:
            if candidato is not None:
                candidato.registrar_falha_de_login()
            # Não guardamos a senha tentada nem o e-mail de contas inexistentes.
            registrar(
                AcaoAuditoria.LOGIN_FALHA,
                request=request,
                actor=candidato,
                motivo="credenciais_invalidas",
                **({} if candidato is not None else {"email_desconhecido": True}),
            )
            raise AuthenticationFailed(
                CREDENCIAL_INVALIDA, "credencial_invalida"
            ) from None

        self.user.registrar_login_valido()

        if not self.user.email_verificado:
            registrar(
                AcaoAuditoria.LOGIN_FALHA,
                request=request,
                actor=self.user,
                motivo="email_nao_verificado",
            )
            raise serializers.ValidationError(
                {
                    "email": serializers.ErrorDetail(
                        "Confirme seu e-mail antes de entrar. "
                        "Enviamos um link quando você criou a conta.",
                        code="email_nao_verificado",
                    )
                }
            )

        registrar(AcaoAuditoria.LOGIN_OK, request=request, actor=self.user)

        dados["usuario"] = UsuarioSerializer(self.user).data
        return dados


class VerificarEmailSerializer(serializers.Serializer):
    token = serializers.CharField(write_only=True, max_length=500)

    def validate_token(self, valor):
        uid = ler_token(valor)
        if uid is not None:
            usuario = User.objects.filter(pk=uid).first()
            if usuario is not None:
                self.usuario = usuario
                # Guarda se já estava verificado ANTES desta chamada.
                self.ja_verificado = usuario.email_verificado
                return valor

        # Token vencido/inválido: se ainda dá para identificar o dono e a conta
        # já está verificada, é um link antigo de algo já feito — sucesso, não
        # recusa. (Nunca verifica uma conta pendente por aqui.)
        uid_antigo = ler_token_qualquer_idade(valor)
        if uid_antigo is not None:
            usuario = User.objects.filter(
                pk=uid_antigo, email_verified_at__isnull=False
            ).first()
            if usuario is not None:
                self.usuario = usuario
                self.ja_verificado = True
                return valor

        raise serializers.ValidationError(
            "Link inválido ou expirado. Peça um novo e-mail de confirmação.",
            code="token_invalido",
        )


class ReenviarVerificacaoSerializer(serializers.Serializer):
    email = serializers.EmailField(write_only=True)

    def validate_email(self, valor):
        return User.objects.normalize_email(valor).lower()


class TrocaEmailSerializer(serializers.Serializer):
    email = serializers.EmailField(write_only=True)

    def validate_email(self, valor):
        return User.objects.normalize_email(valor).lower()

    def validate(self, dados):
        usuario = self.context["request"].user
        novo = dados["email"]
        if novo == usuario.email:
            raise serializers.ValidationError(
                {
                    "email": serializers.ErrorDetail(
                        "Este já é o seu e-mail atual.", code="email_igual"
                    )
                }
            )
        if User.objects.filter(email=novo).exclude(pk=usuario.pk).exists():
            raise serializers.ValidationError(
                {
                    "email": serializers.ErrorDetail(
                        "Já existe uma conta com este e-mail.", code="email_em_uso"
                    )
                }
            )
        return dados


class ConfirmarTrocaEmailSerializer(serializers.Serializer):
    token = serializers.CharField(write_only=True, max_length=500)

    def _recusar(self):
        raise serializers.ValidationError(
            {
                "token": serializers.ErrorDetail(
                    "Esse link já foi usado ou expirou. Se precisar, peça um novo.",
                    code="token_invalido",
                )
            }
        )

    def validate(self, dados):
        lido = ler_token_troca(dados["token"])
        if lido is None:
            self._recusar()

        usuario = User.objects.filter(pk=lido["uid"], is_active=True).first()
        if usuario is None:
            self._recusar()
        if not token_confere_troca(lido, usuario):
            raise _erro_link_ja_usado(
                "Este e-mail já foi trocado. Se precisar, troque de novo nas "
                "Configurações."
            )

        novo = lido["email"]
        if User.objects.filter(email=novo).exclude(pk=usuario.pk).exists():
            raise serializers.ValidationError(
                {
                    "email": serializers.ErrorDetail(
                        "Já existe uma conta com este e-mail.", code="email_em_uso"
                    )
                }
            )

        self.usuario = usuario
        self.novo_email = novo
        return dados


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
                    "Esse link já foi usado ou expirou. Se precisar, peça um novo.",
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
        if usuario is None:
            self._recusar()
        if not token_confere(lido, usuario):
            raise _erro_link_ja_usado(
                "Você já redefiniu a senha com este link. É só entrar com a senha nova."
            )

        try:
            validate_password(dados["senha"], usuario)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"senha": list(exc.messages)}) from None

        self.usuario = usuario
        return dados


class ExclusaoConfirmarSerializer(serializers.Serializer):
    token = serializers.CharField(write_only=True, max_length=500)
    senha = serializers.CharField(
        write_only=True, style={"input_type": "password"}, trim_whitespace=False
    )

    def validate(self, dados):
        lido = ler_token_exclusao(dados["token"])
        usuario = (
            User.objects.filter(pk=lido["uid"]).first() if lido is not None else None
        )

        if usuario is not None and usuario.is_anonymized:
            raise _erro_link_ja_usado("Esta conta já foi excluída.")

        if usuario is None or not token_confere_exclusao(lido, usuario):
            raise serializers.ValidationError(
                {
                    "token": serializers.ErrorDetail(
                        "Esse link já foi usado ou expirou. Se precisar, peça um novo.",
                        code="token_invalido",
                    )
                }
            )

        # A confirmação exige a senha, além do link do e-mail: garante que quem
        # confirma é o dono, não só quem tem o link.
        if not usuario.check_password(dados["senha"]):
            raise serializers.ValidationError(
                {
                    "senha": serializers.ErrorDetail(
                        "Senha incorreta.", code="senha_incorreta"
                    )
                }
            )

        self.usuario = usuario
        return dados
