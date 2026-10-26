from django.db import transaction
from django.db.models import Model
from django.db.models.signals import post_save

from apps.clas.models import MembroDoCla
from apps.correcao.models import Submissao
from apps.gamificacao.models import UserCreature
from apps.progressao.models import EventoXP, TrilhaIniciada
from apps.ranking.models import PodioMensal

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
    PodioMensal: (Criterio.PODIOS_MENSAIS, Criterio.VITORIAS_MENSAIS),
}


def _ao_salvar(
    sender: type[Model],
    instance: UserCreature | EventoXP | TrilhaIniciada | Submissao | MembroDoCla,
    created: bool,
    raw: bool = False,
    **kwargs: object,
) -> None:
    if raw:
        return
    if isinstance(instance, Submissao):
        if not instance.hash:
            return
    elif not created:
        return

    # lambda, nao functools.partial: o robust=True loga func.__qualname__,
    # que partial nao tem, e a falha viraria AttributeError.
    user_id, criterios = instance.user_id, GATILHOS[sender]
    transaction.on_commit(lambda: avaliar_por_id(user_id, criterios), robust=True)


for _modelo in GATILHOS:
    post_save.connect(
        _ao_salvar,
        sender=_modelo,
        dispatch_uid=f"conquistas_{_modelo._meta.label_lower}",
    )
