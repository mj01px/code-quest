"""Pedido de autoria: o aluno pede, o admin aprova (vira autor) ou rejeita.

Só pode haver um pedido pendente por usuário, garantido no banco. Aprovar dá o
nível "Autor"; rejeitar exige motivo e libera um pedido novo. Toda decisão vai
para a trilha de auditoria.
"""

import pytest
from django.db import IntegrityError
from django.urls import reverse
from rest_framework.test import APIClient

from apps.auditoria.models import AcaoAuditoria, RegistroDeAuditoria
from apps.autoria.models import SolicitacaoAutoria
from apps.contas.models import User
from apps.contas.tests.helpers import criar_admin, criar_aluno, criar_autor
from apps.trilhas.models import StatusEditorial
from apps.trilhas.tests.helpers import criar_trilha

pytestmark = pytest.mark.django_db

CARTA = "Programo em Python há cinco anos e quero escrever trilhas de lógica. " * 2
PENDENTE = SolicitacaoAutoria.Status.PENDENTE


def cliente(usuario=None):
    c = APIClient()
    if usuario is not None:
        c.force_authenticate(user=usuario)
    return c


def payload(**extra):
    dados = {
        "areas": [criar_trilha("python").pk],
        "carta_apresentacao": CARTA,
        "portfolio_link": "https://github.com/aluno",
        "aceite_diretrizes": True,
    }
    dados.update(extra)
    return dados


def pedir(usuario, **extra):
    return cliente(usuario).post(
        reverse("autoria:solicitacoes"), payload(**extra), format="json"
    )


def codigo_do_erro(resposta):
    return resposta.json()["error"]["details"][0]["code"]


def pedido_de(usuario):
    return SolicitacaoAutoria.objects.create(
        usuario=usuario, carta_apresentacao=CARTA, aceite_diretrizes=True
    )


# --- Aluno ---


def test_aluno_envia_solicitacao():
    aluno = criar_aluno()

    resposta = pedir(aluno)

    assert resposta.status_code == 201
    assert resposta.data["situacao"] == PENDENTE
    assert resposta.data["areas_nomes"] == ["Python"]
    assert SolicitacaoAutoria.objects.get().usuario == aluno


@pytest.mark.parametrize(
    "extra",
    [
        {"carta_apresentacao": "curta demais"},
        {"aceite_diretrizes": False},
        {"areas": []},
        {"portfolio_link": "nao e url"},
    ],
)
def test_dados_invalidos_recebem_400(extra):
    resposta = pedir(criar_aluno(), **extra)

    assert resposta.status_code == 400
    assert not SolicitacaoAutoria.objects.exists()


def test_area_em_rascunho_nao_e_aceita():
    rascunho = criar_trilha("nova", status=StatusEditorial.RASCUNHO)

    resposta = pedir(criar_aluno(), areas=[rascunho.pk])

    assert resposta.status_code == 400


def test_segundo_pedido_pendente_recebe_400():
    aluno = criar_aluno()
    pedido_de(aluno)

    resposta = pedir(aluno)

    assert resposta.status_code == 400
    assert codigo_do_erro(resposta) == "solicitacao_pendente"


def test_banco_recusa_dois_pendentes_do_mesmo_usuario():
    aluno = criar_aluno()
    pedido_de(aluno)

    with pytest.raises(IntegrityError):
        pedido_de(aluno)


def test_quem_ja_cria_conteudo_nao_pede():
    resposta = pedir(criar_autor())

    assert resposta.status_code == 400
    assert codigo_do_erro(resposta) == "ja_autor"


def test_anonimo_recebe_401():
    assert pedir(None).status_code == 401


def test_minha_solicitacao_sem_pedido_recebe_404():
    resposta = cliente(criar_aluno()).get(reverse("autoria:minha-solicitacao"))

    assert resposta.status_code == 404


def test_minha_solicitacao_devolve_a_mais_recente():
    aluno = criar_aluno()
    antiga = pedido_de(aluno)
    antiga.status = SolicitacaoAutoria.Status.REJEITADA
    antiga.motivo_rejeicao = "Carta genérica."
    antiga.save()
    nova = pedido_de(aluno)
    pedido_de(criar_aluno("outro"))

    resposta = cliente(aluno).get(reverse("autoria:minha-solicitacao"))

    assert resposta.status_code == 200
    assert resposta.data["id"] == nova.pk
    assert resposta.data["situacao"] == PENDENTE


