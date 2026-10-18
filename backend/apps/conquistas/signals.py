from functools import partial

from django.db import transaction
from django.db.models.signals import post_save

from apps.clas.models import MembroDoCla
from apps.correcao.models import Submissao
from apps.gamificacao.models import UserCreature
from apps.progressao.models import EventoXP, TrilhaIniciada

from .models import Criterio
from .services import avaliar_por_id

GATILHOS = {
    UserCreature: (Criterio.CRIATURA_ESCOLHIDA,),
    EventoXP: (Criterio.EXERCICIOS_CONCLUIDOS, Criterio.NIVEL_ALCANCADO),
    TrilhaIniciada: (Criterio.TRILHAS_INICIADAS,),
    Submissao: (
        Criterio.CODIGO_EXECUTADO,
        Criterio.APROVADO_DE_PRIMEIRA,
        Criterio.APROVADO_APOS_ERRO,
    ),
    MembroDoCla: (Criterio.MEMBRO_DE_CLA,),
}


def _ao_salvar(sender, instance, created, raw=False, **kwargs):
    if raw:
        return
    if sender is Submissao:
        if not instance.hash:
            return
    elif not created:
        return

    transaction.on_commit(
        partial(avaliar_por_id, instance.user_id, GATILHOS[sender]), robust=True
    )


for _modelo in GATILHOS:
    post_save.connect(
        _ao_salvar,
        sender=_modelo,
        dispatch_uid=f"conquistas_{_modelo._meta.label_lower}",
    )
