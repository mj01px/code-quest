import hashlib
import json
from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import timedelta
from typing import NotRequired, TypedDict

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.contas.models import User
from apps.trilhas.models import Exercicio

from . import analise_ast, harness, sql
from .excecoes import CotaDiariaEsgotada, CotaDoUsuarioEsgotada
from .judge0 import STATUS_ACEITO, STATUS_TEMPO_ESGOTADO, Execucao, obter_cliente
from .models import (
    CasoDeTeste,
    EspecificacaoDeCodigo,
    Linguagem,
    Modo,
    Submissao,
    Veredito,
)

LIMITE_DE_CARACTERES = 10_000
CACHE_DE_SUBMISSAO = timedelta(minutes=10)
DISJUNTOR = 0.9  # fração da cota diária em que novas chamadas param


# No modo ENVIAR o caso oculto chega só com ordem, visivel e passou.
class CasoJulgado(TypedDict):
    ordem: int
    visivel: bool
    passou: bool
    descricao: NotRequired[str]
    argumentos: NotRequired[object]
    esperado: NotRequired[object]
    erro_esperado: NotRequired[str]
    obtido: NotRequired[object]
    erro: NotRequired[str]


# Formato gravado em Submissao.resultado; tempo e memoria só existem quando
# houve chamada ao Judge0.
class Resultado(TypedDict):
    personalizado: NotRequired[bool]
    veredito: str
    aprovados: int
    total: int
    casos: list[CasoJulgado]
    saida: str
    erro: str
    tempo: NotRequired[float | None]
    memoria: NotRequired[int | None]


@dataclass(frozen=True)
class Correcao:
    modo: str
    veredito: str
    aprovados: int
    total: int
    casos: list[CasoJulgado] = field(default_factory=list)
    saida: str = ""
    erro: str = ""
    tempo: float | None = None
    memoria: int | None = None
    personalizado: bool = False

    @property
    def aprovado(self) -> bool:
        return self.veredito == Veredito.APROVADO


def _conta_inativa() -> ValidationError:
    return ValidationError(
        _("Esta conta não pode enviar código."), code="conta_inativa"
    )


def _nao_publicado() -> ValidationError:
    return ValidationError(
        _("Este exercício não está publicado."), code="exercicio_nao_publicado"
    )


def _sem_correcao() -> ValidationError:
    return ValidationError(
        _("Este exercício não tem correção automática."), code="sem_correcao_automatica"
    )


def especificacao_de(exercicio: Exercicio) -> EspecificacaoDeCodigo | None:
    return (
        EspecificacaoDeCodigo.objects.filter(exercicio=exercicio)
        .prefetch_related("casos")
        .first()
    )


def tem_correcao_automatica(exercicio: Exercicio) -> bool:
    return EspecificacaoDeCodigo.objects.filter(exercicio=exercicio).exists()


def codigo_aprovado(*, user: User, exercicio: Exercicio | int) -> str:
    submissao = (
        Submissao.objects.filter(
            user=user,
            exercicio=exercicio,
            modo=Modo.ENVIAR,
            veredito=Veredito.APROVADO,
        )
        .order_by("-criado_em")
        .values_list("codigo", flat=True)
        .first()
    )
    return submissao or ""


def _validar(*, user: User, exercicio: Exercicio, codigo: object) -> str:
    if not user.is_active or user.is_anonymized:
        raise ValidationError({"usuario": _conta_inativa()})

    if not exercicio.publicado:
        raise ValidationError({"exercicio": _nao_publicado()})

    if not isinstance(codigo, str) or not codigo.strip():
        raise ValidationError(
            {
                "codigo": ValidationError(
                    _("Escreva o código antes de enviar."), code="codigo_vazio"
                )
            }
        )

    if len(codigo) > LIMITE_DE_CARACTERES:
        raise ValidationError(
            {
                "codigo": ValidationError(
                    _("O código passou de %(limite)s caracteres.")
                    % {"limite": LIMITE_DE_CARACTERES},
                    code="codigo_grande",
                )
            }
        )

    return codigo


