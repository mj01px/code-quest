"""Testes de integração da Aula 11: Trilhas (leitura pública) e Autoria (escrita).

Cada teste atravessa a pilha inteira (request HTTP, autenticação JWT, permissão,
view, serializer, service e banco). Nada é mockado. Os dados são isolados com
`uuid4`, então nenhum teste depende de ordem nem do estado deixado por outro.
"""

import uuid

import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.contas.tests.helpers import criar_aluno, criar_autor
from apps.trilhas.models import Aula, Flashcard, StatusEditorial, Trilha
from apps.trilhas.tests.helpers import criar_trilha

pytestmark = pytest.mark.django_db


def _uid() -> str:
    return uuid.uuid4().hex[:8]


def _cliente(usuario=None) -> APIClient:
    """Cliente HTTP real; com `usuario`, autentica por Bearer JWT de verdade."""
    c = APIClient()
    if usuario is not None:
        token = RefreshToken.for_user(usuario).access_token
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return c


def _dados_trilha() -> dict:
    return {
        "nome": f"Trilha {_uid()}",
        "descricao": "Descrição da trilha de integração.",
        "dificuldade": "INTERMEDIARIO",
    }


def _detalhe(tipo: str, pk: int) -> str:
    return reverse("autoria:detalhe", kwargs={"tipo": tipo, "pk": pk})


def _rascunho(tipo: str, pk: int) -> str:
    return reverse("autoria:rascunho", kwargs={"tipo": tipo, "pk": pk})


def _trilha_via_api(cliente: APIClient) -> dict:
    resposta = cliente.post(
        reverse("autoria:criar-trilha"), _dados_trilha(), format="json"
    )
    assert resposta.status_code == 201
    return resposta.json()


def _aula_via_api(cliente: APIClient, trilha_id: int) -> dict:
    resposta = cliente.post(
        reverse("autoria:criar-aula"),
        {"trilha": trilha_id, "titulo": f"Aula {_uid()}", "conteudo": "# Olá"},
        format="json",
    )
    assert resposta.status_code == 201
    return resposta.json()


# --- 1. Caminho feliz (criação) ---


def test_criar_trilha_com_dados_validos_deve_retornar_201():
    dados = _dados_trilha()

    resposta = _cliente(criar_autor(f"autor_{_uid()}")).post(
        reverse("autoria:criar-trilha"), dados, format="json"
    )

    assert resposta.status_code == 201
    corpo = resposta.json()
    assert isinstance(corpo["id"], int)
    assert corpo["nome"] == dados["nome"]
    assert corpo["slug"] == dados["nome"].lower().replace(" ", "-")
    assert corpo["dificuldade"] == dados["dificuldade"]
    # O endpoint não devolve `Location` (o serializer não expõe campo `url`).
    # O recurso criado é alcançável pela rota de detalhe, coberta no teste 6.


# --- 2. Caminho feliz (leitura) ---


def test_listar_trilhas_deve_retornar_200():
    publicada = criar_trilha(f"pub-{_uid()}")
    rascunho = criar_trilha(f"rasc-{_uid()}", status=StatusEditorial.RASCUNHO)

    resposta = _cliente().get(reverse("trilhas:trilha-lista"))

    assert resposta.status_code == 200
    itens = {t["slug"]: t for t in resposta.json()}
    assert publicada.slug in itens
    assert {"id", "nome", "slug", "descricao", "total_aulas"} <= itens[publicada.slug].keys()
    assert rascunho.slug not in itens


# --- 3. Erro 400 (validação) ---


def test_criar_trilha_sem_nome_deve_retornar_400():
    antes = Trilha.objects.count()
    dados = _dados_trilha()
    del dados["nome"]

    resposta = _cliente(criar_autor(f"autor_{_uid()}")).post(
        reverse("autoria:criar-trilha"), dados, format="json"
    )

    assert resposta.status_code == 400
    erro = resposta.json()["error"]
    assert erro["code"] == "validacao"
    assert [d["field"] for d in erro["details"]] == ["nome"]
    assert Trilha.objects.count() == antes


# --- 4. Erro 404 (não encontrado) ---


def test_buscar_trilha_inexistente_deve_retornar_404():
    autor = criar_autor(f"autor_{_uid()}")

    editorial = _cliente(autor).get(_detalhe("trilhas", 999999))
    publica = _cliente().get(
        reverse("trilhas:trilha-detalhe", kwargs={"slug": f"nao-existe-{_uid()}"})
    )

    assert editorial.status_code == 404
    assert editorial.json()["error"]["code"] == "not_found"
    assert publica.status_code == 404
    assert publica.json()["error"]["code"] == "not_found"


