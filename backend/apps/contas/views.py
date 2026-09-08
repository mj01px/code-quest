from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .documentos import Documento, descrever
from .serializers import (
    DocumentosLegaisSerializer,
    LoginSerializer,
    RegistroSerializer,
    UsuarioSerializer,
)


def _par_de_tokens(usuario):
    refresh = RefreshToken.for_user(usuario)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


@extend_schema(tags=["auth"], responses=DocumentosLegaisSerializer)
class DocumentosLegaisView(APIView):
    """
    Versão vigente dos documentos que o cadastro exige aceitar.

    Leitura pública porque a tela de cadastro consome antes de existir conta.
    O frontend devolve estas mesmas versões no registro, e o serializer recusa
    se não baterem: é assim que uma aba aberta há dias não aceita texto velho.
    """

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
        usuario = serializer.save()
        corpo = {"usuario": UsuarioSerializer(usuario).data, **_par_de_tokens(usuario)}
        return Response(corpo, status=status.HTTP_201_CREATED)


@extend_schema(tags=["auth"])
class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"


@extend_schema(tags=["auth"])
class RenovarView(TokenRefreshView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"


@extend_schema(tags=["auth"])
class EuView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UsuarioSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_object(self):
        return self.request.user

    def perform_destroy(self, instance):
        instance.request_deletion()
