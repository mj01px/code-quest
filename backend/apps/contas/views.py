from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.exceptions import ErrorDetail, NotAuthenticated, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.auditoria.services import AcaoAuditoria, registrar

from . import mfa
from .cadastro_alerta import avisar_tentativa_de_cadastro
from .cookies import REFRESH, gravar_sessao, limpar_sessao
from .documentos import Documento, descrever, status_consentimentos
from .exclusao import enviar_confirmacao_exclusao
from .lgpd import anonimizar_conta, exportar_dados
from .models import AceiteDeTermos
from .senha import enviar_redefinicao
from .serializers import (
    ConfirmarTrocaEmailSerializer,
    DocumentosLegaisSerializer,
    ExclusaoConfirmarSerializer,
    LoginMfaSerializer,
    LoginSerializer,
    MfaCodigoSerializer,
    MfaIniciarSerializer,
    RedefinirSenhaSerializer,
    ReenviarVerificacaoSerializer,
    RegistroSerializer,
    SenhaEsquecidaSerializer,
    TrocaEmailSerializer,
    UsuarioSerializer,
    VerificarEmailSerializer,
)
from .troca_email import enviar_troca_email
from .verificacao import enviar_verificacao

User = get_user_model()


def _encerrar_sessoes(usuario) -> None:
    for token in OutstandingToken.objects.filter(user=usuario):
        BlacklistedToken.objects.get_or_create(token=token)


@extend_schema(tags=["auth"], responses=DocumentosLegaisSerializer)
class DocumentosLegaisView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        dados = {
            "termos": descrever(Documento.TERMOS),
            "privacidade": descrever(Documento.PRIVACIDADE),
        }
        return Response(DocumentosLegaisSerializer(dados).data)


@extend_schema(tags=["auth"])
class RegistrarView(generics.CreateAPIView):
    serializer_class = RegistroSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        if User.objects.filter(email=email).exists():
            enviado = avisar_tentativa_de_cadastro(email)
        else:
            try:
                usuario = serializer.save()
            except IntegrityError:
                enviado = avisar_tentativa_de_cadastro(email)
            else:
                enviado = enviar_verificacao(usuario)
                registrar(AcaoAuditoria.CADASTRO, request=request, actor=usuario)

        return Response(
            {"email_enviado": enviado}, status=status.HTTP_201_CREATED
        )


@extend_schema(tags=["auth"], responses=UsuarioSerializer)
class VerificarEmailView(generics.GenericAPIView):
    serializer_class = VerificarEmailSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "verificacao"

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        usuario = serializer.usuario
        ja_confirmado = serializer.ja_verificado
        # Marca de forma atômica: sob a corrida (StrictMode dispara em dobro),
        # só a chamada que realmente marcou audita — evita o log duplicado.
        if not ja_confirmado and usuario.marcar_email_verificado():
            registrar(AcaoAuditoria.EMAIL_VERIFICADO, request=request, actor=usuario)

        dados = {**UsuarioSerializer(usuario).data, "ja_confirmado": ja_confirmado}
        return Response(dados, status=status.HTTP_200_OK)


@extend_schema(tags=["auth"], responses=None)
class ReenviarVerificacaoView(generics.GenericAPIView):
    serializer_class = ReenviarVerificacaoSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "verificacao"

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        usuario = User.objects.filter(
            email=serializer.validated_data["email"],
            email_verified_at__isnull=True,
            is_active=True,
        ).first()
        if usuario is not None:
            enviar_verificacao(usuario)

        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["auth"], request=None, responses=None)
class CsrfView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @method_decorator(ensure_csrf_cookie)
    def get(self, request):
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["auth"])
class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        usuario = serializer.user
        config = mfa.mfa_ativo(usuario)
        if config is not None:
            # Senha OK, mas com 2FA ativo a sessão só sai no passo 2.
            mfa.iniciar_desafio_login(usuario)
            return Response(
                {
                    "mfa_required": True,
                    "metodo": config.metodo,
                    "mfa_token": mfa.token_login(usuario),
                },
                status=status.HTTP_200_OK,
            )

        dados = serializer.validated_data
        resposta = Response(
            {"usuario": dados["usuario"]}, status=status.HTTP_200_OK
        )
        return gravar_sessao(resposta, dados["access"], dados["refresh"])


@extend_schema(tags=["auth"], responses=None)
class RenovarView(TokenRefreshView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request, *args, **kwargs):
        bruto = request.COOKIES.get(REFRESH)
        if not bruto:
            raise NotAuthenticated("Sessão ausente ou expirada. Entre de novo.")

        serializer = self.get_serializer(data={"refresh": bruto})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as exc:
            raise InvalidToken(exc.args[0]) from exc

        dados = serializer.validated_data
        resposta = Response(status=status.HTTP_204_NO_CONTENT)
        return gravar_sessao(resposta, dados["access"], dados.get("refresh"))


