"""Edição do que já foi aprovado ou publicado, e o diff que o revisor lê.

Sem histórico de versões: o model guarda só a última versão aprovada
(`conteudo_anterior`), do momento em que a edição começa até o conteúdo voltar
ao estado em que estava. O diff compara essa versão com o texto atual.
"""

import json
from difflib import SequenceMatcher

from django.core.exceptions import ValidationError
from rest_framework.request import Request

from apps.auditoria.services import AcaoAuditoria, registrar
from apps.contas.models import User
from apps.trilhas.models import Aula, Exercicio, StatusEditorial, Trilha

from .services import (
    MODELOS,
    PRONTOS,
    Conteudo,
    _gravar_status,
    bonus_da_trilha,
    eh_dono_ou_admin,
)

# Em revisão não se edita: o revisor estaria lendo um texto que muda.
EDITAVEIS = (StatusEditorial.RASCUNHO, *PRONTOS)


def campos_versionados(conteudo: Conteudo) -> dict[str, str]:
    """Os campos que a edição alcança, como texto, na ordem em que o revisor lê.

    `solucao_autor` fica de fora: a edição não a alcança e ela tem rota própria.
    """
    if isinstance(conteudo, Trilha):
        return {
            "nome": conteudo.nome,
            "descricao": conteudo.descricao,
            "dificuldade": conteudo.get_dificuldade_display(),
            "criatura_bonus": bonus_da_trilha(conteudo) or "",
        }
    if isinstance(conteudo, Aula):
        return {"titulo": conteudo.titulo, "conteudo": conteudo.conteudo}
    campos = {
        "titulo": conteudo.titulo,
        "enunciado": conteudo.enunciado,
        "dificuldade": conteudo.get_dificuldade_display(),
    }
    # Exercício teórico não tem especificação: o acesso levanta AttributeError.
    spec = getattr(conteudo, "especificacao_codigo", None)
    if spec is not None:
        campos["funcao"] = spec.funcao
        # Um caso por linha: o diff mostra o caso que entrou, saiu ou mudou. O
        # erro esperado só entra quando existe: a tela de edição não o conhece,
        # e recriar o caso o apagaria sem o revisor ver.
        campos["testes"] = "\n".join(
            json.dumps(
                [c.argumentos, c.esperado, c.visivel]
                + ([c.erro_esperado] if c.erro_esperado else []),
                ensure_ascii=False,
            )
            for c in spec.casos.all()
        )
    return campos


def _pai_em_revisao(conteudo: Conteudo) -> bool:
    """A trilha ou a aula que contém o conteúdo está com o revisor."""
    if isinstance(conteudo, Trilha):
        return False
    pais: list[Trilha | Aula] = [conteudo.trilha]
    if isinstance(conteudo, Exercicio):
        pais.append(conteudo.aula)
    return any(pai.status == StatusEditorial.REVISAO for pai in pais)


def antes_da_edicao(conteudo: Conteudo) -> dict[str, str] | None:
    """A versão de agora, se o conteúdo está aprovado ou publicado; None no rascunho.

    Chamar sob o lock de `rascunho_editavel`, antes de gravar a edição. Recusa
    a edição se o pai está em revisão: na fila o pai aparece no lugar do filho,
    e aprovar o pai levaria junto um texto que o revisor não leu.
    """
    if conteudo.status not in PRONTOS:
        return None
    # ponytail: leitura sem lock do pai; um "submeter" do pai neste instante
    # passa. Travar o pai aqui inverteria a ordem pai e filho de `transicionar`.
    if _pai_em_revisao(conteudo):
        raise ValidationError(
            "A trilha ou a aula deste conteúdo está em revisão. "
            "Espere a revisão terminar para editar.",
            code="pai_em_revisao",
        )
    return campos_versionados(conteudo)


