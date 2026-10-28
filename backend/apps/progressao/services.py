from dataclasses import dataclass
from datetime import datetime, time, timedelta
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ImproperlyConfigured, ValidationError
from django.db import IntegrityError, transaction
from django.db.models import Count, F, Max, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.auditoria.models import AcaoAuditoria, RegistroDeAuditoria
from apps.autoria.services import itens_no_status
from apps.correcao.models import Submissao, Veredito
from apps.gamificacao.models import UserCreature, XpBonus
from apps.trilhas.models import Dificuldade, StatusEditorial, Trilha

from .models import (
    EventoXP,
    Nivel,
    Origem,
    ProgressoCriatura,
    Sequencia,
    TrilhaIniciada,
)

# O valor do XP vem diretamente do back
# Nenhum endpoint pode aceitar input de xp vinda do usuario.
# A fazer: verificar se é possivel segurar requisição para fazer alteração do xp creditado, tipo com Charles Proxy

XP_POR_DIFICULDADE = {
    Dificuldade.INICIANTE: 50,
    Dificuldade.INTERMEDIARIO: 100,
    Dificuldade.AVANCADO: 200,
}

XP_PADRAO = 50

# Relidos sempre juntos: "nivel" sem "xp_total" mistura dois momentos e faz
# "montar_progresso" devolver xp_no_nivel negativo.
CAMPOS_RELIDOS = ["xp_total", "nivel", "atualizado_em"]


@dataclass(frozen=True)
class ResultadoXP:
    progresso: ProgressoCriatura
    xp_ganho: int
    subiu_de_nivel: bool
    """A criatura ativa alcançou o nível do próximo estágio e ainda não subiu.

    Não diz que ela evoluiu: quem evolui é o aluno, apertando o botão. Serve
    para a tela avisar que há uma evolução esperando.
    """
    pode_evoluir: bool
    ja_concluido: bool
    sequencia: dict


# Os `code` são contrato da API e valem para todos os contextos; o que muda de
# um helper para outro é só o texto que o aluno lê.
def _exercicio_nao_publicado():
    return ValidationError(
        _("Este exercício não está publicado."), code="exercicio_nao_publicado"
    )


def _trilha_nao_publicada():
    return ValidationError(
        _("Esta trilha não está publicada."), code="exercicio_nao_publicado"
    )


def _conta_inativa_xp():
    return ValidationError(_("Esta conta não pode receber XP."), code="conta_inativa")


def _conta_inativa_trilha():
    return ValidationError(
        _("Esta conta não pode iniciar trilhas."), code="conta_inativa"
    )


def _conta_inativa_evolucao():
    return ValidationError(
        _("Esta conta não pode evoluir criaturas."), code="conta_inativa"
    )


def _sem_criatura_ativa():
    return ValidationError(
        _("Escolha uma criatura antes de resolver exercícios."),
        code="sem_criatura_ativa",
    )


def xp_do_exercicio(exercicio):
    return XP_POR_DIFICULDADE.get(exercicio.dificuldade, XP_PADRAO)


def multiplicador_de_bonus(*, creature, trilha) -> Decimal:
    """1.00 quando não há linha de bônus para o par. Ausência não é erro."""
    bonus = XpBonus.objects.filter(creature=creature, trilha=trilha).first()
    return bonus.multiplier if bonus else Decimal("1.00")


def nivel_para_xp(xp_total):
    """Maior nível já alcançado. Trava no topo da tabela."""
    nivel = (
        Nivel.objects.filter(xp_necessario__lte=xp_total).order_by("-numero").first()
    )

    if nivel is None:
        raise ImproperlyConfigured(
            "Nenhum nível com xp_necessario igual a 0. A migration de seed dos "
            "níveis não rodou, ou o nível 1 foi removido."
        )

    return nivel


def proximo_nivel(progresso):
    """None quando já está no topo da tabela."""
    return (
        Nivel.objects.filter(numero__gt=progresso.nivel_id).order_by("numero").first()
    )