@extend_schema(tags=["auth"], request=None, responses=None)
class SairView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request, *args, **kwargs):
        bruto = request.COOKIES.get(REFRESH)
        ator = None
        if bruto:
            try:
                token = RefreshToken(bruto)
                ator = User.objects.filter(pk=token.get("user_id")).first()
                token.blacklist()
            except TokenError:
                pass

        registrar(AcaoAuditoria.LOGOUT, request=request, actor=ator)
        return limpar_sessao(Response(status=status.HTTP_204_NO_CONTENT))


@extend_schema(tags=["auth"])
class EuView(generics.RetrieveUpdateAPIView):
    serializer_class = UsuarioSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "head", "options"]

    def get_object(self):
        return self.request.user

    def perform_update(self, serializer):
        antes = serializer.instance.nickname
        usuario = serializer.save()
        if usuario.nickname != antes:
            registrar(
                AcaoAuditoria.NICKNAME_ALTERADO, request=self.request, actor=usuario
            )


@extend_schema(tags=["auth"], responses=None)
class TrocarEmailView(generics.GenericAPIView):
    serializer_class = TrocaEmailSerializer
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "verificacao"

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Senha já conferida no serializer. O `email` só muda na confirmação:
        # até lá login, 2FA e redefinição de senha seguem no endereço atual.
        usuario = request.user
        usuario.email_pendente = serializer.validated_data["email"]
        usuario.save(update_fields=["email_pendente", "updated_at"])

        enviado = enviar_troca_email(usuario, usuario.email_pendente)
        registrar(
            AcaoAuditoria.TROCA_EMAIL_SOLICITADA, request=request, actor=request.user
        )
        return Response({"email_enviado": enviado}, status=status.HTTP_200_OK)


@extend_schema(tags=["auth"], responses=UsuarioSerializer)
class ConfirmarTrocaEmailView(generics.GenericAPIView):
    serializer_class = ConfirmarTrocaEmailSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "verificacao"

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        usuario = serializer.usuario
        if not serializer.posse:
            # Etapa 1: o endereço atual autorizou. O e-mail ainda não muda: o
            # 2º link vai ao endereço novo, para provar que ele é do titular
            # (sem isso, um erro de digitação entregaria a conta a um estranho).
            enviado = enviar_troca_email(usuario, serializer.novo_email, posse=True)
            registrar(
                AcaoAuditoria.TROCA_EMAIL_AUTORIZADA, request=request, actor=usuario
            )
            return Response(
                {"etapa": "posse", "email_enviado": enviado}, status=status.HTTP_200_OK
            )

        # Etapa 2: posse provada. Só aqui o `email` muda e o 2FA passa a olhar
        # para ele.
        usuario.email = serializer.novo_email
        usuario.email_pendente = ""
        usuario.email_verified_at = timezone.now()
        usuario.save(
            update_fields=["email", "email_pendente", "email_verified_at", "updated_at"]
        )
        registrar(
            AcaoAuditoria.TROCA_EMAIL_CONFIRMADA, request=request, actor=usuario
        )

        return Response(UsuarioSerializer(usuario).data, status=status.HTTP_200_OK)


@extend_schema(tags=["auth"], responses=None)
class SenhaEsquecidaView(generics.GenericAPIView):
    serializer_class = SenhaEsquecidaSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "verificacao"

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        usuario = User.objects.filter(
            email=serializer.validated_data["email"], is_active=True
        ).first()
        if usuario is not None:
            enviar_redefinicao(usuario)

        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["auth"], responses=None)
class RedefinirSenhaView(generics.GenericAPIView):
    serializer_class = RedefinirSenhaSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "verificacao"

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        usuario = serializer.usuario
        usuario.set_password(serializer.validated_data["senha"])
        usuario.failed_logins = 0
        usuario.locked_until = None
        usuario.email_verified_at = usuario.email_verified_at or timezone.now()
        # Trocar a senha cancela uma troca de e-mail pendente: é o que o aviso
        # de troca manda fazer se o pedido não foi do titular.
        usuario.email_pendente = ""
        usuario.save(
            update_fields=[
                "password",
                "failed_logins",
                "locked_until",
                "email_verified_at",
                "email_pendente",
                "updated_at",
            ]
        )
        _encerrar_sessoes(usuario)
        registrar(AcaoAuditoria.SENHA_REDEFINIDA, request=request, actor=usuario)

        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["auth"], responses=None)
class ExportarDadosView(APIView):
    """Portabilidade: devolve todos os dados pessoais do titular em JSON."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        dados = exportar_dados(request.user)
        registrar(
            AcaoAuditoria.EXPORTACAO_DADOS, request=request, actor=request.user
        )
        return Response(dados, status=status.HTTP_200_OK)


@extend_schema(tags=["auth"], responses=None)
class ConsentimentosView(APIView):
    """Situação dos documentos legais do titular (versão vigente x aceita)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            status_consentimentos(request.user), status=status.HTTP_200_OK
        )


