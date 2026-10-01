import hashlib
import re
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import Case, Count, Max, Q, Value, When
from django.http import Http404
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework.exceptions import PermissionDenied

from apps.progressao.models import Nivel
from apps.progressao.services import maior_nivel_do_usuario

from .models import (
    NIVEL_MINIMO_GLOBAL,
    TAG_ALFABETO,
    TAG_TAMANHO,
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
_FORMATO_TAG = re.compile(rf"^[{TAG_ALFABETO}]{{{TAG_TAMANHO}}}$")


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


def buscar_clas(busca=""):
    """Só clãs públicos. Busca pelo nome ou pela tag exata, com ou sem #."""
    clas = com_total_de_membros(Cla.objects.filter(tipo=TipoDeCla.PUBLICO))
    busca = busca.strip()
    if busca:
        filtro = Q(nome__icontains=busca)
        tag = busca.removeprefix("#").upper()
        if _FORMATO_TAG.match(tag):
            filtro |= Q(tag=tag)
        clas = clas.filter(filtro)
    return clas.order_by("-total_membros", "nome", "tag")


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


def _travar_cla(cla_id):
    # sempre trava o clã antes de mexer nos membros, assim limite e liderança
    # não furam com requisições ao mesmo tempo
    cla = Cla.objects.select_for_update().filter(pk=cla_id).first()
    if cla is None:
        raise _nao_encontrado()
    return cla


def _adicionar_membro(*, user, cla):
    if MembroDoCla.objects.filter(user=user).exists():
        raise _ja_em_cla()
    _exigir_nivel(user, max(cla.nivel_minimo, NIVEL_MINIMO_GLOBAL))
    if cla.membros.count() >= settings.CLA_LIMITE_MEMBROS:
        raise ValidationError(_("Este clã está cheio."), code="cla_cheio")

    try:
        with transaction.atomic():
            return MembroDoCla.objects.create(cla=cla, user=user, cargo=Cargo.MEMBRO)
    except IntegrityError:
        raise _ja_em_cla() from None


@transaction.atomic
def entrar_no_cla(*, user, tag):
    cla = obter_cla_visivel(user=user, tag=tag)
    if cla.tipo != TipoDeCla.PUBLICO:
        # membro de clã privado chegando aqui já está em clã
        raise _ja_em_cla()
    cla = _travar_cla(cla.pk)
    return _adicionar_membro(user=user, cla=cla)


@transaction.atomic
def sair_do_cla(*, user):
    """Sai do clã. Se era o último membro, o clã é apagado."""
    cla_id = (
        MembroDoCla.objects.filter(user=user).values_list("cla_id", flat=True).first()
    )
    if cla_id is None:
        raise ValidationError(_("Você não faz parte de um clã."), code="sem_cla")

    cla = _travar_cla(cla_id)
    membro = cla.membros.filter(user=user).first()
    if membro is None:
        # foi expulso enquanto saía
        raise ValidationError(_("Você não faz parte de um clã."), code="sem_cla")

    if membro.cargo == Cargo.LIDER and cla.membros.exclude(pk=membro.pk).exists():
        raise ValidationError(
            _("Passe a liderança para outro membro antes de sair."),
            code="lider_precisa_transferir",
        )

    membro.delete()
    if not cla.membros.exists():
        cla.delete()


def listar_membros(*, user, tag):
    cla = obter_cla_visivel(user=user, tag=tag)
    ordem_do_cargo = Case(
        When(cargo=Cargo.LIDER, then=Value(0)),
        When(cargo=Cargo.COLIDER, then=Value(1)),
        default=Value(2),
    )
    return (
        cla.membros.select_related("user")
        .annotate(ordem_do_cargo=ordem_do_cargo)
        .order_by("ordem_do_cargo", "entrou_em")
    )


def _preparar_gestao(*, user, tag, membro_id):
    """Trava o clã e devolve (quem age, quem sofre a ação)."""
    cla = obter_cla_visivel(user=user, tag=tag)
    cla = _travar_cla(cla.pk)

    ator = cla.membros.filter(user=user).first()
    if ator is None or ator.cargo not in CARGOS_DE_GESTAO:
        raise _cargo_insuficiente()

    alvo = cla.membros.select_related("user").filter(pk=membro_id).first()
    if alvo is None:
        raise Http404(_("Membro não encontrado neste clã."))
    if alvo.pk == ator.pk:
        raise ValidationError(
            _("Você não pode fazer isso com você mesmo."), code="acao_em_si_mesmo"
        )
    return ator, alvo


@transaction.atomic
def mudar_cargo(*, user, tag, membro_id, cargo):
    """Promove membro a co-líder ou rebaixa co-líder a membro."""
    ator, alvo = _preparar_gestao(user=user, tag=tag, membro_id=membro_id)

    if alvo.cargo == Cargo.LIDER:
        raise _cargo_insuficiente()
    if alvo.cargo == Cargo.COLIDER and cargo == Cargo.MEMBRO:
        # só o líder rebaixa co-líder
        if ator.cargo != Cargo.LIDER:
            raise _cargo_insuficiente()

    if alvo.cargo != cargo:
        alvo.cargo = cargo
        alvo.save(update_fields=["cargo"])
    return alvo


@transaction.atomic
def expulsar(*, user, tag, membro_id):
    ator, alvo = _preparar_gestao(user=user, tag=tag, membro_id=membro_id)

    if alvo.cargo == Cargo.LIDER:
        raise _cargo_insuficiente()
    if alvo.cargo == Cargo.COLIDER and ator.cargo != Cargo.LIDER:
        raise _cargo_insuficiente()

    alvo.delete()


@transaction.atomic
def transferir_lideranca(*, user, tag, membro_id):
    """O líder passa a liderança e vira co-líder."""
    ator, alvo = _preparar_gestao(user=user, tag=tag, membro_id=membro_id)
    if ator.cargo != Cargo.LIDER:
        raise _cargo_insuficiente()

    # rebaixa antes de promover por causa da constraint de um líder por clã
    ator.cargo = Cargo.COLIDER
    ator.save(update_fields=["cargo"])
    alvo.cargo = Cargo.LIDER
    alvo.save(update_fields=["cargo"])
    return alvo


def _hash_do_token(token):
    return hashlib.sha256(token.encode()).hexdigest()


def montar_link_de_convite(token):
    return f"{settings.FRONTEND_URL}/clas/convite/{token}"


def _convite_invalido():
    return Http404(_("Convite inválido ou expirado."))


def _gestor_do_cla(*, user, tag):
    cla = obter_cla_visivel(user=user, tag=tag)
    cla = _travar_cla(cla.pk)
    membro = cla.membros.filter(user=user).first()
    if membro is None or membro.cargo not in CARGOS_DE_GESTAO:
        raise _cargo_insuficiente()
    return cla


def _revogar_convite_ativo(cla):
    ConviteDoCla.objects.filter(cla=cla, revogado_em__isnull=True).update(
        revogado_em=timezone.now()
    )


@transaction.atomic
def gerar_convite(*, user, tag):
    """Gera um link novo e derruba o anterior. Devolve (convite, token)."""
    cla = _gestor_do_cla(user=user, tag=tag)
    if cla.tipo != TipoDeCla.PRIVADO:
        raise ValidationError(
            _("Clã público não precisa de convite."), code="cla_publico"
        )

    _revogar_convite_ativo(cla)
    token = secrets.token_urlsafe(32)
    agora = timezone.now()
    convite = ConviteDoCla.objects.create(
        cla=cla,
        token_hash=_hash_do_token(token),
        criado_por=user,
        criado_em=agora,
        expira_em=agora + timedelta(days=settings.CLA_CONVITE_VALIDADE_DIAS),
    )
    return convite, token


@transaction.atomic
def revogar_convite(*, user, tag):
    cla = _gestor_do_cla(user=user, tag=tag)
    _revogar_convite_ativo(cla)


def _convite_ativo(token):
    # token vazio ou gigante nem vai pro banco
    if not token or len(token) > 100:
        return None
    return (
        ConviteDoCla.objects.select_related("cla")
        .filter(
            token_hash=_hash_do_token(token),
            revogado_em__isnull=True,
            expira_em__gt=timezone.now(),
        )
        .first()
    )


def ver_convite(token):
    convite = _convite_ativo(token)
    if convite is None:
        raise _convite_invalido()
    return com_total_de_membros(Cla.objects.filter(pk=convite.cla_id)).get()


@transaction.atomic
def aceitar_convite(*, user, token):
    convite = _convite_ativo(token)
    if convite is None:
        raise _convite_invalido()

    cla = _travar_cla(convite.cla_id)
    # confere de novo com o clã travado, pode ter sido revogado no meio
    if _convite_ativo(token) is None or cla.tipo != TipoDeCla.PRIVADO:
        raise _convite_invalido()
    return _adicionar_membro(user=user, cla=cla)


@transaction.atomic
def remover_conta_excluida(user):
    """Tira do clã quem teve a conta excluída. Se era líder, passa a liderança."""
    cla_id = (
        MembroDoCla.objects.filter(user=user).values_list("cla_id", flat=True).first()
    )
    if cla_id is None:
        return

    cla = _travar_cla(cla_id)
    membro = cla.membros.get(user=user)
    era_lider = membro.cargo == Cargo.LIDER
    membro.delete()

    restantes = cla.membros.all()
    if not restantes.exists():
        cla.delete()
        return

    if era_lider:
        # co-líder mais antigo; sem co-líder, um membro qualquer
        sucessor = (
            restantes.filter(cargo=Cargo.COLIDER).order_by("entrou_em", "pk").first()
            or restantes.order_by("?").first()
        )
        sucessor.cargo = Cargo.LIDER
        sucessor.save(update_fields=["cargo"])