def _checar_cota_diaria(user: User) -> None:
    # Só chamadas pagas contam (acerto de cache e código barrado não). Conta
    # no banco, então vale para todos os processos (contador em LocMemCache
    # multiplicaria o teto por worker) e zera sozinho à meia-noite.
    inicio_do_dia = timezone.localtime().replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    pagas_hoje = Submissao.objects.filter(criado_em__gte=inicio_do_dia, em_cache=False)

    # Teto por usuário: uma conta sozinha não chega ao disjuntor de todos.
    if pagas_hoje.filter(user=user).count() >= settings.JUDGE0_LIMITE_POR_USUARIO:
        raise CotaDoUsuarioEsgotada()

    # Disjuntor global: para em 90% da cota do RapidAPI, com folga para as
    # chamadas já em voo.
    if pagas_hoje.count() >= settings.JUDGE0_LIMITE_DIARIO * DISJUNTOR:
        raise CotaDiariaEsgotada()


def _reservar_chamada(submissao: Submissao) -> None:
    """Confere a cota e grava a tentativa, como um passo só (RNF17).

    A tentativa entra ANTES da chamada paga. Sem hash ela não serve de cache,
    mas já conta na cota: chamada que falha (timeout, 5xx) também gasta o
    RapidAPI. A trava na linha do usuário enfileira as requisições simultâneas
    dele, e cada uma conta já enxergando a tentativa da anterior; sem ela, duas
    leriam o mesmo total e passariam juntas pelo teto. A chamada ao Judge0 fica
    fora da transação, para a trava não durar o tempo da execução.
    """
    # ponytail: o disjuntor global ainda pode passar por pouco com usuários
    # diferentes em paralelo; a folga de 10% do DISJUNTOR cobre isso.
    with transaction.atomic():
        User.objects.select_for_update().only("pk").get(pk=submissao.user.pk)
        _checar_cota_diaria(submissao.user)
        submissao.veredito = Veredito.ERRO_DE_EXECUCAO
        submissao.save()


def _normalizar(codigo: str) -> str:
    # Só para a chave do cache: espaço no fim de linha e linhas em branco nas
    # bordas não mudam o resultado. A indentação fica como está. Quebra só em
    # \n, \r\n e \r, os fins de linha do Python (splitlines quebraria em U+2028
    # e juntaria programas diferentes na mesma chave).
    # ponytail: espaço no fim de linha DENTRO de string multilinha muda o valor
    # e cai na mesma chave; normalizar via tokenize se algum exercício depender.
    linhas = codigo.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    return "\n".join(linha.rstrip() for linha in linhas).strip("\n")


def _hash(
    *, especificacao: EspecificacaoDeCodigo, casos: Sequence[CasoDeTeste], codigo: str
) -> str:
    base = json.dumps(
        {
            "harness": sql.VERSAO
            if especificacao.linguagem == Linguagem.SQL
            else harness.VERSAO,
            "linguagem": especificacao.linguagem,
            "funcao": especificacao.funcao,
            "parametros": harness.parametros_de(
                especificacao.codigo_inicial, especificacao.funcao
            )
            if especificacao.linguagem == Linguagem.PYTHON
            else [],
            # `visivel` entra porque o resultado guardado decide o que mostrar:
            # sem ele, esconder um caso deixaria o cache mostrá-lo.
            "casos": [
                [c.ordem, c.argumentos, c.esperado, c.erro_esperado, c.visivel]
                for c in casos
            ],
            "codigo": _normalizar(codigo),
        },
        ensure_ascii=False,
        sort_keys=True,
    )
    return hashlib.sha256(base.encode()).hexdigest()


def _descrever_erro(resultado: object) -> str:
    if not isinstance(resultado, dict) or resultado.get("ok") is not False:
        return ""
    nome: str = resultado.get("erro") or "Erro"
    mensagem = resultado.get("mensagem") or ""
    return f"{nome}: {mensagem}" if mensagem else nome