@extend_schema(tags=["auth"], request=None, responses=None)
class AceitarConsentimentosView(APIView):
    """Re-consentimento: registra o aceite das versões vigentes pendentes."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        ip = request.META.get("REMOTE_ADDR") or None
        novos = AceiteDeTermos.registrar_pendentes(request.user, ip=ip)
        if novos:
            registrar(
                AcaoAuditoria.CONSENTIMENTO_ACEITO,
                request=request,
                actor=request.user,
                documentos=[aceite.documento for aceite in novos],
            )
        return Response(
            status_consentimentos(request.user), status=status.HTTP_200_OK
        )


@extend_schema(tags=["auth"], request=None, responses=None)
class SolicitarExclusaoView(APIView):
    """Passo 1 da exclusão: manda o e-mail de confirmação. Não muda nada na
    conta ainda — a exclusão só acontece quando o link for confirmado."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "verificacao"

    def post(self, request):
        enviado = enviar_confirmacao_exclusao(request.user)
        registrar(
            AcaoAuditoria.EXCLUSAO_SOLICITADA, request=request, actor=request.user
        )
        return Response({"email_enviado": enviado}, status=status.HTTP_200_OK)


@extend_schema(tags=["auth"], responses=None)
class ConfirmarExclusaoView(generics.GenericAPIView):
    """Passo 2 da exclusão: com o token do e-mail e a senha, anonimiza a conta
    na hora (definitivo) e encerra a sessão."""

    serializer_class = ExclusaoConfirmarSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "verificacao"

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        usuario = serializer.usuario
        _encerrar_sessoes(usuario)
        anonimizar_conta(usuario)

        return limpar_sessao(Response(status=status.HTTP_204_NO_CONTENT))


@extend_schema(tags=["auth"])
class LoginMfaView(generics.GenericAPIView):
    """Passo 2 do login: valida o 2º fator e emite a sessão."""

    serializer_class = LoginMfaSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        usuario = serializer.usuario
        usuario.registrar_login_valido()
        registrar(AcaoAuditoria.LOGIN_OK, request=request, actor=usuario)

        refresh = RefreshToken.for_user(usuario)
        resposta = Response(
            {"usuario": UsuarioSerializer(usuario).data}, status=status.HTTP_200_OK
        )
        return gravar_sessao(resposta, str(refresh.access_token), str(refresh))


@extend_schema(tags=["auth"], responses=None)
class MfaStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        config = getattr(request.user, "mfa", None)
        ativo = bool(config and config.ativo)
        return Response(
            {"ativo": ativo, "metodo": config.metodo if ativo else ""},
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["auth"], responses=None)
class MfaIniciarView(generics.GenericAPIView):
    """Prepara o método escolhido (ainda não ativa). APP devolve QR/segredo;
    e-mail dispara o primeiro código."""

    serializer_class = MfaIniciarSerializer
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "verificacao"

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # iniciar_setup desliga o método atual. Com 2FA ativo, trocar de método
        # passa por desativar (que exige código); senão a sessão sozinha
        # desligaria o 2FA e o trocaria pelo do atacante.
        if mfa.mfa_ativo(request.user) is not None:
            raise ValidationError(
                {
                    "detail": ErrorDetail(
                        "Desative o 2FA atual antes de trocar de método.",
                        code="mfa_ja_ativo",
                    )
                }
            )
        dados = mfa.iniciar_setup(request.user, serializer.validated_data["metodo"])
        return Response(dados, status=status.HTTP_200_OK)


@extend_schema(tags=["auth"], responses=None)
class MfaConfirmarView(generics.GenericAPIView):
    """Confirma o código e ativa o 2FA, devolvendo os códigos de recuperação."""

    serializer_class = MfaCodigoSerializer
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "verificacao"

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        codigos = mfa.confirmar_setup(
            request.user, serializer.validated_data["codigo"]
        )
        if codigos is None:
            raise ValidationError(
                {
                    "codigo": ErrorDetail(
                        "Código incorreto ou expirado.", code="codigo_invalido"
                    )
                }
            )

        registrar(AcaoAuditoria.MFA_ATIVADO, request=request, actor=request.user)
        return Response(
            {"codigos_recuperacao": codigos}, status=status.HTTP_200_OK
        )


@extend_schema(tags=["auth"], responses=None)
class MfaDesativarIniciarView(APIView):
    """Dispara o código por e-mail para confirmar a desativação, quando o
    método ativo é e-mail. Para app/recuperação não há nada a enviar."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "verificacao"

    def post(self, request, *args, **kwargs):
        if mfa.mfa_ativo(request.user) is None:
            raise ValidationError(
                {
                    "detail": ErrorDetail(
                        "O 2FA não está ativo.", code="mfa_inativo"
                    )
                }
            )
        enviado = mfa.iniciar_desafio_desativacao(request.user)
        return Response({"email_enviado": enviado}, status=status.HTTP_200_OK)


@extend_schema(tags=["auth"], responses=None)
class MfaDesativarView(generics.GenericAPIView):
    """Desativa o 2FA (exige um código válido, ou de recuperação)."""

    serializer_class = MfaCodigoSerializer
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "verificacao"

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not mfa.desativar(request.user, serializer.validated_data["codigo"]):
            raise ValidationError(
                {
                    "codigo": ErrorDetail(
                        "Código incorreto ou expirado.", code="codigo_invalido"
                    )
                }
            )

        registrar(AcaoAuditoria.MFA_DESATIVADO, request=request, actor=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)
