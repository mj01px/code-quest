from typing import Literal, cast

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Exists, Model, OuterRef, Q, QuerySet
from django.http import Http404
from django.utils.text import slugify
from rest_framework.exceptions import PermissionDenied
from rest_framework.request import Request

from apps.auditoria.models import RegistroDeAuditoria
from apps.auditoria.services import AcaoAuditoria, registrar
from apps.contas.models import NivelDeAcesso, User
from apps.trilhas.models import Aula, Exercicio, StatusEditorial, Trilha

from .models import SolicitacaoAutoria

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


def itens_no_status(
    status: StatusEditorial,
    autor: User | None = None,
    tipos: tuple[str, ...] = tuple(MODELOS),
) -> list[dict[str, int | str]]:
    """Itens de `tipos` em `status`, num formato único para as filas.

    Uma consulta por model, só com as colunas usadas (o nickname do autor vem
    no mesmo JOIN, sem N+1). Com `autor`, só o que ele criou; sem, tudo (a
    visão do admin e da fila de revisão). Filho cujo pai está no mesmo status
    não sai solto: aparece dentro do pai, e a ação no pai o leva junto.
    """
    filtro: dict[str, object] = {"status": status}
    if autor is not None:
        filtro["autor"] = autor
    # ponytail: sem paginação, o volume editorial é de dezenas; paginar quando
    # a fila passar de algumas centenas.
    return [
        {
            "id": pk,
            "tipo": tipo,
            "titulo": titulo,
            "status_editorial": status,
            "criado_por": criado_por,
        }
        for tipo, modelo in MODELOS.items()
        if tipo in tipos
        for pk, titulo, criado_por in modelo.objects.filter(**filtro)
        .exclude(_pai_no_status(tipo, status))
        .values_list("pk", "nome" if modelo is Trilha else "titulo", "autor__nickname")
    ]


def _pai_no_status(tipo: str, status: StatusEditorial) -> Q:
    """Filho com algum pai em `status`; Q vazio (exclui nada) para a trilha."""
    if tipo == "aulas":
        return Q(trilha__status=status)
    if tipo == "exercicios":
        return Q(aula__status=status) | Q(trilha__status=status)
    return Q()


def bonus_da_trilha(trilha: Trilha) -> str | None:
    """Slug da criatura com bônus na trilha, ou None. Com várias (seed), a primeira."""
    return trilha.xp_bonuses.values_list("creature__slug", flat=True).first()


def slug_livre(texto: str, ocupados: QuerySet[Model]) -> str:
    """Slug do `texto` que ainda não existe em `ocupados` (sufixo -2, -3...)."""
    base = slugify(texto)[:70] or "conteudo"
    slug, n = base, 2
    # ponytail: dois autores com o mesmo título no mesmo instante colidem na
    # constraint única (500); travar ou repetir se isso aparecer.
    while ocupados.filter(slug=slug).exists():
        slug, n = f"{base}-{n}", n + 1
    return slug


def promover_a_autor(usuario: User) -> None:
    """Dá o papel e o nível de sistema "Autor" a quem ainda não cria conteúdo.

    Quem já tem `trilhas.create` (um admin, por exemplo) fica como está: trocar
    o nível dele por "Autor" seria um rebaixamento.
    """
    if usuario.has_perm("trilhas.create"):
        return
    usuario.role = User.Role.AUTHOR
    usuario.nivel_de_acesso = NivelDeAcesso.objects.filter(
        nome="Autor", sistema=True
    ).first()
    # `update()`, como no sinal de nível padrão: não redispara o post_save.
    User.objects.filter(pk=usuario.pk).update(
        role=usuario.role, nivel_de_acesso=usuario.nivel_de_acesso
    )
    usuario.invalidar_cache_permissoes()


def decidir_solicitacao(
    pk: int, request: Request, *, aprovar: bool, motivo: str = ""
) -> SolicitacaoAutoria:
    """Aprova (e promove o usuário) ou rejeita uma solicitação pendente.

    A linha fica travada, como em `transicionar`: dois admins decidindo ao
    mesmo tempo não aprovam e rejeitam o mesmo pedido.
    """
    with transaction.atomic():
        try:
            solicitacao = (
                SolicitacaoAutoria.objects.select_for_update()
                .select_related("usuario")
                .get(pk=pk)
            )
        except SolicitacaoAutoria.DoesNotExist:
            raise Http404("Solicitação não encontrada.") from None

        if solicitacao.status != SolicitacaoAutoria.Status.PENDENTE:
            raise ValidationError(
                "Esta solicitação já foi decidida.", code="solicitacao_decidida"
            )

        if aprovar:
            solicitacao.status = SolicitacaoAutoria.Status.APROVADA
            promover_a_autor(solicitacao.usuario)
        else:
            solicitacao.status = SolicitacaoAutoria.Status.REJEITADA
            solicitacao.motivo_rejeicao = motivo
        solicitacao.save(update_fields=["status", "motivo_rejeicao"])
        registrar(
            AcaoAuditoria.AUTORIA_APROVADA if aprovar else AcaoAuditoria.AUTORIA_REJEITADA,
            request=request,
            alvo=solicitacao.usuario,
            solicitacao=solicitacao.pk,
        )
    return solicitacao