def _julgar(
    *, casos: Sequence[CasoDeTeste], execucao: Execucao, personalizado: bool = False
) -> Resultado:
    total = len(casos)

    if execucao.status_id == STATUS_TEMPO_ESGOTADO:
        return {
            "veredito": Veredito.TEMPO_ESGOTADO,
            "aprovados": 0,
            "total": total,
            "casos": [],
            "saida": "",
            "erro": "",
        }

    impresso, resultados = harness.separar_saida(execucao.stdout)

    if (
        execucao.status_id != STATUS_ACEITO
        or resultados is None
        or len(resultados) != total
    ):
        return {
            "veredito": Veredito.ERRO_DE_EXECUCAO,
            "aprovados": 0,
            "total": total,
            "casos": [],
            "saida": impresso,
            "erro": execucao.stderr,
        }

    if personalizado:
        resultado = resultados[0]
        ok = isinstance(resultado, dict) and resultado.get("ok") is True
        return {
            "personalizado": True,
            "veredito": Veredito.APROVADO if ok else Veredito.ERRO_DE_EXECUCAO,
            "aprovados": int(ok),
            "total": 1,
            "casos": [
                {
                    "ordem": casos[0].ordem,
                    "visivel": True,
                    "passou": ok,
                    "argumentos": resultado.get("argumentos", casos[0].argumentos)
                    if isinstance(resultado, dict)
                    else casos[0].argumentos,
                    "obtido": resultado.get("valor")
                    if isinstance(resultado, dict)
                    else None,
                    "erro": _descrever_erro(resultado),
                }
            ],
            "saida": impresso,
            "erro": execucao.stderr,
        }

    detalhes: list[CasoJulgado] = []
    for caso, resultado in zip(casos, resultados, strict=True):
        detalhes.append(
            {
                "ordem": caso.ordem,
                "visivel": caso.visivel,
                "passou": harness.caso_passou(caso, resultado),
                "argumentos": caso.argumentos,
                "esperado": caso.esperado,
                "erro_esperado": caso.erro_esperado,
                "obtido": resultado.get("valor")
                if isinstance(resultado, dict)
                else None,
                "erro": _descrever_erro(resultado),
            }
        )

    aprovados = sum(1 for d in detalhes if d["passou"])
    return {
        "veredito": Veredito.APROVADO
        if aprovados == total
        else Veredito.RESPOSTA_ERRADA,
        "aprovados": aprovados,
        "total": total,
        "casos": detalhes,
        "saida": impresso,
        "erro": execucao.stderr,
    }


def _correcao(
    *, modo: str, resultado: Resultado, tempo: float | None, memoria: int | None
) -> Correcao:
    casos = resultado["casos"]
    saida = resultado["saida"]
    erro = resultado["erro"]

    if modo == Modo.ENVIAR:
        saida = ""
        erro = ""
        casos = [
            c
            if c["visivel"]
            else {"ordem": c["ordem"], "visivel": False, "passou": c["passou"]}
            for c in casos
        ]

    return Correcao(
        modo=modo,
        veredito=resultado["veredito"],
        aprovados=resultado["aprovados"],
        total=resultado["total"],
        casos=casos,
        saida=saida,
        erro=erro,
        tempo=tempo,
        memoria=memoria,
        personalizado=modo == Modo.EXECUTAR and resultado.get("personalizado", False),
    )


def _julgar_sql(
    execucao: Execucao, casos: list[CasoDeTeste], marcador: str
) -> Resultado:
    saida = []
    respostas = {}
    for linha in execucao.stdout.splitlines(keepends=True):
        if marcador and linha.startswith(f"{marcador}:"):
            ordem, _, valor = linha.removeprefix(f"{marcador}:").strip().partition(":")
            if valor in ("0", "1"):
                respostas[ordem] = valor == "1"
        else:
            saida.append(linha)

    detalhes: list[CasoJulgado] = [
        {
            "ordem": caso.ordem,
            "visivel": caso.visivel,
            "passou": respostas.get(str(caso.ordem), False),
            "descricao": caso.argumentos[1],
        }
        for caso in casos
    ]
    aprovados = sum(caso["passou"] for caso in detalhes)
    if execucao.status_id == STATUS_TEMPO_ESGOTADO:
        veredito = Veredito.TEMPO_ESGOTADO
    elif execucao.status_id != STATUS_ACEITO or execucao.stderr.strip():
        veredito = Veredito.ERRO_DE_EXECUCAO
    elif aprovados < len(casos):
        veredito = Veredito.RESPOSTA_ERRADA
    else:
        veredito = Veredito.APROVADO
    return {
        "personalizado": not casos,
        "veredito": veredito,
        "aprovados": aprovados,
        "total": len(casos),
        "casos": detalhes,
        "saida": "".join(saida),
        "erro": execucao.stderr,
    }


