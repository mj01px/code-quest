"""Serviços de direitos do titular (LGPD): exportação e anonimização.

Os imports de outras apps são locais de propósito: `contas` é carregada antes de
`auditoria`/`gamificacao`/`progressao`, então importar os modelos delas no topo
quebraria a inicialização. Em tempo de execução o registro de apps já está pronto.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

MASCARA_EMAIL = "*" * 9


@dataclass(frozen=True)
class ResultadoDescarte:
    registros_de_progresso: int
    contas: int


def mascarar_email(email: str) -> str:
    local, _, dominio = (email or "").partition("@")
    if not local or not dominio:
        return MASCARA_EMAIL
    visiveis = min(8, len(local) // 2)
    sufixo = dominio.rsplit(".", 1)[-1] if "." in dominio else ""
    return f"{local[:visiveis]}{MASCARA_EMAIL}{'.' + sufixo if sufixo else ''}"


def exportar_dados(user) -> dict:
    """Monta o pacote de dados pessoais do titular (portabilidade)."""
    from apps.auditoria.models import RegistroDeAuditoria
    from apps.clas.models import MembroDoCla
    from apps.gamificacao.models import UserCreature
    from apps.progressao.models import EventoXP, TrilhaIniciada

    from .models import AceiteDeTermos

    def iso(valor):
        return valor.isoformat() if valor else None

    criaturas = []
    for c in (
        UserCreature.objects.filter(user=user)
        .select_related("creature", "progresso")
        .order_by("acquired_at")
    ):
        progresso = getattr(c, "progresso", None)
        criaturas.append(
            {
                "criatura": c.creature_id,
                "estagio": c.current_stage,
                "inicial": c.is_starter,
                "ativa": c.is_active,
                "xp_total": progresso.xp_total if progresso else None,
                "nivel": progresso.nivel_id if progresso else None,
                "adquirida_em": iso(c.acquired_at),
                "evoluida_em": iso(c.evolved_at),
            }
        )

    membro = MembroDoCla.objects.select_related("cla").filter(user=user).first()
    cla = (
        {
            "tag": membro.cla.tag,
            "nome": membro.cla.nome,
            "cargo": membro.cargo,
            "entrou_em": iso(membro.entrou_em),
        }
        if membro
        else None
    )

    return {
        "gerado_em": timezone.now().isoformat(),
        "perfil": {
            "id": str(user.id),
            "email": user.email,
            "email_pendente": user.email_pendente or None,
            "nickname": user.nickname,
            "papel": user.role,
            "nivel_de_acesso": (
                user.nivel_de_acesso.nome if user.nivel_de_acesso_id else None
            ),
            "criado_em": iso(user.created_at),
            "email_verificado_em": iso(user.email_verified_at),
        },
        "aceites": [
            {
                "documento": a.documento,
                "versao": a.versao,
                "aceito_em": iso(a.aceito_em),
                "ip": a.ip,
            }
            for a in AceiteDeTermos.objects.filter(user=user).order_by("aceito_em")
        ],
        "trilhas_iniciadas": [
            {"trilha": t.trilha.slug, "iniciada_em": iso(t.iniciada_em)}
            for t in TrilhaIniciada.objects.filter(user=user)
            .select_related("trilha")
            .order_by("iniciada_em")
        ],
        "xp": [
            {
                "origem": e.origem,
                "xp": e.xp,
                "exercicio": e.exercicio.slug if e.exercicio else None,
                "criado_em": iso(e.criado_em),
            }
            for e in EventoXP.objects.filter(user=user)
            .select_related("exercicio")
            .order_by("criado_em")
        ],
        "criaturas": criaturas,
        "cla": cla,
        "atividade": [
            {"acao": r.acao, "criado_em": iso(r.created_at), "ip": r.ip}
            for r in RegistroDeAuditoria.objects.filter(actor=user).order_by(
                "created_at"
            )
        ],
    }


def anonimizar_conta(user, **metadata) -> bool:
    """Executa a exclusão por anonimização: embaralha a PII do usuário e apaga a
    PII derivada (snapshot de e-mail, IP e user agent na auditoria, IP dos
    aceites, segredo e códigos de MFA), preservando os agregados e a prova de
    aceite. Encerra as sessões. Idempotente, inclusive sob pedidos simultâneos.

    O registro CONTA_ANONIMIZADA é prova obrigatória (decisão de 2026-09-25):
    é gravado direto, sem o `registrar()` que engole falha. Se não gravar, a
    exceção sobe e o atomic() desfaz a anonimização inteira. `metadata` vai
    nesse registro (ex.: qual admin pediu), então também é obrigatório.
    """
    from rest_framework_simplejwt.token_blacklist.models import (
        BlacklistedToken,
        OutstandingToken,
    )

    from apps.auditoria.models import AcaoAuditoria, RegistroDeAuditoria

    from .models import AceiteDeTermos, CodigoRecuperacaoMFA, ConfiguracaoMFA, User
    from .signals import conta_anonimizada

    with transaction.atomic():
        # Trava a linha e relê: dois pedidos ao mesmo tempo não anonimizam duas
        # vezes nem duplicam o registro de auditoria.
        list(User.objects.select_for_update().filter(pk=user.pk).only("pk"))
        user.refresh_from_db(fields=["anonymized_at"])
        if user.is_anonymized:
            return False

        for token in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=token)
        user.anonimizar()
        conta_anonimizada.send(sender=User, user=user)
        # Registra o evento antes do scrub, para que o update abaixo limpe o
        # snapshot desta própria linha também: nada de e-mail sobra na trilha.
        RegistroDeAuditoria.objects.create(
            acao=AcaoAuditoria.CONTA_ANONIMIZADA, actor=user, metadata=metadata
        )
        RegistroDeAuditoria.objects.filter(actor=user).update(
            actor_email_snapshot="", ip=None, user_agent=""
        )
        AceiteDeTermos.objects.filter(user=user).update(ip=None)
        ConfiguracaoMFA.objects.filter(user=user).delete()
        CodigoRecuperacaoMFA.objects.filter(user=user).delete()

    return True


def descartar_contas_excluidas(
    *, simular: bool = False, agora: datetime | None = None
) -> ResultadoDescarte:
    from apps.autoria.models import SolicitacaoAutoria
    from apps.conquistas.models import ConquistaDesbloqueada
    from apps.correcao.models import Submissao
    from apps.gamificacao.models import UserCreature
    from apps.progressao.models import (
        EtapaConcluida,
        EventoXP,
        Sequencia,
        TrilhaIniciada,
    )
    from apps.ranking.models import PodioMensal

    from .models import User

    agora = agora or timezone.now()
    limite_progresso = agora - timedelta(
        days=settings.CONTA_EXCLUIDA_RETENCAO_PROGRESSO_DIAS
    )
    limite_aceite = agora - timedelta(days=settings.CONTA_EXCLUIDA_RETENCAO_ACEITE_DIAS)

    vencidas = User.objects.filter(
        anonymized_at__isnull=False, anonymized_at__lt=limite_progresso
    )
    encerradas = User.objects.filter(
        anonymized_at__isnull=False, anonymized_at__lt=limite_aceite
    )
    progresso = [
        EventoXP.objects.filter(user__in=vencidas),
        Submissao.objects.filter(user__in=vencidas),
        ConquistaDesbloqueada.objects.filter(user__in=vencidas),
        UserCreature.objects.filter(user__in=vencidas),
        EtapaConcluida.objects.filter(user__in=vencidas),
        TrilhaIniciada.objects.filter(user__in=vencidas),
        Sequencia.objects.filter(user__in=vencidas),
        PodioMensal.objects.filter(user__in=vencidas),
        SolicitacaoAutoria.objects.filter(usuario__in=vencidas),
    ]

    if simular:
        return ResultadoDescarte(
            registros_de_progresso=sum(qs.count() for qs in progresso),
            contas=encerradas.count(),
        )

    with transaction.atomic():
        registros = sum(qs.delete()[0] for qs in progresso)
        _, por_modelo = encerradas.delete()

    return ResultadoDescarte(
        registros_de_progresso=registros,
        contas=por_modelo.get(User._meta.label, 0),
    )
