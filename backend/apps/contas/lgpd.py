"""Serviços de direitos do titular (LGPD): exportação e anonimização.

Os imports de outras apps são locais de propósito: `contas` é carregada antes de
`auditoria`/`gamificacao`/`progressao`, então importar os modelos delas no topo
quebraria a inicialização. Em tempo de execução o registro de apps já está pronto.
"""

from django.db import transaction
from django.utils import timezone


def exportar_dados(user) -> dict:
    """Monta o pacote de dados pessoais do titular (portabilidade)."""
    from apps.auditoria.models import RegistroDeAuditoria
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
            "data_nascimento": iso(user.birth_date),
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
        "atividade": [
            {"acao": r.acao, "criado_em": iso(r.created_at), "ip": r.ip}
            for r in RegistroDeAuditoria.objects.filter(actor=user).order_by(
                "created_at"
            )
        ],
    }


def anonimizar_conta(user) -> bool:
    """Executa a exclusão por anonimização: embaralha a PII do usuário e apaga a
    PII derivada (snapshot de e-mail na auditoria, IP dos aceites), preservando
    os agregados e a prova de aceite. Idempotente.

    O registro CONTA_ANONIMIZADA é prova obrigatória (decisão de 2026-09-25):
    é gravado direto, sem o `registrar()` que engole falha. Se não gravar, a
    exceção sobe e o atomic() desfaz a anonimização inteira.
    """
    from apps.auditoria.models import AcaoAuditoria, RegistroDeAuditoria

    from .models import AceiteDeTermos

    if user.is_anonymized:
        return False

    with transaction.atomic():
        user.anonimizar()
        # Registra o evento antes do scrub, para que o update abaixo limpe o
        # snapshot desta própria linha também: nada de e-mail sobra na trilha.
        RegistroDeAuditoria.objects.create(
            acao=AcaoAuditoria.CONTA_ANONIMIZADA, actor=user
        )
        RegistroDeAuditoria.objects.filter(actor=user).update(actor_email_snapshot="")
        AceiteDeTermos.objects.filter(user=user).update(ip=None)

    return True
