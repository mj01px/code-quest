from django.dispatch import receiver

from apps.contas.signals import conta_anonimizada

from .services import remover_conta_excluida


@receiver(conta_anonimizada)
def tirar_do_cla(sender, user, **kwargs):
    remover_conta_excluida(user)
