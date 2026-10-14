from typing import Literal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import QuerySet
from django.http import Http404
from rest_framework.request import Request

from apps.auditoria.services import AcaoAuditoria, registrar
from apps.trilhas.models import Aula, Exercicio, StatusEditorial, Trilha

type Conteudo = Trilha | Aula | Exercicio
type Acao = Literal["submeter", "aprovar", "devolver", "publicar"]

# Segmento da URL para o model. A rota só aceita estas três chaves.
MODELOS: dict[str, type[Conteudo]] = {
    "trilhas": Trilha,
    "aulas": Aula,
    "exercicios": Exercicio,
}

# Única fonte das transições válidas:
# (estado exigido, estado resultante, código na trilha de auditoria).
TRANSICOES: dict[Acao, tuple[StatusEditorial, StatusEditorial, AcaoAuditoria]] = {
    "submeter": (
        StatusEditorial.RASCUNHO,
        StatusEditorial.REVISAO,
        AcaoAuditoria.CONTEUDO_SUBMETIDO,
    ),
    "aprovar": (
        StatusEditorial.REVISAO,
        StatusEditorial.APROVADO,
        AcaoAuditoria.CONTEUDO_APROVADO,
    ),
    "devolver": (
        StatusEditorial.REVISAO,
        StatusEditorial.RASCUNHO,
        AcaoAuditoria.CONTEUDO_DEVOLVIDO,
    ),
    "publicar": (
        StatusEditorial.APROVADO,
        StatusEditorial.PUBLICADO,
        AcaoAuditoria.CONTEUDO_PUBLICADO,
    ),
}


def exercicios_para_autoria() -> QuerySet[Exercicio]:
    """Todos os exercícios, sem filtro editorial.

    A rota de autoria não usa `publicados()` de propósito: quem tem
    `trilhas.view_solution` precisa revisar a solução antes de publicar, e
    filtrar por status deixaria a rota inútil justo nesse momento.
    """
    return Exercicio.objects.select_related("trilha").all()


def transicionar(
    modelo: type[Conteudo], pk: int, acao: Acao, request: Request
) -> Conteudo:
    """Aplica `acao` ao conteúdo, ou recusa se o estado atual não a permite.

    A linha fica travada entre a leitura e a gravação: sem o lock, "aprovar" e
    "devolver" simultâneos leriam ambos REVISAO e o último a gravar venceria.
    Só a transição bem sucedida vai para a auditoria, com quem fez (de
    `request.user`), o alvo e os dois estados. `registrar` nunca quebra o
    fluxo: se a gravação da auditoria falhar, o erro é logado e a transição
    segue confirmada, sem registro. Disponibilidade vale mais que rastro aqui.
    """
    origem, destino, acao_auditoria = TRANSICOES[acao]
    with transaction.atomic():
        try:
            conteudo = modelo.objects.select_for_update().get(pk=pk)
        except modelo.DoesNotExist:
            raise Http404("Conteúdo não encontrado.") from None

        if conteudo.status != origem:
            raise ValidationError(
                f"Só conteúdo em {origem.label} aceita esta ação; "
                f"o status atual é {StatusEditorial(conteudo.status).label}.",
                code="transicao_invalida",
            )

        conteudo.status = destino
        # `auto_now` só grava o carimbo se o campo entrar em update_fields, e
        # o nome varia entre os models (atualizada_em, atualizado_em).
        carimbos = [f.name for f in modelo._meta.fields if getattr(f, "auto_now", False)]
        conteudo.save(update_fields=["status", *carimbos])
        registrar(
            acao_auditoria,
            request=request,
            alvo=conteudo,
            de=origem.value,
            para=destino.value,
        )
    return conteudo