def criatura_ativa(user):
    return UserCreature.objects.filter(user=user, is_active=True).first()


def obter_progresso(user_creature):
    progresso, _criado = ProgressoCriatura.objects.get_or_create(
        user_creature=user_creature
    )
    return progresso


def exercicios_concluidos(*, user, trilha_slug=None):
    """Conclusões do usuário, das mais recentes para as mais antigas.

    `select_related` porque o payload atravessa exercicio -> trilha: sem ele a
    lista faria duas consultas por linha.

    Os dois filtros não são decoração. `exercicio` é SET_NULL, então evento de
    exercício apagado não tem slug para devolver; e `AJUSTE` é ajuste de
    progressão, não conclusão. Sobra exatamente o que a UniqueConstraint de
    `EventoXP` garante único por usuário: no máximo uma linha por exercício.
    """
    eventos = EventoXP.objects.filter(
        user=user, origem=Origem.EXERCICIO, exercicio__isnull=False
    ).select_related("exercicio__trilha")

    if trilha_slug:
        eventos = eventos.filter(exercicio__trilha__slug=trilha_slug)

    return eventos


def _proximo_estagio(posse):
    """O estágio seguinte ao atual, ou None se a criatura já está na forma final.

    Um por vez, sempre: mesmo quem chega ao nível 25 ainda em filhote passa por
    jovem antes de adulto. Pular etapa tiraria do aluno uma evolução que ele
    ganhou, e ele nunca veria aquela forma.
    """
    atual = posse.current_stage
    seguintes = [e for e in posse.creature.stages.all() if e.stage == atual + 1]
    return seguintes[0] if seguintes else None


def pode_evoluir(*, posse, nivel):
    """Existe um estágio seguinte e o nível já o alcança."""
    seguinte = _proximo_estagio(posse)
    return seguinte is not None and nivel >= seguinte.min_level


def nivel_da_posse(posse):
    """O nível desta criatura.

    O XP é por criatura, não por conta: `ProgressoCriatura` é um-para-um com
    `UserCreature` e só a ativa recebe crédito. Uma criatura recém-adquirida
    começa no nível 1 mesmo numa conta adiantada, e é por isso que o nível não
    pode vir da ativa quando a pergunta é sobre outra criatura.
    """
    return obter_progresso(posse).nivel_id


def maior_nivel_do_usuario(user) -> int:
    """Nível da criatura mais forte do usuário. Sem criatura nenhuma, 0."""
    maior = ProgressoCriatura.objects.filter(user_creature__user=user).aggregate(
        maior=Max("nivel_id")
    )["maior"]
    if maior is not None:
        return maior
    # criatura sem progresso ainda está no nível 1
    return 1 if UserCreature.objects.filter(user=user).exists() else 0


def _ja_na_forma_final():
    return ValidationError(
        _("Esta criatura já está na forma final."), code="forma_final"
    )


def _nivel_insuficiente(minimo):
    return ValidationError(
        _("O próximo estágio exige o nível %(minimo)s.") % {"minimo": minimo},
        code="nivel_insuficiente",
    )


def evoluir_criatura(*, user, posse):
    """Sobe a criatura exatamente um estágio, por vontade do aluno.

    O nível cobrado é o DESTA criatura, não o da ativa: cada uma acumula o
    próprio XP, e uma reserva recém-comprada está no nível 1 por mais alto que
    o companheiro principal esteja.

    A gravação é condicionada ao estágio lido, e não ao objeto em memória: se
    outro pedido evoluiu no meio do caminho, o rowcount vem zero e o segundo
    pedido não sobrescreve com um estágio atrasado.
    """
    if not user.is_active or user.is_anonymized:
        raise ValidationError({"usuario": _conta_inativa_evolucao()})

    seguinte = _proximo_estagio(posse)
    if seguinte is None:
        raise ValidationError({"criatura": _ja_na_forma_final()})

    nivel = nivel_da_posse(posse)
    if nivel < seguinte.min_level:
        raise ValidationError({"criatura": _nivel_insuficiente(seguinte.min_level)})

    partiu_de = posse.current_stage
    gravou = UserCreature.objects.filter(pk=posse.pk, current_stage=partiu_de).update(
        current_stage=seguinte.stage, evolved_at=timezone.now()
    )

    if gravou != 1:
        # Outro pedido evoluiu primeiro. Não é erro do aluno: devolve o estado
        # atual, e a tela mostra a forma que de fato está no banco.
        posse.refresh_from_db(fields=["current_stage", "evolved_at"])
        return posse, partiu_de, False

    posse.refresh_from_db(fields=["current_stage", "evolved_at"])
    return posse, partiu_de, True