# --- 5. Erro 403 (sem a permissão correta) ---


def test_criar_trilha_sem_permissao_de_autor_deve_retornar_403():
    antes = Trilha.objects.count()

    resposta = _cliente(criar_aluno(f"aluno_{_uid()}")).post(
        reverse("autoria:criar-trilha"), _dados_trilha(), format="json"
    )

    assert resposta.status_code == 403
    assert resposta.json()["error"]["code"] == "permission_denied"
    assert Trilha.objects.count() == antes


# --- 6. Efeito persistido (POST) ---


def test_criar_trilha_deve_persistir_no_banco():
    autor = criar_autor(f"autor_{_uid()}")
    cliente = _cliente(autor)

    criada = _trilha_via_api(cliente)

    trilha = Trilha.objects.get(pk=criada["id"])
    assert trilha.nome == criada["nome"]
    assert trilha.autor == autor
    assert trilha.status == StatusEditorial.RASCUNHO
    lida = cliente.get(_detalhe("trilhas", criada["id"]))
    assert lida.status_code == 200
    assert lida.json()["nome"] == criada["nome"]


# --- 7. Efeito persistido (DELETE) ---


def test_deletar_trilha_deve_remover_do_banco():
    cliente = _cliente(criar_autor(f"autor_{_uid()}"))
    pk = _trilha_via_api(cliente)["id"]

    resposta = cliente.delete(_rascunho("trilhas", pk))

    assert resposta.status_code == 204
    assert not Trilha.objects.filter(pk=pk).exists()
    assert cliente.get(_detalhe("trilhas", pk)).status_code == 404


# --- 8. Relacionamento (Trilha com Aula) ---


def test_criar_aula_e_verificar_na_trilha():
    cliente = _cliente(criar_autor(f"autor_{_uid()}"))
    trilha = _trilha_via_api(cliente)

    aula = _aula_via_api(cliente, trilha["id"])

    assert Aula.objects.get(pk=aula["id"]).trilha_id == trilha["id"]
    resposta = cliente.get(_detalhe("trilhas", trilha["id"]))
    assert resposta.status_code == 200
    aulas = resposta.json()["aulas"]
    assert [a["id"] for a in aulas] == [aula["id"]]
    assert aulas[0]["titulo"] == aula["titulo"]


# --- 9. Segurança 401 (sem token) ---


def test_acessar_rascunhos_sem_token_deve_retornar_401():
    resposta = _cliente().get(reverse("autoria:rascunhos"))

    assert resposta.status_code == 401
    assert resposta.json()["error"]["code"] == "not_authenticated"


# --- 10. Segurança 403 (usuário comum) ---


def test_acessar_rascunhos_sem_permissao_deve_retornar_403():
    resposta = _cliente(criar_aluno(f"aluno_{_uid()}")).get(
        reverse("autoria:rascunhos")
    )

    assert resposta.status_code == 403
    assert resposta.json()["error"]["code"] == "permission_denied"


# --- 11. Segurança 2xx (usuário autorizado) ---


def test_acessar_rascunhos_com_permissao_deve_retornar_200():
    cliente = _cliente(criar_autor(f"autor_{_uid()}"))
    trilha = _trilha_via_api(cliente)

    resposta = cliente.get(reverse("autoria:rascunhos"))

    assert resposta.status_code == 200
    assert {
        "id": trilha["id"],
        "tipo": "trilhas",
        "titulo": trilha["nome"],
        "status_editorial": StatusEditorial.RASCUNHO,
    } in resposta.json()


# --- 12. Cenário extra: flashcard vinculado a uma aula em rascunho ---


def test_criar_flashcard_deve_retornar_201():
    cliente = _cliente(criar_autor(f"autor_{_uid()}"))
    aula = _aula_via_api(cliente, _trilha_via_api(cliente)["id"])
    dados = {"aula": aula["id"], "pergunta": f"O que é {_uid()}?", "resposta": "Nada."}

    resposta = cliente.post(reverse("autoria:criar-flashcard"), dados, format="json")

    assert resposta.status_code == 201
    corpo = resposta.json()
    assert corpo["pergunta"] == dados["pergunta"]
    assert Flashcard.objects.get(pk=corpo["id"]).aula_id == aula["id"]
    lida = cliente.get(_detalhe("aulas", aula["id"])).json()
    assert [f["id"] for f in lida["flashcards"]] == [corpo["id"]]
