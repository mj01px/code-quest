from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, status
from rest_framework.exceptions import ErrorDetail, NotFound, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import HasPerm, IsAdmin

from .documentos import CAMINHOS, Documento, vigente, vigentes
from .models import VersaoDeDocumento
from .publicacao_documentos import publicar
from .serializers_documentos import (
    DOCUMENTO_POR_SLUG,
    DocumentoLegalCompletoSerializer,
    VersaoDeDocumentoSerializer,
)

PERMISSOES_DE_GESTAO = [IsAdmin, HasPerm("documentos.manage")]


def _versoes():
    return VersaoDeDocumento.objects.select_related("criado_por", "publicado_por")


class _ComVigentes:
    def get_serializer_context(self):
        contexto = super().get_serializer_context()
        contexto["vigentes"] = vigentes()
        return contexto


@extend_schema(tags=["auth"])
class DocumentoLegalView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        parameters=[OpenApiParameter("versao", str, required=False)],
        responses=DocumentoLegalCompletoSerializer,
    )
    def get(self, request: Request, slug: str) -> Response:
        documento = DOCUMENTO_POR_SLUG.get(slug)
        if documento is None:
            raise NotFound("Documento não encontrado.")

        atual = vigente(documento)
        historico = list(
            VersaoDeDocumento.objects.publicadas()
            .filter(documento=documento, vigente_desde__lte=timezone.localdate())
            .order_by("-vigente_desde", "-publicado_em")
            .values("versao", "vigente_desde")
        )

        pedida = request.query_params.get("versao")
        if pedida:
            escolhida = next((v for v in historico if v["versao"] == pedida), None)
            if escolhida is None:
                raise NotFound("Versão não encontrada.")
            versao = VersaoDeDocumento.objects.get(documento=documento, versao=pedida)
            conteudo, vigente_desde = versao.conteudo, versao.vigente_desde
        elif atual is not None:
            pedida, conteudo, vigente_desde = atual.versao, atual.conteudo, atual.vigente_desde
        else:
            raise NotFound("Documento não encontrado.")

        dados = {
            "documento": documento,
            "rotulo": str(Documento(documento).label),
            "versao": pedida,
            "vigente_desde": vigente_desde,
            "caminho": CAMINHOS[documento],
            "conteudo": conteudo,
            "vigente": atual is not None and atual.versao == pedida,
            "historico": historico,
        }
        return Response(DocumentoLegalCompletoSerializer(dados).data)


@extend_schema(tags=["admin"])
class VersaoDeDocumentoListCreateView(_ComVigentes, generics.ListCreateAPIView):
    permission_classes = PERMISSOES_DE_GESTAO
    serializer_class = VersaoDeDocumentoSerializer
    pagination_class = None

    def get_queryset(self):
        return _versoes()

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user)


@extend_schema(tags=["admin"])
class VersaoDeDocumentoDetailView(_ComVigentes, generics.RetrieveUpdateDestroyAPIView):
    permission_classes = PERMISSOES_DE_GESTAO
    serializer_class = VersaoDeDocumentoSerializer
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return _versoes()

    def _recusar_publicada(self, instance, mensagem):
        if instance.publicada:
            raise ValidationError(
                {"detail": ErrorDetail(mensagem, code="versao_publicada")}
            )

    def update(self, request, *args, **kwargs):
        self._recusar_publicada(
            self.get_object(), "Versão publicada não pode ser alterada."
        )
        return super().update(request, *args, **kwargs)

    def perform_destroy(self, instance):
        self._recusar_publicada(instance, "Versão publicada não pode ser excluída.")
        instance.delete()


@extend_schema(tags=["admin"], request=None, responses=VersaoDeDocumentoSerializer)
class PublicarVersaoDeDocumentoView(_ComVigentes, generics.GenericAPIView):
    permission_classes = PERMISSOES_DE_GESTAO
    serializer_class = VersaoDeDocumentoSerializer

    def get_queryset(self):
        return _versoes()

    def post(self, request: Request, *args, **kwargs) -> Response:
        versao = publicar(self.get_object(), request=request)
        return Response(
            self.get_serializer(versao).data, status=status.HTTP_200_OK
        )
