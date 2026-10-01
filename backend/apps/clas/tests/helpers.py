from apps.clas.models import Bandeira, Cargo, Cla, MembroDoCla, TipoDeCla
from apps.gamificacao.models import UserCreature
from apps.gamificacao.services import select_starter_creature
from apps.progressao.models import ProgressoCriatura


def dar_nivel(user, nivel: int, criatura: str = "shellby") -> UserCreature:
    if not UserCreature.objects.filter(user=user).exists():
        posse = select_starter_creature(user=user, creature_slug=criatura)
    else:
        posse = UserCreature.objects.get(user=user, creature_id=criatura)
    ProgressoCriatura.objects.update_or_create(
        user_creature=posse, defaults={"nivel_id": nivel}
    )
    return posse


def montar_cla(lider, tipo=TipoDeCla.PUBLICO, **extra) -> Cla:
    extra.setdefault("nome", "Os Bugados")
    extra.setdefault("bandeira", Bandeira.GUILDA_1)
    cla = Cla.objects.create(tipo=tipo, **extra)
    MembroDoCla.objects.create(cla=cla, user=lider, cargo=Cargo.LIDER)
    return cla


def codigos(resposta) -> list[str]:
    erro = resposta.data["error"]
    return [d["code"] for d in erro["details"]] or [erro["code"]]
