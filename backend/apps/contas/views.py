from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.exceptions import NotAuthenticated
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
    LoginSerializer,
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
        if not ja_confirmado:
            usuario.marcar_email_verificado()
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

        enviado = enviar_troca_email(request.user, serializer.validated_data["email"])
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
        usuario.email = serializer.novo_email
        usuario.email_verified_at = timezone.now()
        usuario.save(update_fields=["email", "email_verified_at", "updated_at"])
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
        usuario.save(
            update_fields=[
                "password",
                "failed_logins",
                "locked_until",
                "email_verified_at",
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
