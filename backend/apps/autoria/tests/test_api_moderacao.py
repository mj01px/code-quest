"""Agrupamento das filas, cascata da revisão, RBAC granular e moderação.

- As filas mostram a trilha no lugar dos filhos no mesmo status; filho de pai
  em outro status (aula nova numa trilha publicada) aparece solto.
- Aprovar, devolver e publicar a trilha levam junto os filhos no mesmo estado.
- Criar trilha, aula e exercício exigem, cada um, a sua permissão granular.
- Publicado só sai com `trilhas.delete_published` e motivo na auditoria.
"""

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.auditoria.models import AcaoAuditoria, RegistroDeAuditoria
from apps.contas.models import NivelDeAcesso, Permissao
from apps.contas.tests.helpers import criar_admin, criar_aluno, criar_autor
from apps.trilhas.models import Aula, StatusEditorial, Trilha
from apps.trilhas.tests.helpers import criar_aula, criar_exercicio, criar_trilha

pytestmark = pytest.mark.django_db

RASCUNHO = StatusEditorial.RASCUNHO
REVISAO = StatusEditorial.REVISAO
APROVADO = StatusEditorial.APROVADO
PUBLICADO = StatusEditorial.PUBLICADO


def cliente(usuario):
    c = APIClient()
    c.force_authenticate(user=usuario)
    return c


def acao(acao, tipo, pk):
    return reverse(f"autoria:{acao}", kwargs={"tipo": tipo, "pk": pk})


def rascunho(tipo, pk):
    return reverse("autoria:rascunho", kwargs={"tipo": tipo, "pk": pk})


# --- Agrupamento ---


def test_fila_mostra_a_trilha_e_esconde_os_filhos_no_mesmo_status():
    autor = criar_autor()
    trilha = criar_trilha("logica", nome="Lógica", status=REVISAO, autor=autor)
    aula = criar_aula(trilha, "vars", status=REVISAO, autor=autor)
    criar_exercicio(aula, "soma", status=REVISAO, autor=autor)

    itens = cliente(criar_admin()).get(reverse("autoria:fila-revisao")).data

    assert [(i["tipo"], i["id"], i["criado_por"]) for i in itens] == [
        ("trilhas", trilha.pk, autor.nickname)
    ]


def test_filho_de_trilha_publicada_aparece_solto():
    trilha = criar_trilha("logica", status=PUBLICADO)
    aula = criar_aula(trilha, "nova", status=REVISAO)
    criar_exercicio(aula, "dentro", status=REVISAO)

    itens = cliente(criar_admin()).get(reverse("autoria:fila-revisao")).data

    # O exercício vem dentro da aula, que é o pai solto.
    assert [(i["tipo"], i["id"], i["criado_por"]) for i in itens] == [
        ("aulas", aula.pk, None)
    ]


def test_aprovados_agrupa_pela_trilha():
    autor = criar_autor()
    trilha = criar_trilha("logica", status=APROVADO, autor=autor)
    criar_aula(trilha, "vars", status=APROVADO, autor=autor)

    itens = cliente(autor).get(reverse("autoria:aprovados")).data

    assert [(i["tipo"], i["id"]) for i in itens] == [("trilhas", trilha.pk)]


# --- Cascata ---


@pytest.mark.parametrize(
    ("rota", "origem", "destino", "corpo"),
    [
        ("aprovar", REVISAO, APROVADO, None),
        ("devolver", REVISAO, RASCUNHO, {"parecer": "Falta exemplo."}),
        ("publicar", APROVADO, PUBLICADO, None),
    ],
)
def test_acao_na_trilha_leva_os_filhos_no_mesmo_estado(rota, origem, destino, corpo):
    trilha = criar_trilha("logica", status=origem)
    aula = criar_aula(trilha, "vars", status=origem)
    exercicio = criar_exercicio(aula, "soma", status=origem)

    resposta = cliente(criar_admin()).post(
        acao(rota, "trilhas", trilha.pk), corpo, format="json"
    )

    assert resposta.status_code == 200
    for conteudo in (trilha, aula, exercicio):
        conteudo.refresh_from_db()
        assert conteudo.status == destino


# --- RBAC granular de criação ---


def nivel_com(*codenames):
    nivel = NivelDeAcesso.objects.create(nome="Só " + ",".join(codenames))
    nivel.permissoes.set(Permissao.objects.filter(codename__in=codenames))
    return nivel


def test_autor_padrao_tem_as_tres_granulares():
    autor = criar_autor()

    assert all(
        autor.has_perm(f"trilhas.create_{g}") for g in ("trilha", "aula", "exercicio")
    )


