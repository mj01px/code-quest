from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import Count, Max
from django.http import Http404
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework.exceptions import PermissionDenied

from apps.progressao.models import Nivel
from apps.progressao.services import maior_nivel_do_usuario

from .models import (
    NIVEL_MINIMO_GLOBAL,
    Cargo,
    Cla,
    ConviteDoCla,
    MembroDoCla,
    TipoDeCla,
    gerar_tag,
)

CAMPOS_EDITAVEIS = ("descricao", "bandeira", "tipo", "nivel_minimo")
CARGOS_DE_GESTAO = (Cargo.LIDER, Cargo.COLIDER)

_TENTATIVAS_DE_TAG = 5


def _ja_em_cla():
    return ValidationError(_("Você já faz parte de um clã."), code="ja_em_cla")


def _nao_encontrado():
    return Http404(_("Clã não encontrado."))


def _cargo_insuficiente():
    return PermissionDenied(
        _("Seu cargo no clã não permite esta ação."), code="cargo_insuficiente"
    )


def _exigir_nivel(user, minimo):
    if maior_nivel_do_usuario(user) < minimo:
        raise ValidationError(
            _("Sua criatura precisa estar no nível %(minimo)s.") % {"minimo": minimo},
            code="nivel_insuficiente",
        )


def _validar_nivel_minimo(valor):
    teto = Nivel.objects.aggregate(teto=Max("numero"))["teto"] or NIVEL_MINIMO_GLOBAL
    if not NIVEL_MINIMO_GLOBAL <= valor <= teto:
        raise ValidationError(
            {
                "nivel_minimo": ValidationError(
                    _("O nível mínimo precisa ficar entre %(min)s e %(max)s.")
                    % {"min": NIVEL_MINIMO_GLOBAL, "max": teto},
                    code="nivel_minimo_invalido",
                )
            }
        )


def com_total_de_membros(queryset):
    return queryset.annotate(total_membros=Count("membros"))


def obter_cla_visivel(*, user, tag):
    """Clã privado só aparece pra quem é membro. Pros outros é 404, igual tag que não existe."""
    cla = com_total_de_membros(Cla.objects.filter(tag=tag.upper())).first()
    if cla is None:
        raise _nao_encontrado()
    if cla.tipo == TipoDeCla.PRIVADO and not cla.membros.filter(user=user).exists():
        raise _nao_encontrado()
    return cla


def meu_cla(user):
    return (
        MembroDoCla.objects.select_related("cla")
        .filter(user=user)
        .annotate(total_membros=Count("cla__membros"))
        .first()
    )


@transaction.atomic
def criar_cla(
    *,
    user,
    nome,
    bandeira,
    descricao="",
    tipo=TipoDeCla.PUBLICO,
    nivel_minimo=NIVEL_MINIMO_GLOBAL,
):
    if user.email_verified_at is None:
        raise ValidationError(
            _("Confirme seu e-mail antes de criar um clã."), code="email_nao_verificado"
        )
    _exigir_nivel(user, NIVEL_MINIMO_GLOBAL)
    if MembroDoCla.objects.filter(user=user).exists():
        raise _ja_em_cla()
    _validar_nivel_minimo(nivel_minimo)

    cla = Cla(
        tag=gerar_tag(),
        nome=nome,
        descricao=descricao,
        bandeira=bandeira,
        tipo=tipo,
        nivel_minimo=nivel_minimo,
    )
    cla.full_clean(exclude=["tag"])

    # tag repetida é raríssimo, mas se acontecer tenta outra
    for tentativa in range(_TENTATIVAS_DE_TAG):
        try:
            with transaction.atomic():
                cla.save(force_insert=True)
            break
        except IntegrityError:
            if tentativa == _TENTATIVAS_DE_TAG - 1:
                raise
            cla.tag = gerar_tag()

    try:
        with transaction.atomic():
            MembroDoCla.objects.create(cla=cla, user=user, cargo=Cargo.LIDER)
    except IntegrityError:
        raise _ja_em_cla() from None

    cla.total_membros = 1
    return cla


@transaction.atomic
def editar_cla(*, user, tag, dados):
    cla = obter_cla_visivel(user=user, tag=tag)
    # trava a linha pra duas edições não se atropelarem
    cla = Cla.objects.select_for_update().get(pk=cla.pk)

    membro = cla.membros.filter(user=user).first()
    if membro is None or membro.cargo not in CARGOS_DE_GESTAO:
        raise _cargo_insuficiente()

    if "nivel_minimo" in dados:
        _validar_nivel_minimo(dados["nivel_minimo"])

    virou_publico = (
        cla.tipo == TipoDeCla.PRIVADO and dados.get("tipo") == TipoDeCla.PUBLICO
    )

    for campo in CAMPOS_EDITAVEIS:
        if campo in dados:
            setattr(cla, campo, dados[campo])
    cla.full_clean(exclude=["tag", "nome"])
    cla.save()

    if virou_publico:
        ConviteDoCla.objects.filter(cla=cla, revogado_em__isnull=True).update(
            revogado_em=timezone.now()
        )

    return com_total_de_membros(Cla.objects.filter(pk=cla.pk)).get()
