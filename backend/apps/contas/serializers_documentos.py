from rest_framework import serializers
from rest_framework.exceptions import ErrorDetail, ValidationError

from .documentos import CAMINHOS, Documento
from .models import VersaoDeDocumento
from .publicacao_documentos import CONTEUDO_MAX_LENGTH, validar_versao_nova


class VersaoDeDocumentoSerializer(serializers.ModelSerializer):
    documento = serializers.ChoiceField(choices=Documento.choices)
    rotulo = serializers.CharField(source="get_documento_display", read_only=True)
    conteudo = serializers.CharField(
        max_length=CONTEUDO_MAX_LENGTH, trim_whitespace=False
    )
    criado_por = serializers.SerializerMethodField()
    publicado_por = serializers.SerializerMethodField()
    vigente = serializers.SerializerMethodField()

    class Meta:
        model = VersaoDeDocumento
        fields = (
            "id",
            "documento",
            "rotulo",
            "versao",
            "conteudo",
            "situacao",
            "vigente_desde",
            "vigente",
            "criado_por",
            "criado_em",
            "atualizado_em",
            "publicado_por",
            "publicado_em",
        )
        read_only_fields = (
            "id",
            "situacao",
            "criado_em",
            "atualizado_em",
            "publicado_em",
        )
        validators: list = []

    def get_criado_por(self, obj: VersaoDeDocumento) -> str | None:
        return obj.criado_por.nickname if obj.criado_por else None

    def get_publicado_por(self, obj: VersaoDeDocumento) -> str | None:
        return obj.publicado_por.nickname if obj.publicado_por else None

    def get_vigente(self, obj: VersaoDeDocumento) -> bool:
        vigentes = self.context.get("vigentes", {})
        atual = vigentes.get(obj.documento)
        return bool(obj.publicada and atual is not None and atual.versao == obj.versao)

    def validate(self, attrs):
        instancia = self.instance
        if instancia is not None:
            if "documento" in attrs and attrs["documento"] != instancia.documento:
                raise ValidationError(
                    {
                        "documento": [
                            ErrorDetail(
                                "O documento de um rascunho não pode ser trocado.",
                                code="documento_imutavel",
                            )
                        ]
                    }
                )
        else:
            documento = attrs.get("documento")
            if VersaoDeDocumento.objects.rascunhos().filter(documento=documento).exists():
                raise ValidationError(
                    {
                        "documento": [
                            ErrorDetail(
                                "Já existe um rascunho deste documento. Edite ou "
                                "exclua o rascunho antes de criar outro.",
                                code="rascunho_existente",
                            )
                        ]
                    }
                )

        def campo(nome):
            return attrs.get(nome, getattr(instancia, nome, None))

        validar_versao_nova(
            documento=campo("documento"),
            versao=campo("versao"),
            vigente_desde=campo("vigente_desde"),
            conteudo=campo("conteudo"),
            ignorar_pk=instancia.pk if instancia else None,
        )
        return attrs


class HistoricoDocumentoSerializer(serializers.Serializer):
    versao = serializers.CharField()
    vigente_desde = serializers.DateField()


class DocumentoLegalCompletoSerializer(serializers.Serializer):
    documento = serializers.ChoiceField(choices=Documento.choices)
    rotulo = serializers.CharField()
    versao = serializers.CharField()
    vigente_desde = serializers.DateField()
    caminho = serializers.CharField()
    conteudo = serializers.CharField()
    vigente = serializers.BooleanField()
    historico = HistoricoDocumentoSerializer(many=True)


DOCUMENTO_POR_SLUG: dict[str, str] = {
    caminho.strip("/"): documento for documento, caminho in CAMINHOS.items()
}
