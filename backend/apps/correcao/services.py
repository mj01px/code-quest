import hashlib
import json
from dataclasses import dataclass, field
from datetime import timedelta

from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from . import analise_ast, harness
from .excecoes import CotaDiariaEsgotada, CotaDoUsuarioEsgotada
from .judge0 import STATUS_ACEITO, STATUS_TEMPO_ESGOTADO, obter_cliente
from .models import EspecificacaoDeCodigo, Modo, Submissao, Veredito

LIMITE_DE_CARACTERES = 10_000
CACHE_DE_SUBMISSAO = timedelta(minutes=10)
DISJUNTOR = 0.9  # fração da cota diária em que novas chamadas param


@dataclass(frozen=True)
class Correcao:
    modo: str
    veredito: str
    aprovados: int
    total: int
    casos: list = field(default_factory=list)
    saida: str = ""
    erro: str = ""
    tempo: float | None = None
    memoria: int | None = None

    @property
    def aprovado(self):
        return self.veredito == Veredito.APROVADO


def _conta_inativa():
    return ValidationError(
        _("Esta conta não pode enviar código."), code="conta_inativa"
    )


def _nao_publicado():
    return ValidationError(
        _("Este exercício não está publicado."), code="exercicio_nao_publicado"
    )


def _sem_correcao():
    return ValidationError(
        _("Este exercício não tem correção automática."), code="sem_correcao_automatica"
    )


def especificacao_de(exercicio):
    return (
        EspecificacaoDeCodigo.objects.filter(exercicio=exercicio)
        .prefetch_related("casos")
        .first()
    )


def tem_correcao_automatica(exercicio):
    return EspecificacaoDeCodigo.objects.filter(exercicio=exercicio).exists()

def codigo_aprovado(*, user, exercicio):
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


def _validar(*, user, exercicio, codigo):
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


def _checar_cota_diaria(user):
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


def _normalizar(codigo):
    # Só para a chave do cache: espaço no fim de linha e linhas em branco nas
    # bordas não mudam o resultado. A indentação fica como está. Quebra só em
    # \n, \r\n e \r, os fins de linha do Python (splitlines quebraria em U+2028
    # e juntaria programas diferentes na mesma chave).
    # ponytail: espaço no fim de linha DENTRO de string multilinha muda o valor
    # e cai na mesma chave; normalizar via tokenize se algum exercício depender.
    linhas = codigo.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    return "\n".join(linha.rstrip() for linha in linhas).strip("\n")


def _hash(*, especificacao, casos, codigo):
    base = json.dumps(
        {
            "harness": harness.VERSAO,
            "linguagem": especificacao.linguagem,
            "funcao": especificacao.funcao,
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


def _descrever_erro(resultado):
    if not isinstance(resultado, dict) or resultado.get("ok") is not False:
        return ""
    nome = resultado.get("erro") or "Erro"
    mensagem = resultado.get("mensagem") or ""
    return f"{nome}: {mensagem}" if mensagem else nome


def _julgar(*, casos, execucao):
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

    detalhes = []
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


def _correcao(*, modo, resultado, tempo, memoria):
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
    )


def _corrigir(*, user, exercicio, codigo, modo):
    _validar(user=user, exercicio=exercicio, codigo=codigo)

    especificacao = especificacao_de(exercicio)
    if especificacao is None:
        raise ValidationError({"exercicio": _sem_correcao()})

    barrado = analise_ast.verificar(
        codigo=codigo,
        funcao=especificacao.funcao,
        requisitos=especificacao.requisitos,
    )
    if barrado is not None:
        mensagem = barrado.mensagem
        if barrado.linha and barrado.code != "erro_de_sintaxe":
            mensagem = f"{mensagem.rstrip('.')} (linha {barrado.linha})."
        raise ValidationError({"codigo": ValidationError(mensagem, code=barrado.code)})

    casos = list(especificacao.casos.all())
    if modo == Modo.EXECUTAR:
        casos = [c for c in casos if c.visivel]
    if not casos:
        raise ValidationError({"exercicio": _sem_correcao()})

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

    submissao = Submissao(user=user, exercicio=exercicio, modo=modo, codigo=codigo)
    if anterior is not None:
        resultado = anterior.resultado
        submissao.em_cache = True
    else:
        cliente = obter_cliente()  # sem configuração não há chamada a contar
        _checar_cota_diaria(user)
        # Grava a tentativa ANTES da chamada paga. Sem hash ela não serve de
        # cache, mas já conta na cota: chamada que falha (timeout, 5xx) também
        # gasta o RapidAPI, e chamadas simultâneas passam a se enxergar.
        submissao.veredito = Veredito.ERRO_DE_EXECUCAO
        submissao.save()
        execucao = cliente.executar(
            codigo=harness.montar_programa(codigo=codigo, funcao=especificacao.funcao),
            stdin=harness.montar_entrada(casos),
            linguagem=especificacao.linguagem,
        )
        resultado = _julgar(casos=casos, execucao=execucao)
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


def executar_codigo(*, user, exercicio, codigo):
    return _corrigir(user=user, exercicio=exercicio, codigo=codigo, modo=Modo.EXECUTAR)


def corrigir_envio(*, user, exercicio, codigo):
    return _corrigir(user=user, exercicio=exercicio, codigo=codigo, modo=Modo.ENVIAR)