PRONTOS = (StatusEditorial.APROVADO, StatusEditorial.PUBLICADO)


def _exigir_filhos_prontos(conteudo: Conteudo) -> None:
    """Recusa publicar pai com filho ainda em rascunho ou revisão.

    Exercício não tem filhos. Roda sob o lock do pai; um filho que mude de
    estado logo depois não é coberto (sem lock nos filhos).
    """
    if isinstance(conteudo, Trilha):
        incompleto = conteudo.aulas.exclude(status__in=PRONTOS).exists()
        mensagem = "Trilha contem aulas nao aprovadas ou em rascunho."
    elif isinstance(conteudo, Aula):
        incompleto = conteudo.exercicios.exclude(status__in=PRONTOS).exists()
        mensagem = "Aula contem exercicios nao aprovados ou em rascunho."
    else:
        return
    if incompleto:
        raise ValidationError(mensagem, code="conteudo_incompleto")


def eh_dono_ou_admin(conteudo: Conteudo, usuario: User) -> bool:
    """Vale para quem criou o conteúdo e para o admin; conteúdo sem autor é só do admin."""
    return usuario.is_platform_admin or (
        conteudo.autor_id is not None and conteudo.autor_id == usuario.pk
    )


SO_RASCUNHO = (StatusEditorial.RASCUNHO,)
# Excluir vale também para o aprovado ainda não publicado; editar não.
EXCLUIVEIS = (StatusEditorial.RASCUNHO, StatusEditorial.APROVADO)
# Filho nestes estados trava a exclusão do pai: está com o revisor ou já no ar.
FILHO_TRAVA = (StatusEditorial.REVISAO, StatusEditorial.PUBLICADO)


def exigir_rascunho_do_dono(
    conteudo: Conteudo,
    usuario: User,
    estados: tuple[StatusEditorial, ...] = SO_RASCUNHO,
) -> None:
    """Recusa alterar o que não é do usuário (403) ou fora de `estados` (400).

    Dono antes do estado, como em `transicionar`: quem não é dono não descobre
    em que estado o conteúdo está.
    """
    if not eh_dono_ou_admin(conteudo, usuario):
        raise PermissionDenied("Você só pode alterar o que criou.")
    if conteudo.status not in estados:
        aceitos = " ou ".join(s.label.lower() for s in estados)
        raise ValidationError(
            f"Só {aceitos} pode ser editado ou excluído; "
            f"o status atual é {StatusEditorial(conteudo.status).label}.",
            code="nao_rascunho",
        )


def rascunho_editavel(
    modelo: type[Conteudo],
    pk: int,
    usuario: User,
    estados: tuple[StatusEditorial, ...] = SO_RASCUNHO,
) -> Conteudo:
    """Trava e devolve o conteúdo em `estados` que `usuario` pode alterar.

    Chamar dentro de `transaction.atomic()`: o lock segura um "submeter"
    simultâneo até a edição terminar.
    """
    try:
        conteudo = modelo.objects.select_for_update().get(pk=pk)
    except modelo.DoesNotExist:
        raise Http404("Conteúdo não encontrado.") from None
    exigir_rascunho_do_dono(conteudo, usuario, estados)
    return conteudo


