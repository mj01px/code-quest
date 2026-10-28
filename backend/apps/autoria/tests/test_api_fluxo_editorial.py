"""Contrato das rotas do fluxo editorial RASCUNHO, REVISAO, APROVADO, PUBLICADO.

Cada ação exige a sua permissão RBAC; o estado de origem errado devolve 400 no
envelope padrão e não grava nada. Toda transição bem sucedida deixa exatamente
um registro na trilha de auditoria; recusa (401, 403, 400) não deixa nenhum.
"""

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from rest_framework.test import APIClient

from apps.auditoria.models import AcaoAuditoria, RegistroDeAuditoria
from apps.contas.tests.helpers import criar_admin, criar_aluno, criar_autor
from apps.trilhas.models import StatusEditorial
from apps.trilhas.tests.helpers import criar_aula, criar_exercicio, criar_trilha

pytestmark = pytest.mark.django_db

RASCUNHO = StatusEditorial.RASCUNHO
REVISAO = StatusEditorial.REVISAO
APROVADO = StatusEditorial.APROVADO
PUBLICADO = StatusEditorial.PUBLICADO

# (rota, estado de origem, estado resultante)
TRANSICOES = [
    ("submeter", RASCUNHO, REVISAO),
    ("aprovar", REVISAO, APROVADO),
    ("devolver", REVISAO, RASCUNHO),
    ("publicar", APROVADO, PUBLICADO),
]

ACAO_AUDITORIA = {
    "submeter": AcaoAuditoria.CONTEUDO_SUBMETIDO,
    "aprovar": AcaoAuditoria.CONTEUDO_APROVADO,
    "devolver": AcaoAuditoria.CONTEUDO_DEVOLVIDO,
    "publicar": AcaoAuditoria.CONTEUDO_PUBLICADO,
}

TIPOS = ["trilhas", "aulas", "exercicios"]


def criar_conteudo(tipo, status, autor=None):
    """Conteúdo do `tipo` pedido no `status` pedido; os pais saem publicados.

    `autor` vai só para o conteúdo devolvido: quem envia para revisão precisa
    ser o dono dele.
    """
    dono = {"autor": autor}
    trilha = criar_trilha(
        "logica",
        status=status if tipo == "trilhas" else PUBLICADO,
        **(dono if tipo == "trilhas" else {}),
    )
    if tipo == "trilhas":
        return trilha
    aula = criar_aula(
        trilha,
        "variaveis",
        status=status if tipo == "aulas" else PUBLICADO,
        **(dono if tipo == "aulas" else {}),
    )
    if tipo == "aulas":
        return aula
    return criar_exercicio(aula, "media", status=status, **dono)


def url(acao, tipo, pk):
    return reverse(f"autoria:{acao}", kwargs={"tipo": tipo, "pk": pk})


def cliente(usuario=None):
    c = APIClient()
    if usuario is not None:
        c.force_authenticate(user=usuario)
    return c


def quem_pode(acao):
    # AUTOR só submete; revisar e publicar são do ADMIN no RBAC.
    return criar_autor() if acao == "submeter" else criar_admin()


@pytest.mark.parametrize("tipo", TIPOS)
@pytest.mark.parametrize(("acao", "origem", "destino"), TRANSICOES)
def test_transicao_valida_com_permissao(acao, origem, destino, tipo):
    usuario = quem_pode(acao)
    conteudo = criar_conteudo(tipo, origem, autor=usuario)

    resposta = cliente(usuario).post(url(acao, tipo, conteudo.pk))

    assert resposta.status_code == 200
    assert resposta.data == {"id": conteudo.pk, "status_editorial": destino}
    conteudo.refresh_from_db()
    assert conteudo.status == destino

    registro = RegistroDeAuditoria.objects.get()
    assert registro.acao == ACAO_AUDITORIA[acao]
    assert registro.actor == usuario
    assert registro.actor_email_snapshot == usuario.email
    assert registro.alvo_tipo == tipo.removesuffix("s")
    assert registro.alvo_id == str(conteudo.pk)
    # Só os dois estados: nada de solução, segredo de 2FA ou token do Judge0.
    assert registro.metadata == {"de": origem, "para": destino}


@pytest.mark.parametrize(("acao", "origem", "_destino"), TRANSICOES)
def test_anonimo_recebe_401(acao, origem, _destino):
    conteudo = criar_conteudo("exercicios", origem)

    resposta = cliente().post(url(acao, "exercicios", conteudo.pk))

    assert resposta.status_code == 401
    conteudo.refresh_from_db()
    assert conteudo.status == origem
    assert not RegistroDeAuditoria.objects.exists()


@pytest.mark.parametrize(
    ("acao", "origem", "sem_permissao"),
    [
        ("submeter", RASCUNHO, criar_aluno),
        ("aprovar", REVISAO, criar_autor),
        ("devolver", REVISAO, criar_autor),
        ("publicar", APROVADO, criar_autor),
    ],
)
def test_autenticado_sem_permissao_recebe_403(acao, origem, sem_permissao):
    conteudo = criar_conteudo("exercicios", origem)

    resposta = cliente(sem_permissao()).post(url(acao, "exercicios", conteudo.pk))

    assert resposta.status_code == 403
    conteudo.refresh_from_db()
    assert conteudo.status == origem
    assert not RegistroDeAuditoria.objects.exists()