def iniciar_trilha(*, user, trilha):
    """Marca a trilha como iniciada. Idempotente de propósito.

    Clicar de novo em "iniciar" não é erro nem reinício: o aluno já está lá. O
    retorno diz se a linha nasceu agora, para a rota escolher entre 201 e 200.
    """
    if not user.is_active or user.is_anonymized:
        raise ValidationError({"usuario": _conta_inativa_trilha()})

    if not trilha.publicada:
        raise ValidationError({"trilha": _trilha_nao_publicada()})

    _, criada = TrilhaIniciada.objects.get_or_create(user=user, trilha=trilha)
    return criada


def trilhas_iniciadas(*, user):
    """Slugs das trilhas que o aluno iniciou.

    Concluir uma fase também conta como iniciar, e as duas fontes entram aqui
    em vez de na tela: assim quem já vinha resolvendo exercícios antes desta
    funcionalidade existir não aparece como se nunca tivesse começado.
    """
    marcadas = TrilhaIniciada.objects.filter(user=user).values_list(
        "trilha__slug", flat=True
    )
    resolvidas = (
        EventoXP.objects.filter(
            user=user, origem=Origem.EXERCICIO, exercicio__isnull=False
        )
        .values_list("exercicio__trilha__slug", flat=True)
        .distinct()
    )
    return sorted(set(marcadas) | set(resolvidas))


DIAS_DA_SEMANA = ("Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom")


def montar_dashboard_admin(*, com_logs=True):
    """Métricas de gestão da plataforma para a aba Dashboard do /admin."""
    aprovada = Q(veredito=Veredito.APROVADO)
    # Dentro da retenção mesmo se o limpar_auditoria atrasar no cron.
    retencao = timezone.now() - timedelta(days=settings.AUDITORIA_RETENCAO_DIAS)
    logs = (
        RegistroDeAuditoria.objects.select_related("actor")
        .filter(created_at__gte=retencao)
        # A consulta do próprio dashboard é registrada e cairia sempre no topo.
        .exclude(acao=AcaoAuditoria.ACESSO_AUDITORIA)
        .order_by("-created_at")[:10]
    )
    total_usuarios = get_user_model().objects.count()
    total_submissoes = Submissao.objects.count()
    xp_total = EventoXP.objects.aggregate(t=Sum("xp"))["t"] or 0
    total_aprovadas = Submissao.objects.filter(aprovada).count()
    return {
        "total_usuarios": total_usuarios,
        "trilhas_publicadas": Trilha.objects.filter(
            status=StatusEditorial.PUBLICADO
        ).count(),
        "fila_revisao": len(itens_no_status(StatusEditorial.REVISAO)),
        "submissoes_judge": total_submissoes,
        # Divisão por zero vira 0: plataforma vazia não é erro.
        "media_xp_por_usuario": _razao(xp_total, total_usuarios),
        "media_submissoes_por_usuario": _razao(total_submissoes, total_usuarios),
        "taxa_aprovacao_submissoes": _razao(total_aprovadas * 100, total_submissoes),
        "novos_usuarios_semana": por_dia(
            get_user_model().objects.all(), "created_at", quantidade=Count("pk")
        ),
        "submissoes_semana": por_dia(
            Submissao.objects.all(),
            "criado_em",
            aprovadas=Count("pk", filter=aprovada),
            rejeitadas=Count("pk", filter=~aprovada),
        ),
        "logs_recentes": list(logs) if com_logs else [],
    }