@pytest.mark.parametrize(
    ("granular", "pode", "nao_pode"),
    [
        ("trilhas.create_trilha", "criar-trilha", "criar-aula"),
        ("trilhas.create_aula", "criar-aula", "criar-exercicio"),
        ("trilhas.create_exercicio", "criar-exercicio", "criar-trilha"),
    ],
)
def test_criacao_exige_a_granular_do_tipo(granular, pode, nao_pode):
    usuario = criar_aluno(nivel_de_acesso=nivel_com("trilhas.create", granular))
    trilha = criar_trilha("minha", status=RASCUNHO, autor=usuario)
    aula = criar_aula(trilha, "vars", status=RASCUNHO, autor=usuario)
    corpo = {
        "criar-trilha": {"nome": "Nova", "descricao": "d"},
        "criar-aula": {"trilha": trilha.pk, "titulo": "Aula", "conteudo": "c"},
        "criar-exercicio": {"aula": aula.pk, "titulo": "Ex", "enunciado": "e"},
    }
    c = cliente(usuario)

    assert (
        c.post(reverse(f"autoria:{pode}"), corpo[pode], format="json").status_code
        == 201
    )
    negado = c.post(reverse(f"autoria:{nao_pode}"), corpo[nao_pode], format="json")
    assert negado.status_code == 403


def test_questao_exige_a_granular_de_exercicio():
    usuario = criar_aluno(
        nivel_de_acesso=nivel_com("trilhas.create", "trilhas.create_aula")
    )
    aula = criar_aula(
        criar_trilha("minha", status=RASCUNHO, autor=usuario),
        "vars",
        status=RASCUNHO,
        autor=usuario,
    )

    resposta = cliente(usuario).post(
        reverse("autoria:criar-questao"),
        {
            "aula": aula.pk,
            "enunciado": "?",
            "opcoes": ["a", "b"],
            "resposta_correta": "A",
        },
        format="json",
    )

    assert resposta.status_code == 403


# --- Exclusão de publicado ---


def test_admin_exclui_trilha_publicada_com_motivo():
    trilha = criar_trilha("logica", nome="Lógica", status=PUBLICADO)
    criar_aula(trilha, "vars", status=PUBLICADO)
    admin = criar_admin()

    resposta = cliente(admin).delete(
        rascunho("trilhas", trilha.pk), {"motivo": "Conteúdo duplicado."}, format="json"
    )

    assert resposta.status_code == 204
    assert not Trilha.objects.filter(pk=trilha.pk).exists()
    assert not Aula.objects.filter(trilha_id=trilha.pk).exists()
    registro = RegistroDeAuditoria.objects.get(
        acao=AcaoAuditoria.CONTEUDO_PUBLICADO_EXCLUIDO
    )
    assert registro.actor == admin
    assert registro.alvo_id == str(trilha.pk)
    assert registro.metadata["motivo"] == "Conteúdo duplicado."
    assert registro.metadata["titulo"] == "Lógica"


@pytest.mark.parametrize("corpo", [None, {}, {"motivo": ""}, {"motivo": "   "}])
def test_excluir_publicado_sem_motivo_recebe_400(corpo):
    trilha = criar_trilha("logica", status=PUBLICADO)

    resposta = cliente(criar_admin()).delete(
        rascunho("trilhas", trilha.pk), corpo, format="json"
    )

    assert resposta.status_code == 400
    assert resposta.json()["error"]["details"][0]["code"] == "sem_motivo"
    assert Trilha.objects.filter(pk=trilha.pk).exists()
    assert not RegistroDeAuditoria.objects.exists()


def test_autor_nao_exclui_o_proprio_publicado_mesmo_com_motivo():
    autor = criar_autor()
    trilha = criar_trilha("logica", status=PUBLICADO, autor=autor)

    resposta = cliente(autor).delete(
        rascunho("trilhas", trilha.pk), {"motivo": "Quero tirar."}, format="json"
    )

    # Sem `trilhas.delete_published`, vale a regra do rascunho: só até aprovado.
    assert resposta.status_code == 400
    assert Trilha.objects.filter(pk=trilha.pk).exists()


def test_motivo_longo_demais_recebe_400():
    trilha = criar_trilha("logica", status=PUBLICADO)

    resposta = cliente(criar_admin()).delete(
        rascunho("trilhas", trilha.pk), {"motivo": "x" * 1001}, format="json"
    )

    assert resposta.status_code == 400
    assert Trilha.objects.filter(pk=trilha.pk).exists()
