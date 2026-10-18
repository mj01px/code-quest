from apps.conquistas.models import ConquistaDesbloqueada
from apps.correcao.models import Modo, Submissao, Veredito


def desbloqueadas(user) -> set[str]:
    return set(
        ConquistaDesbloqueada.objects.filter(user=user).values_list(
            "conquista_id", flat=True
        )
    )


def submeter(user, exercicio, veredito=Veredito.APROVADO, modo=Modo.ENVIAR, hash="h"):
    return Submissao.objects.create(
        user=user,
        exercicio=exercicio,
        modo=modo,
        codigo="def f(): pass",
        hash=hash,
        veredito=veredito,
    )
