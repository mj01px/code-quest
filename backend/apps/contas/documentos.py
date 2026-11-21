import re
from dataclasses import dataclass
from datetime import date

from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

VERSAO_MAX_LENGTH = 20
VERSAO_FORMATO = re.compile(r"^\d{1,4}(\.\d{1,4}){0,3}$")


class Documento(models.TextChoices):

    TERMOS = "TERMOS", _("Termos de Uso")
    PRIVACIDADE = "PRIVACIDADE", _("Política de Privacidade")


CAMINHOS: dict[str, str] = {
    Documento.TERMOS: "/termos",
    Documento.PRIVACIDADE: "/privacidade",
}


@dataclass(frozen=True)
class DocumentoVigente:
    documento: str
    versao: str
    vigente_desde: date
    conteudo: str | None = None

    @property
    def caminho(self) -> str:
        return CAMINHOS[self.documento]


def chave_da_versao(versao: str) -> tuple[int, ...]:
    partes = [int(parte) for parte in versao.split(".")]
    while len(partes) > 1 and partes[-1] == 0:
        partes.pop()
    return tuple(partes)


def vigente(documento: str, hoje: date | None = None) -> DocumentoVigente | None:
    from .models import VersaoDeDocumento

    hoje = hoje or timezone.localdate()
    versao = (
        VersaoDeDocumento.objects.publicadas()
        .filter(documento=documento, vigente_desde__lte=hoje)
        .order_by("-vigente_desde", "-publicado_em")
        .only("documento", "versao", "vigente_desde", "conteudo")
        .first()
    )
    if versao is None:
        return None
    return DocumentoVigente(
        documento=versao.documento,
        versao=versao.versao,
        vigente_desde=versao.vigente_desde,
        conteudo=versao.conteudo,
    )


def vigentes(hoje: date | None = None) -> dict[str, DocumentoVigente]:
    from .models import VersaoDeDocumento

    hoje = hoje or timezone.localdate()
    resultado: dict[str, DocumentoVigente] = {}
    for documento, versao, vigente_desde in (
        VersaoDeDocumento.objects.publicadas()
        .filter(vigente_desde__lte=hoje)
        .order_by("documento", "-vigente_desde", "-publicado_em")
        .values_list("documento", "versao", "vigente_desde")
    ):
        resultado.setdefault(
            documento,
            DocumentoVigente(
                documento=documento, versao=versao, vigente_desde=vigente_desde
            ),
        )
    return resultado


def versao_vigente(documento: str) -> str | None:
    atual = vigente(documento)
    return atual.versao if atual else None


def descrever(documento: str, *, com_conteudo: bool = False) -> dict | None:
    atual = vigente(documento)
    if atual is None:
        return None
    dados = {
        "documento": str(documento),
        "rotulo": str(Documento(documento).label),
        "versao": atual.versao,
        "vigente_desde": atual.vigente_desde,
        "caminho": atual.caminho,
    }
    if com_conteudo:
        dados["conteudo"] = atual.conteudo
    return dados


def status_consentimentos(user) -> list[dict]:
    """Situação de cada documento legal para o usuário: versão vigente, versão
    que ele aceitou e se há pendência (a versão vigente mudou desde o aceite).
    """
    from .models import AceiteDeTermos  # lazy: models.py importa este módulo

    ultima_aceita: dict[str, str] = {}
    for documento, versao in (
        AceiteDeTermos.objects.filter(user=user)
        .order_by("aceito_em")
        .values_list("documento", "versao")
    ):
        ultima_aceita[documento] = versao  # o mais recente sobrescreve

    situacao = []
    for documento, atual in vigentes().items():
        aceita = ultima_aceita.get(documento)
        situacao.append(
            {
                "documento": str(documento),
                "rotulo": str(Documento(documento).label),
                "versao_vigente": atual.versao,
                "versao_aceita": aceita,
                "caminho": atual.caminho,
                "pendente": aceita != atual.versao,
            }
        )
    return situacao
