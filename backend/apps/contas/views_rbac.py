"""Endpoints do painel de RBAC do admin (restritos a administradores).

Catálogo de permissões (leitura), CRUD de níveis de acesso e atribuição de um
nível a um usuário. Tudo protegido por `IsAdmin`, já que o painel inteiro é do admin.
"""

import logging

from django.core.cache import cache
from django.db import transaction
from django.db.models import Count, Q
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, status
from rest_framework.exceptions import ErrorDetail, ValidationError
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from apps.auditoria.services import AcaoAuditoria, registrar
from apps.core.permissions import HasPerm, IsAdmin

from .lgpd import anonimizar_conta
from .mfa import mfa_ativo, verificar_codigo
from .models import ConfiguracaoMFA, NivelDeAcesso, Permissao, User
from .serializers_rbac import (
    AtribuirNivelSerializer,
    NivelDeAcessoSerializer,
    PermissaoSerializer,
    SituacaoContaSerializer,
    UsuarioAdminSerializer,
)
from .views import _encerrar_sessoes


def _niveis_com_contagem():
    return NivelDeAcesso.objects.annotate(
        qtd_usuarios=Count("usuarios")
    ).prefetch_related("permissoes")


def _retrato(nivel):
    # Estado auditável de um nível: o que o painel deixa editar.
    return {
        "nome": nivel.nome,
        "descricao": nivel.descricao,
        "acesso_admin": nivel.acesso_admin,
        "permissoes": sorted(nivel.permissoes.values_list("codename", flat=True)),
    }


def _ref_nivel(nivel):
    return None if nivel is None else {"id": str(nivel.pk), "nome": nivel.nome}


logger = logging.getLogger(__name__)

# Passo do TOTP (30 s) vezes a janela aceita (±1) em mfa.verificar_totp.
TOTP_JANELA_S = 90


def _recusar(mensagem, codigo):
    raise ValidationError({"detail": ErrorDetail(mensagem, code=codigo)})


@extend_schema(tags=["admin"])
class PermissaoListView(generics.ListAPIView):
    """Catálogo de permissões concedíveis, para montar a UI de níveis."""

    permission_classes = [IsAdmin]
    serializer_class = PermissaoSerializer
    pagination_class = None
    queryset = Permissao.objects.all()


@extend_schema(tags=["admin"])
class NivelListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdmin]
    serializer_class = NivelDeAcessoSerializer
    pagination_class = None

    def get_queryset(self):
        return _niveis_com_contagem()

    def perform_create(self, serializer):
        with transaction.atomic():
            nivel = serializer.save()
            registrar(
                AcaoAuditoria.NIVEL_CRIADO,
                request=self.request,
                alvo=nivel,
                **_retrato(nivel),
            )


@extend_schema(tags=["admin"])
class NivelDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdmin]
    serializer_class = NivelDeAcessoSerializer

    def get_queryset(self):
        return _niveis_com_contagem()

    def perform_update(self, serializer):
        # Mesma trava do UsuarioNivelView: editar as permissões do próprio nível
        # é se promover (ou se trancar fora) por outro caminho.
        if serializer.instance.pk == self.request.user.nivel_de_acesso_id:
            _recusar(
                "Você não pode editar o seu próprio nível de acesso. Peça a outro "
                "administrador.",
                "proprio_nivel",
            )
        with transaction.atomic():
            antes = _retrato(serializer.instance)
            nivel = serializer.save()
            depois = _retrato(nivel)
            mudou = [campo for campo in antes if antes[campo] != depois[campo]]
            if mudou:  # PATCH sem diff real não é edição: sem registro.
                registrar(
                    AcaoAuditoria.NIVEL_EDITADO,
                    request=self.request,
                    alvo=nivel,
                    antes={campo: antes[campo] for campo in mudou},
                    depois={campo: depois[campo] for campo in mudou},
                )

    def perform_destroy(self, instance):
        if instance.sistema:
            raise ValidationError(
                {
                    "detail": ErrorDetail(
                        "Níveis de sistema não podem ser removidos.",
                        code="nivel_sistema",
                    )
                }
            )
        if instance.usuarios.exists():
            raise ValidationError(
                {
                    "detail": ErrorDetail(
                        "Há usuários neste nível. Reatribua-os antes de remover.",
                        code="nivel_em_uso",
                    )
                }
            )
        with transaction.atomic():
            # Registra antes: depois do delete() o nível perde o pk.
            registrar(
                AcaoAuditoria.NIVEL_REMOVIDO,
                request=self.request,
                alvo=instance,
                **_retrato(instance),
            )
            instance.delete()