def _razao(numerador, denominador):
    return round(numerador / denominador, 1) if denominador else 0


def por_dia(queryset, campo, **agregados):
    """`agregados` de `queryset` por dia de `campo`, últimos 7 dias, hoje por último.

    Dia sem linha vem com zero em cada agregado, para o gráfico ter 7 barras.
    """
    inicio = timezone.localdate() - timedelta(days=6)
    # Limite em datetime, não `__date__gte`: função na coluna impede o índice.
    desde = timezone.make_aware(datetime.combine(inicio, time.min))

    # order_by() vazio: a ordenação padrão do model entraria no GROUP BY e
    # quebraria a soma em uma linha por registro.
    linhas = (
        queryset.filter(**{f"{campo}__gte": desde})
        .annotate(dia=TruncDate(campo))
        .values("dia")
        .annotate(**agregados)
        .order_by()
    )
    valores = {linha.pop("dia"): linha for linha in linhas}

    dias = [inicio + timedelta(days=i) for i in range(7)]
    return [
        {
            "dia": DIAS_DA_SEMANA[dia.weekday()],
            "data": dia,
            **{nome: valores.get(dia, {}).get(nome) or 0 for nome in agregados},
        }
        for dia in dias
    ]


def montar_progresso(progresso):
    """Valores relativos, que é o que a barra de XP do front precisa."""
    proximo = proximo_nivel(progresso)
    progresso.proximo_nivel = proximo
    progresso.xp_no_nivel = progresso.xp_total - progresso.nivel.xp_necessario
    progresso.xp_para_o_proximo = (
        proximo.xp_necessario - progresso.nivel.xp_necessario if proximo else None
    )
    return progresso


def ler_sequencia(*, user):
    hoje = timezone.localdate()
    sequencia = Sequencia.objects.filter(user=user).first()
    if sequencia is None:
        return {"atual": 0, "recorde": 0, "feito_hoje": False, "ultimo_dia": None}

    feito_hoje = sequencia.ultimo_dia == hoje
    ativa = feito_hoje or sequencia.ultimo_dia == hoje - timedelta(days=1)
    return {
        "atual": sequencia.atual if ativa else 0,
        "recorde": sequencia.recorde,
        "feito_hoje": feito_hoje,
        "ultimo_dia": sequencia.ultimo_dia,
    }


def registrar_dia(*, user):
    hoje = timezone.localdate()
    type(user).objects.select_for_update().get(pk=user.pk)
    sequencia, _criada = Sequencia.objects.select_for_update().get_or_create(user=user)

    aumentou = sequencia.ultimo_dia != hoje
    if aumentou:
        sequencia.atual = (
            sequencia.atual + 1
            if sequencia.ultimo_dia == hoje - timedelta(days=1)
            else 1
        )
        sequencia.recorde = max(sequencia.recorde, sequencia.atual)
        sequencia.ultimo_dia = hoje
        sequencia.save(
            update_fields=["atual", "recorde", "ultimo_dia", "atualizado_em"]
        )

    return {
        "atual": sequencia.atual,
        "recorde": sequencia.recorde,
        "aumentou": aumentou,
    }