def reabrir_se_mudou(
    conteudo: Conteudo, antes: dict[str, str] | None, request: Request
) -> None:
    """Depois da edição do aprovado ou publicado: guarda `antes` e volta para revisão.

    `antes` vem de `antes_da_edicao`. O conteúdo sai do ar até ser aprovado e
    publicado de novo: o texto novo nunca aparece para o aluno sem passar pelo
    revisor. Salvar sem mudar nada não tira nada do ar.
    """
    if antes is None or antes == campos_versionados(conteudo):
        return
    origem = StatusEditorial(conteudo.status)
    anterior = conteudo.conteudo_anterior
    # Já existe quando o publicado foi editado, aprovado e editado de novo antes
    # de voltar ao ar: a referência continua sendo a versão que estava no ar.
    # Com o mesmo status de agora é resto de uma gravação feita por fora (seed).
    if anterior is None or anterior.get("status") == origem:
        conteudo.conteudo_anterior = {"status": origem.value, "campos": antes}
    _gravar_status(conteudo, StatusEditorial.REVISAO)
    registrar(
        AcaoAuditoria.CONTEUDO_SUBMETIDO,
        request=request,
        alvo=conteudo,
        de=origem.value,
        para=StatusEditorial.REVISAO.value,
        motivo="edicao",
    )


def diff_do_conteudo(conteudo: Conteudo) -> list[dict[str, object]]:
    """Os campos que mudaram desde a versão anterior, linha a linha.

    Lista vazia quando não há versão anterior (conteúdo que nunca foi aprovado)
    ou quando a edição não mudou texto nenhum.
    """
    anterior = (conteudo.conteudo_anterior or {}).get("campos")
    if anterior is None:
        return []
    return [
        {"campo": campo, "linhas": _linhas(anterior.get(campo, ""), texto)}
        for campo, texto in campos_versionados(conteudo).items()
        if anterior.get(campo, "") != texto
    ]


def diff_editorial(conteudo: Conteudo, leitor: User | None = None) -> dict[str, object]:
    """O diff do conteúdo e o dos filhos dele com edição pendente.

    Os filhos entram porque a fila mostra o pai no lugar deles: sem isto, a
    aula editada junto com a trilha seria aprovada sem o revisor ver o diff.
    Com `leitor` (quem não revisa), só os filhos que ele mesmo criou: o dono da
    trilha não lê por aqui o exercício que outro autor pôs dentro dela.
    """
    filhos: list[Aula | Exercicio] = []
    com_versao = {"conteudo_anterior__isnull": False}
    if isinstance(conteudo, Trilha):
        filhos = [
            *conteudo.aulas.filter(**com_versao),
            *conteudo.exercicios.filter(**com_versao),
        ]
    elif isinstance(conteudo, Aula):
        filhos = [*conteudo.exercicios.filter(**com_versao)]
    return {
        "campos": diff_do_conteudo(conteudo),
        "filhos": [
            {
                "tipo": "aulas" if isinstance(filho, Aula) else "exercicios",
                "id": filho.pk,
                "titulo": filho.titulo,
                "campos": campos,
            }
            for filho in filhos
            if (leitor is None or eh_dono_ou_admin(filho, leitor))
            and (campos := diff_do_conteudo(filho))
        ],
    }


def _linhas(antes: str, depois: str) -> list[dict[str, str]]:
    velhas, novas = antes.splitlines(), depois.splitlines()
    linhas: list[dict[str, str]] = []
    # ponytail: diff por linha inteira, sem marcar a palavra que mudou dentro
    # dela; trocar por `difflib.ndiff` se o revisor pedir esse detalhe.
    # `autojunk=False`: a heurística de lixo erra em texto com linhas repetidas.
    blocos = SequenceMatcher(None, velhas, novas, autojunk=False).get_opcodes()
    for operacao, i1, i2, j1, j2 in blocos:
        if operacao == "equal":
            linhas += [{"tipo": "igual", "texto": t} for t in velhas[i1:i2]]
            continue
        linhas += [{"tipo": "removido", "texto": t} for t in velhas[i1:i2]]
        linhas += [{"tipo": "adicionado", "texto": t} for t in novas[j1:j2]]
    return linhas


def conteudos_do_autor(autor: User) -> list[dict[str, int | str | None]]:
    """Tudo o que `autor` criou, em qualquer status, no formato das filas.

    Sempre filtrado pelo autor, admin inclusive: é a lista do que é dele.
    """
    # ponytail: sem paginação, como nas filas; paginar quando um autor passar
    # de algumas centenas de itens.
    return [
        {
            "id": pk,
            "tipo": tipo,
            "titulo": titulo,
            "status_editorial": status,
            "criado_por": autor.nickname,
        }
        for tipo, modelo in MODELOS.items()
        for pk, titulo, status in modelo.objects.filter(autor=autor).values_list(
            "pk", "nome" if modelo is Trilha else "titulo", "status"
        )
    ]