def _corrigir(
    *, user: User, exercicio: Exercicio, codigo: object, modo: Modo
) -> Correcao:
    codigo = _validar(user=user, exercicio=exercicio, codigo=codigo)

    especificacao = especificacao_de(exercicio)
    if especificacao is None:
        raise ValidationError({"exercicio": _sem_correcao()})

    em_sql = especificacao.linguagem == Linguagem.SQL
    if not em_sql:
        barrado = analise_ast.verificar(
            codigo=codigo,
            funcao=especificacao.funcao,
            requisitos=especificacao.requisitos,
        )
        if barrado is not None:
            mensagem = barrado.mensagem
            if barrado.linha and barrado.code != "erro_de_sintaxe":
                mensagem = f"{mensagem.rstrip('.')} (linha {barrado.linha})."
            raise ValidationError(
                {"codigo": ValidationError(mensagem, code=barrado.code)}
            )

    casos = list(especificacao.casos.all())
    if modo == Modo.EXECUTAR:
        casos = [c for c in casos if c.visivel]
    if not casos and (not em_sql or modo == Modo.ENVIAR):
        raise ValidationError({"exercicio": _sem_correcao()})

    entradas: dict[int, str] = {}
    codigo_sql = None
    marcador_sql = ""
    if em_sql:
        if casos:
            codigo_sql, marcador_sql = sql.montar_correcao(codigo, casos)
        else:
            codigo_sql = sql.montar_programa(codigo)
    elif modo == Modo.EXECUTAR:
        parametros = harness.parametros_de(
            especificacao.codigo_inicial, especificacao.funcao
        )
        entradas = harness.entradas_do_codigo(codigo, especificacao.funcao, parametros)
        if entradas:
            casos = casos[:1]

    chave = _hash(especificacao=especificacao, casos=casos, codigo=codigo)
    # Cache de submissão idêntica: só resultado pago (em_cache=False), para o
    # TTL contar da chamada real ao Judge0 e não renovar a cada acerto.
    anterior = (
        Submissao.objects.filter(
            hash=chave,
            modo=modo,
            em_cache=False,
            criado_em__gte=timezone.now() - CACHE_DE_SUBMISSAO,
        )
        .order_by("-criado_em")
        .first()
    )

    # JSONField devolve Any; a forma vem do _julgar de quem gravou o cache.
    resultado: Resultado
    submissao = Submissao(user=user, exercicio=exercicio, modo=modo, codigo=codigo)
    if anterior is not None:
        resultado = anterior.resultado
        submissao.em_cache = True
    else:
        cliente = obter_cliente()  # sem configuração não há chamada a contar
        _reservar_chamada(submissao)
        execucao = cliente.executar(
            codigo=codigo_sql
            if codigo_sql is not None
            else harness.montar_programa(
                codigo=codigo, funcao=especificacao.funcao, entradas=entradas
            ),
            stdin="" if codigo_sql is not None else harness.montar_entrada(casos),
            linguagem=especificacao.linguagem,
        )
        resultado = (
            _julgar_sql(execucao, casos, marcador_sql)
            if codigo_sql is not None
            else _julgar(casos=casos, execucao=execucao, personalizado=bool(entradas))
        )
        if not em_sql:
            resultado["personalizado"] = bool(entradas)
        resultado["tempo"] = execucao.tempo
        resultado["memoria"] = execucao.memoria

    submissao.hash = chave
    submissao.veredito = resultado["veredito"]
    submissao.resultado = resultado
    submissao.save()

    return _correcao(
        modo=modo,
        resultado=resultado,
        tempo=resultado.get("tempo"),
        memoria=resultado.get("memoria"),
    )


def executar_codigo(*, user: User, exercicio: Exercicio, codigo: object) -> Correcao:
    return _corrigir(user=user, exercicio=exercicio, codigo=codigo, modo=Modo.EXECUTAR)


def corrigir_envio(*, user: User, exercicio: Exercicio, codigo: object) -> Correcao:
    return _corrigir(user=user, exercicio=exercicio, codigo=codigo, modo=Modo.ENVIAR)