# --- Admin ---


def url_decisao(acao, pk):
    return reverse(f"autoria:admin-solicitacao-{acao}", kwargs={"pk": pk})


def test_admin_lista_so_pendentes_com_o_solicitante():
    aluno = criar_aluno()
    pendente = pedido_de(aluno)
    decidida = pedido_de(criar_aluno("outro"))
    decidida.status = SolicitacaoAutoria.Status.APROVADA
    decidida.save()

    resposta = cliente(criar_admin()).get(reverse("autoria:admin-solicitacoes"))

    assert resposta.status_code == 200
    assert [s["id"] for s in resposta.data] == [pendente.pk]
    assert resposta.data[0]["solicitante"]["nickname"] == aluno.nickname


@pytest.mark.parametrize("quem", [criar_aluno, criar_autor])
def test_sem_permissao_nao_lista_nem_decide(quem):
    pedido = pedido_de(criar_aluno("candidato"))
    c = cliente(quem())

    assert c.get(reverse("autoria:admin-solicitacoes")).status_code == 403
    assert c.post(url_decisao("aprovar", pedido.pk)).status_code == 403


def test_aprovar_da_nivel_de_autor_e_audita():
    aluno = criar_aluno()
    pedido = pedido_de(aluno)

    resposta = cliente(criar_admin()).post(url_decisao("aprovar", pedido.pk))

    assert resposta.status_code == 200
    assert resposta.data["situacao"] == SolicitacaoAutoria.Status.APROVADA
    aluno = User.objects.get(pk=aluno.pk)
    assert aluno.role == User.Role.AUTHOR
    assert aluno.nivel_de_acesso.nome == "Autor"
    assert aluno.has_perm("trilhas.create")
    registro = RegistroDeAuditoria.objects.get(acao=AcaoAuditoria.AUTORIA_APROVADA)
    assert registro.alvo_id == str(aluno.pk)


def test_aprovar_nao_rebaixa_quem_ja_cria_conteudo():
    admin = criar_admin("outroadmin")
    pedido = pedido_de(admin)

    cliente(criar_admin()).post(url_decisao("aprovar", pedido.pk))

    admin = User.objects.get(pk=admin.pk)
    assert admin.nivel_de_acesso.nome == "Admin"


def test_rejeitar_exige_motivo():
    pedido = pedido_de(criar_aluno())

    resposta = cliente(criar_admin()).post(
        url_decisao("rejeitar", pedido.pk), {"motivo": ""}, format="json"
    )

    assert resposta.status_code == 400
    pedido.refresh_from_db()
    assert pedido.status == PENDENTE


def test_rejeitar_grava_motivo_audita_e_libera_novo_pedido():
    aluno = criar_aluno()
    pedido = pedido_de(aluno)

    resposta = cliente(criar_admin()).post(
        url_decisao("rejeitar", pedido.pk), {"motivo": "Carta genérica."}, format="json"
    )

    assert resposta.status_code == 200
    assert resposta.data["motivo_rejeicao"] == "Carta genérica."
    assert not User.objects.get(pk=aluno.pk).has_perm("trilhas.create")
    assert RegistroDeAuditoria.objects.filter(
        acao=AcaoAuditoria.AUTORIA_REJEITADA
    ).exists()
    assert pedir(aluno).status_code == 201


@pytest.mark.parametrize("acao", ["aprovar", "rejeitar"])
def test_solicitacao_ja_decidida_recebe_400(acao):
    pedido = pedido_de(criar_aluno())
    pedido.status = SolicitacaoAutoria.Status.APROVADA
    pedido.save()

    resposta = cliente(criar_admin()).post(
        url_decisao(acao, pedido.pk), {"motivo": "x"}, format="json"
    )

    assert resposta.status_code == 400
    assert codigo_do_erro(resposta) == "solicitacao_decidida"


def test_solicitacao_inexistente_recebe_404():
    resposta = cliente(criar_admin()).post(url_decisao("aprovar", 999))

    assert resposta.status_code == 404
