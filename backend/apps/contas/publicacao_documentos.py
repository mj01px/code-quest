from datetime import date

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ErrorDetail, ValidationError

from apps.auditoria.services import AcaoAuditoria, registrar

from .documentos import VERSAO_FORMATO, chave_da_versao
from .models import VersaoDeDocumento

CONTEUDO_MAX_LENGTH = 100_000


def _erro(campo: str, mensagem: str, codigo: str) -> ValidationError:
    return ValidationError({campo: [ErrorDetail(mensagem, code=codigo)]})


def ultima_publicada(documento: str) -> VersaoDeDocumento | None:
    publicadas = list(VersaoDeDocumento.objects.publicadas().filter(documento=documento))
    if not publicadas:
        return None
    return max(publicadas, key=lambda v: chave_da_versao(v.versao))


def validar_versao_nova(
    *,
    documento: str,
    versao: str,
    vigente_desde: date,
    conteudo: str,
    ignorar_pk=None,
) -> None:
    if not VERSAO_FORMATO.match(versao):
        raise _erro(
            "versao",
            "Use números separados por ponto, como 1.4 ou 2.0.1.",
            "versao_invalida",
        )

    mesma_versao = VersaoDeDocumento.objects.filter(documento=documento, versao=versao)
    if ignorar_pk is not None:
        mesma_versao = mesma_versao.exclude(pk=ignorar_pk)
    if mesma_versao.exists():
        raise _erro("versao", f"A versão {versao} já existe.", "versao_existente")

    anterior = ultima_publicada(documento)
    if anterior is not None and chave_da_versao(versao) <= chave_da_versao(anterior.versao):
        raise _erro(
            "versao",
            f"A versão precisa ser maior que a {anterior.versao}, a última publicada.",
            "versao_nao_e_maior",
        )

    if vigente_desde < timezone.localdate():
        raise _erro(
            "vigente_desde",
            "A data de vigência não pode estar no passado.",
            "vigencia_no_passado",
        )
    if anterior is not None and vigente_desde < anterior.vigente_desde:
        raise _erro(
            "vigente_desde",
            "A data de vigência não pode ser anterior à da versão "
            f"{anterior.versao}.",
            "vigencia_anterior",
        )

    if not any(linha.startswith("## ") for linha in conteudo.splitlines()):
        raise _erro(
            "conteudo",
            "O documento precisa de pelo menos uma seção começando com \"## \".",
            "conteudo_sem_secao",
        )


def publicar(rascunho: VersaoDeDocumento, *, request) -> VersaoDeDocumento:
    with transaction.atomic():
        versao = VersaoDeDocumento.objects.select_for_update().get(pk=rascunho.pk)
        if versao.publicada:
            raise _erro("detail", "Esta versão já foi publicada.", "versao_publicada")

        validar_versao_nova(
            documento=versao.documento,
            versao=versao.versao,
            vigente_desde=versao.vigente_desde,
            conteudo=versao.conteudo,
            ignorar_pk=versao.pk,
        )

        versao.situacao = VersaoDeDocumento.Situacao.PUBLICADA
        versao.publicado_em = timezone.now()
        versao.publicado_por = request.user
        versao.save()

        registrar(
            AcaoAuditoria.DOCUMENTO_PUBLICADO,
            request=request,
            alvo=versao,
            documento=versao.documento,
            versao=versao.versao,
            vigente_desde=versao.vigente_desde.isoformat(),
        )
    return versao