@transaction.atomic
def creditar_exercicio(*, user, exercicio):
    if not user.is_active or user.is_anonymized:
        raise ValidationError({"usuario": _conta_inativa_xp()})

    if not exercicio.publicado:
        raise ValidationError({"exercicio": _exercicio_nao_publicado()})

    ativa = criatura_ativa(user)
    if ativa is None:
        raise ValidationError({"criatura": _sem_criatura_ativa()})

    obter_progresso(ativa)
    progresso = ProgressoCriatura.objects.select_for_update().get(user_creature=ativa)

    # Fica entre a leitura do progresso e a escrita de propósito: os testes de concorrência injetam a gravação alheia neste ponto.
    multiplicador = multiplicador_de_bonus(
        creature=ativa.creature, trilha=exercicio.trilha
    )
    xp = int(xp_do_exercicio(exercicio) * multiplicador)

    try:
        with transaction.atomic():
            EventoXP.objects.create(
                user=user,
                user_creature=ativa,
                exercicio=exercicio,
                origem=Origem.EXERCICIO,
                xp=xp,
            )
            # Resolver uma fase é entrar na trilha. Sem isto, quem pula o botão
            # e vai direto ao exercício ficaria como "não iniciada" na lista.
            TrilhaIniciada.objects.get_or_create(user=user, trilha=exercicio.trilha)
    except IntegrityError:
        sequencia = ler_sequencia(user=user)
        return ResultadoXP(
            progresso=progresso,
            xp_ganho=0,
            subiu_de_nivel=False,
            pode_evoluir=pode_evoluir(posse=ativa, nivel=progresso.nivel_id),
            ja_concluido=True,
            sequencia={
                "atual": sequencia["atual"],
                "recorde": sequencia["recorde"],
                "aumentou": False,
            },
        )

    sequencia = registrar_dia(user=user)

    # A soma vai no banco, não em Python: o UPDATE com F() é atômico e, com o
    # select_for_update acima segurando a linha no Postgres, dois pedidos
    # concorrentes do mesmo usuário não perdem incremento (ler, somar e gravar
    # em Python perderia).
    # `atualizado_em` é auto_now e não dispara em update(); por isso vai à mão.
    agora = timezone.now()
    ProgressoCriatura.objects.filter(pk=progresso.pk).update(
        xp_total=F("xp_total") + xp,
        atualizado_em=agora,
    )
    progresso.refresh_from_db(fields=CAMPOS_RELIDOS)

    alcancado = nivel_para_xp(progresso.xp_total)
    subiu = False

    if alcancado.numero > progresso.nivel_id:
        # Mesma razão do xp_total: gravar o nível calculado sobre a leitura de
        # antes rebaixaria a conta se outro pedido já tivesse subido mais. O
        # filtro deixa a comparação no banco, e o rowcount responde a pergunta
        # que o front usa: foi ESTE pedido que subiu?
        # `nivel_id` é o próprio `Nivel.numero` (PK semântica e monotônica),
        # então `__lt` compara ordem de nível, não chave surrogada.
        subiu = (
            ProgressoCriatura.objects.filter(
                pk=progresso.pk, nivel_id__lt=alcancado.numero
            ).update(nivel=alcancado, atualizado_em=agora)
            == 1
        )

        if subiu:
            progresso.nivel = alcancado
        else:
            # Perdeu a corrida: `nivel` e `xp_total` têm que vir da mesma leitura.
            progresso.refresh_from_db(fields=CAMPOS_RELIDOS)
    else:
        # Mesmo nível: o objeto já está em mãos, e o refresh acima limpou o
        # cache da FK. Sem isto, `montar_progresso` faz um SELECT a cada POST.
        progresso.nivel = alcancado

    # A criatura NÃO evolui aqui. Evoluir é escolha do aluno, feita na tela de
    # configurações, e um estágio por vez. O que este retorno diz é só que a
    # porta abriu, para a tela poder avisar.
    #
    # `ativa` foi lido no começo do pedido e o estágio pode ter mudado desde
    # então; a releitura evita anunciar uma evolução que outro pedido já fez.
    ativa.refresh_from_db(fields=["current_stage"])

    return ResultadoXP(
        progresso=progresso,
        xp_ganho=xp,
        subiu_de_nivel=subiu,
        pode_evoluir=pode_evoluir(posse=ativa, nivel=progresso.nivel_id),
        ja_concluido=False,
        sequencia=sequencia,
    )