@extend_schema(
    tags=["admin"],
    parameters=[
        OpenApiParameter(
            "q", str, description="Busca em nickname, e-mail ou nome do nível."
        )
    ],
)
class UsuarioListView(generics.ListAPIView):
    """Todos os usuários com nickname, e-mail, cadastro, papel e nível."""

    permission_classes = [IsAdmin]
    serializer_class = UsuarioAdminSerializer
    pagination_class = None

    def get_queryset(self):
        usuarios = User.objects.select_related("nivel_de_acesso").order_by(
            "-created_at"
        )
        termo = self.request.query_params.get("q", "").strip()
        if termo:
            usuarios = usuarios.filter(
                Q(nickname__icontains=termo)
                | Q(email__icontains=termo)
                | Q(nivel_de_acesso__nome__icontains=termo)
            )
        return usuarios


@extend_schema(tags=["admin"])
class UsuarioDetailView(generics.DestroyAPIView):
    """Exclusão de usuário pelo admin, por anonimização (LGPD), nunca DELETE.

    Mesmo serviço da autoexclusão: embaralha a PII e mantém progresso e
    agregados. 204 também para conta já anonimizada (idempotente).

    Ação irreversível, então exige `{"totp_code": "123456"}` do aplicativo
    autenticador do próprio admin. Código de recuperação não vale aqui: é de
    uso único e serve para recuperar acesso, não para autorizar exclusão.
    """

    permission_classes = [IsAdmin]
    # 5/min: o código tem 6 dígitos, o balde curto fecha a força bruta.
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "verificacao"
    queryset = User.objects.select_related("nivel_de_acesso")

    def perform_destroy(self, instance):
        # Sem esta trava o admin se tranca fora do painel em um clique.
        if instance.pk == self.request.user.pk:
            _recusar("Você não pode excluir a própria conta pelo painel.", "auto_exclusao")
        # Contas da equipe (nível com acesso ao painel) não se excluem por aqui:
        # rebaixe o nível antes, o que já fica registrado na auditoria.
        if instance.nivel_de_acesso_id and instance.nivel_de_acesso.acesso_admin:
            _recusar(
                "Administradores não podem ser excluídos. Rebaixe o nível antes.",
                "alvo_admin",
            )

        admin = self.request.user
        config = mfa_ativo(admin)
        if config is None or config.metodo != ConfiguracaoMFA.Metodo.APP:
            _recusar(
                "Ative a verificação em duas etapas por aplicativo autenticador "
                "para excluir usuários.",
                "mfa_necessario",
            )
        # Corpo que não é objeto JSON (`[]`, `"x"`) vira "sem código", não 500.
        dados = self.request.data if isinstance(self.request.data, dict) else {}
        codigo = str(dados.get("totp_code") or "").strip()
        if not verificar_codigo(admin, codigo, permitir_recuperacao=False):
            logger.warning("2FA inválido na exclusão de usuário (admin=%s)", admin.pk)
            _recusar("Código do autenticador inválido.", "totp_invalido")
        # O TOTP vale ~90 s: sem isto o mesmo código autorizaria outras exclusões.
        # ponytail: cache local por processo; com vários workers, use cache compartilhado.
        if not cache.add(f"totp-exclusao:{admin.pk}:{codigo}", 1, timeout=TOTP_JANELA_S):
            _recusar("Este código já foi usado. Aguarde o próximo.", "totp_invalido")

        with transaction.atomic():
            # A prova obrigatória já diz qual admin pediu; a linha abaixo põe o
            # admin como autor, para aparecer na atividade dele.
            if anonimizar_conta(instance, por_admin=str(admin.pk), com_2fa=True):
                registrar(
                    AcaoAuditoria.CONTA_ANONIMIZADA,
                    request=self.request,
                    alvo=instance,
                    por_admin=str(admin.pk),
                    com_2fa=True,
                )


