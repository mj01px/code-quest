import re
import unicodedata
from functools import lru_cache

from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

from . import palavras_proibidas

NOME_MIN_LENGTH = 3
NOME_MAX_LENGTH = 24
DESCRICAO_MAX_LENGTH = 200

# À-ÿ quebrado em dois pra deixar × e ÷ de fora
_NOME_PERMITIDO = re.compile(r"^[A-Za-zÀ-ÖØ-öø-ÿ0-9 ]+$")

# pega "b0b0" -> "bobo"
_LEET = str.maketrans(
    {
        "0": "o",
        "1": "i",
        "!": "i",
        "3": "e",
        "4": "a",
        "5": "s",
        "7": "t",
        "@": "a",
        "$": "s",
    }
)


def normalizar_nome(valor: str) -> str:
    return " ".join(valor.split())


def normalizar(texto: str) -> list[str]:
    # compara palavra inteira, letras soltas ("b o b o") são juntadas
    # e letra repetida vira uma só ("merdaaa" -> "merda")
    sem_acento = (
        unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    )
    partes = [
        re.sub(r"(.)\1+", r"\1", parte)
        for parte in re.split(r"[^a-z0-9]+", sem_acento.lower().translate(_LEET))
        if parte
    ]

    palavras: list[str] = []
    soltas: list[str] = []
    for parte in partes:
        if len(parte) == 1:
            soltas.append(parte)
            continue
        if soltas:
            palavras.append("".join(soltas))
            soltas = []
        palavras.append(parte)
    if soltas:
        palavras.append("".join(soltas))
    return palavras


@lru_cache(maxsize=4)
def _preparar(proibidas: frozenset[str]) -> tuple[frozenset[str], tuple]:
    """Separa palavras soltas de frases. Frase também vale toda junta ("filhodaputa")."""
    palavras: set[str] = set()
    frases = []
    for termo in proibidas:
        partes = normalizar(termo)
        if len(partes) > 1:
            frases.append(tuple(partes))
        palavras.add("".join(partes))
    return frozenset(palavras), tuple(frases)


def _singulares(palavra: str) -> tuple[str, ...]:
    # "merdas" -> "merda", "cuzoes" -> "cuzao", "mongois" -> "mongol"
    formas = [palavra, palavra.removesuffix("s")]
    if palavra.endswith("oes"):
        formas.append(palavra[:-3] + "ao")
    if palavra.endswith("is"):
        formas.append(palavra[:-2] + "l")
    return tuple(formas)


def contem_termo_proibido(texto: str) -> bool:
    palavras, frases = _preparar(palavras_proibidas.PALAVRAS_PROIBIDAS)
    encontradas = normalizar(texto)
    if any(forma in palavras for p in encontradas for forma in _singulares(p)):
        return True
    return any(
        tuple(encontradas[i : i + len(frase)]) == frase
        for frase in frases
        for i in range(len(encontradas) - len(frase) + 1)
    )


def validar_sem_palavras_proibidas(valor: str) -> None:
    if contem_termo_proibido(valor):
        raise ValidationError(
            _("Este texto contém um termo não permitido."),
            code="termo_proibido",
        )


def validar_nome(valor: str) -> None:
    if valor != normalizar_nome(valor):
        raise ValidationError(
            _("O nome não pode ter espaços nas bordas nem espaços repetidos."),
            code="nome_espacos",
        )
    if not NOME_MIN_LENGTH <= len(valor) <= NOME_MAX_LENGTH:
        raise ValidationError(
            _("O nome precisa ter entre %(min)d e %(max)d caracteres."),
            code="nome_tamanho",
            params={"min": NOME_MIN_LENGTH, "max": NOME_MAX_LENGTH},
        )
    if not _NOME_PERMITIDO.match(valor):
        raise ValidationError(
            _("O nome pode conter apenas letras, números e espaços."),
            code="nome_invalido",
        )
    validar_sem_palavras_proibidas(valor)