@pytest.mark.parametrize(
    ("acao", "estado_atual"),
    [
        ("publicar", RASCUNHO),  # pular a revisão
        ("publicar", REVISAO),  # pular a aprovação
        ("aprovar", RASCUNHO),
        ("devolver", APROVADO),
        ("submeter", PUBLICADO),
    ],
)
def test_transicao_invalida_recebe_400_no_envelope(acao, estado_atual):
    conteudo = criar_conteudo("exercicios", estado_atual)

    resposta = cliente(criar_admin()).post(url(acao, "exercicios", conteudo.pk))

    assert resposta.status_code == 400
    erro = resposta.json()["error"]
    assert set(erro) == {"code", "message", "details"}
    assert erro["details"][0]["code"] == "transicao_invalida"
    conteudo.refresh_from_db()
    assert conteudo.status == estado_atual
    assert not RegistroDeAuditoria.objects.exists()


def test_sem_permissao_recebe_403_mesmo_com_pk_inexistente():
    # Permissão antes do lookup: 404 aqui revelaria quais pk existem.
    resposta = cliente(criar_autor()).post(url("publicar", "exercicios", 999999))

    assert resposta.status_code == 403


def test_transicao_trava_a_linha():
    # Sem o lock, "aprovar" e "devolver" simultâneos venceriam por ordem de
    # gravação. A suíte não reproduz a corrida; garante que o lock existe.
    autor = criar_autor()
    conteudo = criar_conteudo("exercicios", RASCUNHO, autor=autor)

    with CaptureQueriesContext(connection) as consultas:
        cliente(autor).post(url("submeter", "exercicios", conteudo.pk))

    assert any("FOR UPDATE" in q["sql"] for q in consultas.captured_queries)


def test_conteudo_inexistente_recebe_404():
    resposta = cliente(criar_admin()).post(url("publicar", "exercicios", 999999))

    assert resposta.status_code == 404
    assert set(resposta.json()["error"]) == {"code", "message", "details"}


def test_tipo_fora_da_lista_nao_casa_a_rota():
    resposta = cliente(criar_admin()).post("/api/v1/autoria/usuarios/1/publicar/")

    assert resposta.status_code == 404


def test_get_nao_e_aceito():
    conteudo = criar_conteudo("exercicios", RASCUNHO)

    resposta = cliente(criar_autor()).get(url("submeter", "exercicios", conteudo.pk))

    assert resposta.status_code == 405


def test_resposta_nao_carrega_solucao_autor():
    autor = criar_autor()
    conteudo = criar_conteudo("exercicios", RASCUNHO, autor=autor)

    resposta = cliente(autor).post(url("submeter", "exercicios", conteudo.pk))

    assert "solucao_autor" not in resposta.data
    assert b"SEGREDO" not in resposta.content


def test_fluxo_completo_do_rascunho_ao_publicado():
    autor, admin = criar_autor(), criar_admin()
    conteudo = criar_conteudo("exercicios", RASCUNHO, autor=autor)

    for acao, usuario in [
        ("submeter", autor),
        ("devolver", admin),
        ("submeter", autor),
        ("aprovar", admin),
        ("publicar", admin),
    ]:
        assert cliente(usuario).post(url(acao, "exercicios", conteudo.pk)).status_code == 200

    conteudo.refresh_from_db()
    assert conteudo.status == PUBLICADO
    assert RegistroDeAuditoria.objects.count() == 5


def _publicar_e_ler_erro(pai):
    tipo = "trilhas" if hasattr(pai, "aulas") else "aulas"
    resposta = cliente(criar_admin()).post(url("publicar", tipo, pai.pk))
    assert resposta.status_code == 400
    pai.refresh_from_db()
    assert pai.status == APROVADO
    assert not RegistroDeAuditoria.objects.filter(
        acao=AcaoAuditoria.CONTEUDO_PUBLICADO
    ).exists()
    return resposta.json()["error"]["details"][0]["code"]


@pytest.mark.parametrize("status_filho", [RASCUNHO, REVISAO])
def test_publicar_trilha_com_aula_incompleta_recebe_400(status_filho):
    trilha = criar_trilha("logica", status=APROVADO)
    criar_aula(trilha, "pronta", status=APROVADO)
    criar_aula(trilha, "pendente", status=status_filho)

    assert _publicar_e_ler_erro(trilha) == "conteudo_incompleto"


@pytest.mark.parametrize("status_filho", [RASCUNHO, REVISAO])
def test_publicar_aula_com_exercicio_incompleto_recebe_400(status_filho):
    aula = criar_aula(criar_trilha("logica", status=PUBLICADO), "vars", status=APROVADO)
    criar_exercicio(aula, "pronto", status=PUBLICADO)
    criar_exercicio(aula, "pendente", status=status_filho)

    assert _publicar_e_ler_erro(aula) == "conteudo_incompleto"


def test_publicar_pai_com_filhos_aprovados_ou_publicados_passa():
    trilha = criar_trilha("logica", status=APROVADO)
    aula = criar_aula(trilha, "vars", status=APROVADO)
    criar_exercicio(aula, "a", status=APROVADO)
    criar_exercicio(aula, "b", status=PUBLICADO)
    admin = cliente(criar_admin())

    assert admin.post(url("publicar", "aulas", aula.pk)).status_code == 200
    assert admin.post(url("publicar", "trilhas", trilha.pk)).status_code == 200
