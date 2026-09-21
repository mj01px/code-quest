import hashlib
import json
from dataclasses import dataclass, field

from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from . import analise_ast, harness
from .judge0 import STATUS_ACEITO, STATUS_TEMPO_ESGOTADO, obter_cliente
from .models import EspecificacaoDeCodigo, Modo, Submissao, Veredito

LIMITE_DE_CARACTERES = 10_000


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


def _checar_cota_diaria():
    inicio_do_dia = timezone.localtime().replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    usadas = Submissao.objects.filter(
        criado_em__gte=inicio_do_dia, em_cache=False
    ).count()
    if usadas >= settings.JUDGE0_LIMITE_DIARIO:
        raise ValidationError(
            _("A correção atingiu o limite de hoje. Tente de novo amanhã."),
            code="limite_diario",
        )


def _hash(*, especificacao, casos, codigo):
    base = json.dumps(
        {
            "harness": harness.VERSAO,
            "linguagem": especificacao.linguagem,
            "funcao": especificacao.funcao,
            "casos": [
                [c.ordem, c.argumentos, c.esperado, c.erro_esperado] for c in casos
            ],
            "codigo": codigo,
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
    anterior = (
        Submissao.objects.filter(hash=chave, modo=modo).order_by("-criado_em").first()
    )

    if anterior is not None:
        resultado = anterior.resultado
        em_cache = True
    else:
        _checar_cota_diaria()
        execucao = obter_cliente().executar(
            codigo=harness.montar_programa(codigo=codigo, funcao=especificacao.funcao),
            stdin=harness.montar_entrada(casos),
            linguagem=especificacao.linguagem,
        )
        resultado = _julgar(casos=casos, execucao=execucao)
        resultado["tempo"] = execucao.tempo
        resultado["memoria"] = execucao.memoria
        em_cache = False

    Submissao.objects.create(
        user=user,
        exercicio=exercicio,
        modo=modo,
        codigo=codigo,
        hash=chave,
        veredito=resultado["veredito"],
        resultado=resultado,
        em_cache=em_cache,
    )

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