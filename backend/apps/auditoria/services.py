"""Serviço de gravação da trilha de auditoria.

Ponto único de escrita. Qualquer fluxo que precise registrar um evento chama
`registrar(...)`. A gravação é resiliente: uma falha aqui nunca derruba a
requisição que a originou (um login não pode falhar porque a auditoria falhou).

Exceção: quando o registro é prova obrigatória (hoje, só a anonimização LGPD),
não use `registrar()`. Grave com `RegistroDeAuditoria.objects.create()` dentro
do atomic() da ação, para que a falha do registro desfaça a ação.

Regra de ouro: NUNCA passe senha, token ou conteúdo sensível em `metadata`.
"""

import logging

from django.db import transaction

from .models import AcaoAuditoria, RegistroDeAuditoria

logger = logging.getLogger("apps.auditoria")

__all__ = ["registrar", "AcaoAuditoria"]


def _ip(request) -> str | None:
    # Espelha apps.contas.serializers._ip_do_cliente: usa REMOTE_ADDR, coerente
    # com NUM_PROXIES=0 (o cliente não consegue forjar via X-Forwarded-For).
    if request is None:
        return None
    return request.META.get("REMOTE_ADDR") or None


def _user_agent(request) -> str:
    if request is None:
        return ""
    return (request.META.get("HTTP_USER_AGENT") or "")[:256]


def _resolver_ator(request, actor):
    if actor is not None:
        return actor
    if request is not None:
        usuario = getattr(request, "user", None)
        if usuario is not None and getattr(usuario, "is_authenticated", False):
            return usuario
    return None


def registrar(acao, *, request=None, actor=None, alvo=None, **metadata):
    """Grava um evento de auditoria e devolve o registro (ou None se falhar).

    - `actor`: usuário responsável. Se omitido, usa `request.user` quando
      autenticado. Anônimo fica com actor nulo.
    - `alvo`: objeto afetado (opcional); grava tipo e id por duck-typing.
    - `metadata`: contexto não sensível (motivo, filtros, flags).
    """
    try:
        ator = _resolver_ator(request, actor)

        ator_fk = None
        email = ""
        if ator is not None and getattr(ator, "pk", None) is not None:
            ator_fk = ator
            email = getattr(ator, "email", "") or ""

        alvo_tipo = ""
        alvo_id = ""
        if alvo is not None:
            alvo_tipo = alvo.__class__.__name__.lower()
            alvo_id = str(getattr(alvo, "pk", "") or "")

        # Savepoint próprio: qualquer exceção dentro do save() marca para
        # rollback o atomic() de quem chamou (mark_for_rollback_on_error). Sem
        # ele, o except abaixo engole o erro e a ação volta atrás em silêncio.
        with transaction.atomic():
            return RegistroDeAuditoria.objects.create(
                acao=acao,
                actor=ator_fk,
                actor_email_snapshot=email,
                alvo_tipo=alvo_tipo,
                alvo_id=alvo_id,
                ip=_ip(request),
                user_agent=_user_agent(request),
                metadata=metadata or {},
            )
    except Exception:  # noqa: BLE001 - auditoria nunca pode quebrar o fluxo
        logger.warning("Falha ao registrar auditoria (acao=%s)", acao, exc_info=True)
        return None