def excluir_rascunho(
    modelo: type[Conteudo], pk: int, tipo: str, request: Request, motivo: str = ""
) -> None:
    """Apaga o rascunho ou aprovado e, em cascata, os filhos dele.

    Recusa se algum filho está em revisão ou publicado: apagar a trilha levaria
    junto uma aula com o revisor ou já no ar. Publicado só sai com
    `trilhas.delete_published` e `motivo`, que vai para a auditoria.
    """
    usuario = cast(User, request.user)
    with transaction.atomic():
        try:
            conteudo = modelo.objects.select_for_update().get(pk=pk)
        except modelo.DoesNotExist:
            raise Http404("Conteúdo não encontrado.") from None
        # Sem a permissão, o publicado cai na regra comum (403 ou 400), como antes.
        if conteudo.status == StatusEditorial.PUBLICADO and usuario.has_perm(
            "trilhas.delete_published"
        ):
            _excluir_publicado(conteudo, tipo, request, motivo)
            return
        exigir_rascunho_do_dono(conteudo, usuario, EXCLUIVEIS)
        # Filhos travados antes de checar: sem o lock, um "submeter" simultâneo
        # de um filho passaria pela checagem e seria apagado em cascata. Ordem
        # pai e depois filho, a mesma do cascade, sem deadlock com `transicionar`.
        filhos: list[Aula | Exercicio]
        if isinstance(conteudo, Trilha):
            filhos = [
                *Aula.objects.select_for_update().filter(trilha=conteudo),
                *Exercicio.objects.select_for_update().filter(trilha=conteudo),
            ]
        elif isinstance(conteudo, Aula):
            filhos = [*Exercicio.objects.select_for_update().filter(aula=conteudo)]
        else:
            filhos = []
        if any(f.status in FILHO_TRAVA for f in filhos):
            raise ValidationError(
                "Há conteúdo aqui dentro em revisão ou já publicado.",
                code="filho_avancado",
            )
        # Antes do delete: depois dele o objeto não tem mais pk para o alvo.
        # Título e motivo ficam para o autor ler em "meus envios".
        registrar(
            AcaoAuditoria.CONTEUDO_EXCLUIDO,
            request=request,
            alvo=conteudo,
            tipo=tipo,
            titulo=_nome(conteudo),
            motivo=motivo,
        )
        conteudo.delete()


def _excluir_publicado(
    conteudo: Conteudo, tipo: str, request: Request, motivo: str
) -> None:
    """Moderação: tira do ar o publicado, com os filhos, guardando o motivo.

    Sem checagem de filhos: o moderador remove o conjunto inteiro de propósito.
    Chamar sob o lock de `excluir_rascunho`, que já cobrou a permissão.
    """
    if not motivo:
        raise ValidationError("Informe o motivo da exclusão.", code="sem_motivo")
    # O nome some com o delete; sem ele o registro não diz o que saiu do ar.
    registrar(
        AcaoAuditoria.CONTEUDO_PUBLICADO_EXCLUIDO,
        request=request,
        alvo=conteudo,
        tipo=tipo,
        titulo=_nome(conteudo),
        motivo=motivo,
    )
    conteudo.delete()


def _nome(conteudo: Conteudo) -> str:
    return conteudo.nome if isinstance(conteudo, Trilha) else conteudo.titulo


EXCLUSOES = (AcaoAuditoria.CONTEUDO_EXCLUIDO, AcaoAuditoria.CONTEUDO_PUBLICADO_EXCLUIDO)


def exclusoes_sofridas(autor: User, limite: int = 20) -> list[dict[str, object]]:
    """Exclusões que outra pessoa fez no que `autor` criou, da mais recente.

    O conteúdo já não existe, então o dono sai do registro de criação do mesmo
    alvo. Conteúdo sem esse registro (o semeado) não entra. Registro antigo,
    de antes de a exclusão de rascunho guardar o título, vem com título null.
    """
    criado_por_ele = RegistroDeAuditoria.objects.filter(
        acao=AcaoAuditoria.CONTEUDO_CRIADO,
        actor=autor,
        alvo_tipo=OuterRef("alvo_tipo"),
        alvo_id=OuterRef("alvo_id"),
    )
    # ponytail: só as `limite` mais recentes, sem paginação; paginar se o
    # autor precisar do histórico inteiro.
    registros = (
        RegistroDeAuditoria.objects.filter(Exists(criado_por_ele), acao__in=EXCLUSOES)
        # Apagar o próprio rascunho não é retorno de ninguém. Ator null (conta
        # apagada) fica: foi outra pessoa.
        .exclude(actor=autor)
        # O id é uuid7, crescente no tempo: desempata o mesmo instante.
        .order_by("-created_at", "-id")
        .values_list("metadata", "actor__nickname", "created_at")[:limite]
    )
    return [
        {
            "tipo": metadata.get("tipo"),
            "titulo": metadata.get("titulo"),
            "motivo": metadata.get("motivo") or None,
            "excluido_por": quem,
            "excluido_em": quando,
        }
        for metadata, quem, quando in registros
    ]


