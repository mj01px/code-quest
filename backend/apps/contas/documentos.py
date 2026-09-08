"""
Documentos legais vigentes.

Esta é a única fonte da verdade sobre qual versão está publicada. Ao subir um
texto novo, altere a versão aqui: o cadastro passa a exigir o aceite dela e as
linhas antigas de `AceiteDeTermos` continuam apontando para a versão anterior,
que é justamente o que prova qual texto a pessoa leu na época.

A versão mora no código, e não em variável de ambiente, porque ela precisa
andar junto com o texto publicado no frontend. Se as duas coisas puderem
divergir por configuração, o aceite deixa de provar qualquer coisa.
"""

from dataclasses import dataclass
from datetime import date

from django.db import models
from django.utils.translation import gettext_lazy as _

VERSAO_MAX_LENGTH = 20


class Documento(models.TextChoices):

    TERMOS = "TERMOS", _("Termos de Uso")
    PRIVACIDADE = "PRIVACIDADE", _("Protocolo de Dados")


@dataclass(frozen=True)
class DocumentoVigente:
    """O que o frontend precisa saber para exibir e para ecoar no aceite."""

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
    """Monta o payload público de um documento."""
    vigente = VIGENTES[documento]
    return {
        "documento": str(documento),
        "rotulo": str(Documento(documento).label),
        "versao": vigente.versao,
        "vigente_desde": vigente.vigente_desde,
        "caminho": vigente.caminho,
    }