@extend_schema(tags=["admin"], responses=UsuarioAdminSerializer)
class UsuarioNivelView(generics.GenericAPIView):
    """Atribui (ou remove) o nível de acesso de um usuário."""

    permission_classes = [IsAdmin]
    serializer_class = AtribuirNivelSerializer
    queryset = User.objects.select_related("nivel_de_acesso")

    def patch(self, request, *args, **kwargs):
        usuario = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        novo_nivel = serializer.validated_data["nivel_de_acesso"]

        # Trava de segurança: o admin não mexe no próprio nível, nem para outro
        # nível com acesso ao painel (que pode ter menos permissões). Outro admin
        # pode mudá-lo; a recuperação final é o createsuperuser, que sempre cai
        # no nível "Admin".
        if usuario.pk == request.user.pk:
            raise ValidationError(
                {
                    "detail": ErrorDetail(
                        "Você não pode alterar seu próprio nível. Peça a outro "
                        "administrador.",
                        code="auto_rebaixamento",
                    )
                }
            )

        anterior = usuario.nivel_de_acesso
        with transaction.atomic():
            usuario.nivel_de_acesso = novo_nivel
            usuario.save(update_fields=["nivel_de_acesso"])
            registrar(
                AcaoAuditoria.NIVEL_ATRIBUIDO,
                request=request,
                alvo=usuario,
                nivel_anterior=_ref_nivel(anterior),
                nivel_novo=_ref_nivel(novo_nivel),
            )
        usuario.invalidar_cache_permissoes()

        return Response(
            UsuarioAdminSerializer(usuario).data, status=status.HTTP_200_OK
        )


@extend_schema(tags=["admin"], responses=UsuarioAdminSerializer)
class UsuarioSituacaoView(generics.GenericAPIView):
    """Suspende (`ativo: false`) ou reativa (`ativo: true`) uma conta (RF34).

    Conta suspensa não autentica e perde as sessões abertas na hora.
    """

    permission_classes = [IsAdmin, HasPerm("usuarios.suspend")]
    serializer_class = SituacaoContaSerializer
    queryset = User.objects.select_related("nivel_de_acesso")

    def patch(self, request, *args, **kwargs):
        usuario = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ativo = serializer.validated_data["ativo"]

        # Mesmas travas da exclusão: ninguém se tranca fora nem tranca a equipe.
        if usuario.pk == request.user.pk:
            _recusar("Você não pode suspender a própria conta.", "auto_suspensao")
        if usuario.nivel_de_acesso_id and usuario.nivel_de_acesso.acesso_admin:
            _recusar(
                "Administradores não podem ser suspensos. Rebaixe o nível antes.",
                "alvo_admin",
            )
        # Conta anonimizada também é inativa, mas reativá-la não devolve o titular.
        if usuario.is_anonymized:
            _recusar("Conta anonimizada não pode ser reativada.", "conta_anonimizada")

        if usuario.is_active != ativo:
            with transaction.atomic():
                usuario.is_active = ativo
                usuario.save(update_fields=["is_active", "updated_at"])
                if not ativo:
                    _encerrar_sessoes(usuario)
                registrar(
                    AcaoAuditoria.CONTA_REATIVADA if ativo else AcaoAuditoria.CONTA_SUSPENSA,
                    request=request,
                    alvo=usuario,
                )

        return Response(
            UsuarioAdminSerializer(usuario).data, status=status.HTTP_200_OK
        )