def anexar_pareceres(itens: list[dict[str, int | str]]) -> list[dict[str, int | str]]:
    """Põe em cada item o parecer da devolução mais recente, ou None.

    Uma consulta só na auditoria, que é onde o parecer mora: o model do
    conteúdo não guarda histórico editorial.
    """
    alvos = Q()
    for tipo, modelo in MODELOS.items():
        ids = [str(i["id"]) for i in itens if i["tipo"] == tipo]
        if ids:
            alvos |= Q(alvo_tipo=modelo.__name__.lower(), alvo_id__in=ids)
    if not alvos:
        return itens
    # Em ordem cronológica: a última devolução sobrescreve as anteriores.
    pareceres = {
        (alvo_tipo, alvo_id): metadata.get("parecer")
        for alvo_tipo, alvo_id, metadata in RegistroDeAuditoria.objects.filter(
            alvos, acao=AcaoAuditoria.CONTEUDO_DEVOLVIDO
        )
        .order_by("created_at")
        .values_list("alvo_tipo", "alvo_id", "metadata")
    }
    for item in itens:
        chave = (MODELOS[str(item["tipo"])].__name__.lower(), str(item["id"]))
        item["parecer"] = pareceres.get(chave)
    return itens


def transicionar(
    modelo: type[Conteudo], pk: int, acao: Acao, request: Request, **metadata: str
) -> Conteudo:
    """Aplica `acao` ao conteúdo, ou recusa se o estado atual não a permite.

    A linha fica travada entre a leitura e a gravação: sem o lock, "aprovar" e
    "devolver" simultâneos leriam ambos REVISAO e o último a gravar venceria.
    Só a transição bem sucedida vai para a auditoria, com quem fez (de
    `request.user`), o alvo e os dois estados. `registrar` nunca quebra o
    fluxo: se a gravação da auditoria falhar, o erro é logado e a transição
    segue confirmada, sem registro. Disponibilidade vale mais que rastro aqui.
    `metadata` vai junto para a auditoria (o parecer da devolução, por exemplo).
    """
    origem, destino, acao_auditoria = TRANSICOES[acao]
    with transaction.atomic():
        try:
            conteudo = modelo.objects.select_for_update().get(pk=pk)
        except modelo.DoesNotExist:
            raise Http404("Conteúdo não encontrado.") from None

        # Só o dono (ou o admin) envia para revisão. Publicar é do dono ou de
        # quem tem `trilhas.publish`; aprovar e devolver se guardam pela rota.
        # Antes do estado: quem não é dono não descobre em que estado está.
        usuario = cast(User, request.user)
        exige_dono = acao == "submeter" or (
            acao == "publicar" and not usuario.has_perm("trilhas.publish")
        )
        if exige_dono and not eh_dono_ou_admin(conteudo, usuario):
            raise PermissionDenied("Você só pode enviar para revisão ou publicar o que criou.")

        if conteudo.status != origem:
            raise ValidationError(
                f"Só conteúdo em {origem.label} aceita esta ação; "
                f"o status atual é {StatusEditorial(conteudo.status).label}.",
                code="transicao_invalida",
            )

        if acao == "publicar":
            _exigir_filhos_prontos(conteudo)

        _gravar_status(conteudo, destino)
        registrar(
            acao_auditoria,
            request=request,
            alvo=conteudo,
            de=origem.value,
            para=destino.value,
            **metadata,
        )
        # As filas mostram o pai no lugar dos filhos no mesmo estado: agir no
        # pai leva junto os filhos em `origem`, senão aulas e exercícios
        # ficariam presos sem botão e a trilha nunca poderia ser publicada.
        for filho in _filhos_em(conteudo, origem):
            _gravar_status(filho, destino)
            registrar(
                acao_auditoria,
                request=request,
                alvo=filho,
                de=origem.value,
                para=destino.value,
            )
    return conteudo


def _gravar_status(conteudo: Conteudo, destino: StatusEditorial) -> None:
    conteudo.status = destino
    # `auto_now` só grava o carimbo se o campo entrar em update_fields, e
    # o nome varia entre os models (atualizada_em, atualizado_em).
    carimbos = [f.name for f in conteudo._meta.fields if getattr(f, "auto_now", False)]
    conteudo.save(update_fields=["status", *carimbos])


def _filhos_em(conteudo: Conteudo, status: StatusEditorial) -> list[Aula | Exercicio]:
    """Filhos do conteúdo em `status`, travados (mesma ordem de `excluir_rascunho`)."""
    if isinstance(conteudo, Trilha):
        return [
            *Aula.objects.select_for_update().filter(trilha=conteudo, status=status),
            *Exercicio.objects.select_for_update().filter(trilha=conteudo, status=status),
        ]
    if isinstance(conteudo, Aula):
        return [*Exercicio.objects.select_for_update().filter(aula=conteudo, status=status)]
    return []
