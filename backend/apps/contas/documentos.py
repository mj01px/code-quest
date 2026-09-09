from dataclasses import dataclass
from datetime import date

from django.db import models
from django.utils.translation import gettext_lazy as _

VERSAO_MAX_LENGTH = 20


class Documento(models.TextChoices):

    TERMOS = "TERMOS", _("Termos de Uso")
    PRIVACIDADE = "PRIVACIDADE", _("Política de Privacidade")


@dataclass(frozen=True)
class DocumentoVigente:
    versao: str
    vigente_desde: date
    caminho: str


VIGENTES: dict[str, DocumentoVigente] = {
    Documento.TERMOS: DocumentoVigente(
        versao="1.0",
        vigente_desde=date(2026, 9, 8),
        caminho="/termos",
    ),
    Documento.PRIVACIDADE: DocumentoVigente(
        versao="1.0",
        vigente_desde=date(2026, 9, 8),
        caminho="/privacidade",
    ),
}


def versao_vigente(documento: str) -> str:
    return VIGENTES[documento].versao


def descrever(documento: str) -> dict:
    vigente = VIGENTES[documento]
    return {
        "documento": str(documento),
        "rotulo": str(Documento(documento).label),
        "versao": vigente.versao,
        "vigente_desde": vigente.vigente_desde,
        "caminho": vigente.caminho,
    }
