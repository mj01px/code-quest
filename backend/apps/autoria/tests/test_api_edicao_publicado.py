"""Edição do que já foi aprovado ou publicado, o diff e "meus conteúdos".

- Editar o aprovado ou o publicado guarda a versão anterior e devolve o
  conteúdo para revisão: o texto novo nunca vai ao ar sem o revisor.
- O diff compara a versão anterior com o texto atual, campo a campo.
- "Meus conteúdos" lista só o que o próprio usuário criou.
"""

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.auditoria.models import AcaoAuditoria, RegistroDeAuditoria
from apps.contas.tests.helpers import criar_admin, criar_aluno, criar_autor
from apps.correcao.models import CasoDeTeste, EspecificacaoDeCodigo
from apps.trilhas.models import Aula, Exercicio, StatusEditorial, Trilha
from apps.trilhas.tests.helpers import criar_aula, criar_exercicio, criar_trilha

pytestmark = pytest.mark.django_db

RASCUNHO = StatusEditorial.RASCUNHO
REVISAO = StatusEditorial.REVISAO
APROVADO = StatusEditorial.APROVADO
PUBLICADO = StatusEditorial.PUBLICADO
PRONTOS = [APROVADO, PUBLICADO]
MODELOS = {"trilhas": Trilha, "aulas": Aula, "exercicios": Exercicio}
EDICAO = {
    "trilhas": {"nome": "Novo nome", "descricao": "Nova descrição"},
    "aulas": {"titulo": "Novo título", "conteudo": "# Novo"},
    "exercicios": {"titulo": "Novo título", "enunciado": "Novo enunciado"},
}


def cliente(usuario):
    c = APIClient()
    c.force_authenticate(user=usuario)
    return c


def url(nome, tipo, pk):
    return reverse(f"autoria:{nome}", kwargs={"tipo": tipo, "pk": pk})


def criar_conteudo(tipo, autor, status=PUBLICADO):
    trilha = criar_trilha("logica", status=status, autor=autor)
    if tipo == "trilhas":
        return trilha
    aula = criar_aula(trilha, "vars", status=status, autor=autor)
    if tipo == "aulas":
        return aula
    return criar_exercicio(aula, "media", status=status, autor=autor)


def editar(usuario, tipo, conteudo, corpo=None):
    return cliente(usuario).put(
        url("rascunho", tipo, conteudo.pk), corpo or EDICAO[tipo], format="json"
    )


@pytest.fixture
def dono():
    return criar_autor("dono")


# --- A trava de revisão ---


@pytest.mark.parametrize("status", PRONTOS)
@pytest.mark.parametrize("tipo", MODELOS)
def test_editar_o_aprovado_ou_publicado_devolve_para_revisao(tipo, status, dono):
    conteudo = criar_conteudo(tipo, dono, status=status)
    campo, antes = next(
        (c, getattr(conteudo, c)) for c in EDICAO[tipo] if c != "dificuldade"
    )

    resposta = editar(dono, tipo, conteudo)

    assert resposta.status_code == 200
    conteudo.refresh_from_db()
    assert conteudo.status == REVISAO
    assert getattr(conteudo, campo) == EDICAO[tipo][campo]
    assert conteudo.conteudo_anterior["status"] == status
    assert conteudo.conteudo_anterior["campos"][campo] == antes
    registro = RegistroDeAuditoria.objects.get(acao=AcaoAuditoria.CONTEUDO_SUBMETIDO)
    assert registro.alvo_id == str(conteudo.pk)
    assert registro.metadata["de"] == status
    assert registro.metadata["para"] == REVISAO


def test_o_publicado_editado_sai_do_catalogo_ate_a_nova_revisao(dono):
    trilha = criar_conteudo("trilhas", dono)

    editar(dono, "trilhas", trilha)

    assert not Trilha.objects.publicados().filter(pk=trilha.pk).exists()


def test_salvar_sem_mudar_nada_nao_tira_o_publicado_do_ar(dono):
    conteudo = criar_conteudo("aulas", dono)
    igual = {"titulo": conteudo.titulo, "conteudo": conteudo.conteudo}

    assert editar(dono, "aulas", conteudo, igual).status_code == 200

    conteudo.refresh_from_db()
    assert conteudo.status == PUBLICADO
    assert conteudo.conteudo_anterior is None


@pytest.mark.parametrize("filho", ["aulas", "exercicios"])
def test_filho_nao_se_edita_com_o_pai_em_revisao(filho, dono):
    # Na fila a trilha aparece no lugar do filho: aprová-la levaria junto um
    # texto que o revisor não leu.
    conteudo = criar_conteudo(filho, dono)
    Trilha.objects.filter(pk=conteudo.trilha_id).update(status=REVISAO)

    resposta = editar(dono, filho, conteudo)

    assert resposta.status_code == 400
    assert resposta.data["error"]["details"][0]["code"] == "pai_em_revisao"
    conteudo.refresh_from_db()
    assert conteudo.status == PUBLICADO
    assert conteudo.titulo != "Novo título"


def test_edicao_de_rascunho_nao_guarda_versao_anterior(dono):
    conteudo = criar_conteudo("aulas", dono, status=RASCUNHO)

    assert editar(dono, "aulas", conteudo).status_code == 200

    conteudo.refresh_from_db()
    assert conteudo.status == RASCUNHO
    assert conteudo.conteudo_anterior is None


def test_em_revisao_continua_sem_edicao(dono):
    conteudo = criar_conteudo("aulas", dono, status=REVISAO)

    assert editar(dono, "aulas", conteudo).status_code == 400

    conteudo.refresh_from_db()
    assert conteudo.titulo != "Novo título"


def test_edicao_invalida_nao_rebaixa_o_publicado(dono):
    conteudo = criar_conteudo("aulas", dono)

    resposta = editar(dono, "aulas", conteudo, {"titulo": "", "conteudo": "x"})

    assert resposta.status_code == 400
    conteudo.refresh_from_db()
    assert conteudo.status == PUBLICADO
    assert conteudo.conteudo_anterior is None
    assert not RegistroDeAuditoria.objects.exists()


@pytest.mark.parametrize("tipo", MODELOS)
def test_autor_nao_edita_o_publicado_de_outro(tipo, dono):
    conteudo = criar_conteudo(tipo, dono)

    assert editar(criar_autor("intruso"), tipo, conteudo).status_code == 403

    conteudo.refresh_from_db()
    assert conteudo.status == PUBLICADO
    assert conteudo.conteudo_anterior is None


def test_detalhe_da_trilha_traz_o_status_de_cada_aula_e_exercicio(dono):
    # O editor decide o lápis por item: a aula editada fica em revisão dentro
    # de uma trilha que continua publicada.
    trilha = criar_trilha("logica", autor=dono)
    aula = criar_aula(trilha, "vars", autor=dono)
    criar_exercicio(aula, "media", autor=dono)
    editar(dono, "aulas", aula)

    dados = cliente(dono).get(url("detalhe", "trilhas", trilha.pk)).json()

    assert dados["status_editorial"] == PUBLICADO
    assert dados["aulas"][0]["status_editorial"] == REVISAO
    assert dados["aulas"][0]["exercicios"][0]["status_editorial"] == PUBLICADO
    solta = cliente(dono).get(url("detalhe", "aulas", aula.pk)).json()
    assert solta["status_editorial"] == REVISAO
    assert solta["exercicios"][0]["status_editorial"] == PUBLICADO


def test_catalogo_publico_nao_ganha_o_status_editorial():
    trilha = criar_trilha("logica")
    criar_aula(trilha, "vars")

    dados = APIClient().get(reverse("trilhas:trilha-detalhe", args=[trilha.slug])).json()

    assert "status_editorial" not in dados
    assert "status_editorial" not in dados["aulas"][0]


# --- O ciclo da versão anterior ---


def transicao(usuario, acao, tipo, conteudo, **corpo):
    return cliente(usuario).post(url(acao, tipo, conteudo.pk), corpo, format="json")


def test_versao_anterior_do_aprovado_some_na_nova_aprovacao(dono):
    conteudo = criar_conteudo("aulas", dono, status=APROVADO)
    editar(dono, "aulas", conteudo)

    assert transicao(criar_admin(), "aprovar", "aulas", conteudo).status_code == 200

    conteudo.refresh_from_db()
    assert conteudo.status == APROVADO
    assert conteudo.conteudo_anterior is None


def test_versao_anterior_do_publicado_so_some_ao_voltar_ao_ar(dono):
    conteudo = criar_conteudo("aulas", dono)
    admin = criar_admin()
    editar(dono, "aulas", conteudo)

    transicao(admin, "aprovar", "aulas", conteudo)
    conteudo.refresh_from_db()
    assert conteudo.status == APROVADO
    assert conteudo.conteudo_anterior["status"] == PUBLICADO

    transicao(admin, "publicar", "aulas", conteudo)
    conteudo.refresh_from_db()
    assert conteudo.status == PUBLICADO
    assert conteudo.conteudo_anterior is None


def test_segunda_edicao_antes_de_voltar_ao_ar_mantem_a_versao_publicada(dono):
    conteudo = criar_conteudo("aulas", dono)
    original = conteudo.conteudo
    editar(dono, "aulas", conteudo)
    transicao(criar_admin(), "aprovar", "aulas", conteudo)

    editar(dono, "aulas", conteudo, {"titulo": "Outro", "conteudo": "# Terceira"})

    conteudo.refresh_from_db()
    assert conteudo.status == REVISAO
    assert conteudo.conteudo_anterior["status"] == PUBLICADO
    assert conteudo.conteudo_anterior["campos"]["conteudo"] == original


# --- Exclusão do que já foi ao ar ---


@pytest.mark.parametrize("tipo", MODELOS)
def test_dono_nao_exclui_o_publicado_que_voltou_como_rascunho(tipo, dono):
    conteudo = criar_conteudo(tipo, dono)
    editar(dono, tipo, conteudo)
    transicao(criar_admin(), "devolver", tipo, conteudo, parecer="Rever.")

    resposta = cliente(dono).delete(url("rascunho", tipo, conteudo.pk))

    assert resposta.status_code == 400
    assert resposta.data["error"]["details"][0]["code"] == "ja_publicado"
    assert MODELOS[tipo].objects.filter(pk=conteudo.pk).exists()


def test_admin_exclui_o_publicado_que_voltou_como_rascunho(dono):
    conteudo = criar_conteudo("aulas", dono)
    admin = criar_admin()
    editar(dono, "aulas", conteudo)
    transicao(admin, "devolver", "aulas", conteudo, parecer="Rever.")

    rota = url("rascunho", "aulas", conteudo.pk)

    # É moderação, como no publicado: exige o motivo e fica na auditoria.
    sem_motivo = cliente(admin).delete(rota)
    assert sem_motivo.status_code == 400
    assert sem_motivo.data["error"]["details"][0]["code"] == "sem_motivo"
    assert cliente(admin).delete(rota, {"motivo": "Fora do ar."}, format="json").status_code == 204
    registro = RegistroDeAuditoria.objects.get(
        acao=AcaoAuditoria.CONTEUDO_PUBLICADO_EXCLUIDO
    )
    assert registro.metadata["motivo"] == "Fora do ar."


def test_dono_nao_exclui_o_publicado_editado_e_aprovado_de_novo(dono):
    # Aprovado se exclui, mas este já esteve no ar: só a moderação o tira.
    conteudo = criar_conteudo("aulas", dono)
    editar(dono, "aulas", conteudo)
    transicao(criar_admin(), "aprovar", "aulas", conteudo)

    resposta = cliente(dono).delete(url("rascunho", "aulas", conteudo.pk))

    assert resposta.status_code == 400
    assert resposta.data["error"]["details"][0]["code"] == "ja_publicado"
    assert Aula.objects.filter(pk=conteudo.pk).exists()


def test_trilha_nao_leva_junto_a_aula_que_ja_foi_ao_ar(dono):
    trilha = criar_trilha("logica", status=RASCUNHO, autor=dono)
    aula = criar_aula(trilha, "vars", autor=dono)
    editar(dono, "aulas", aula)
    transicao(criar_admin(), "devolver", "aulas", aula, parecer="Rever.")

    resposta = cliente(dono).delete(url("rascunho", "trilhas", trilha.pk))

    assert resposta.status_code == 400
    assert resposta.data["error"]["details"][0]["code"] == "filho_avancado"
    assert Aula.objects.filter(pk=aula.pk).exists()


def test_aprovado_editado_e_devolvido_ainda_e_excluivel(dono):
    conteudo = criar_conteudo("aulas", dono, status=APROVADO)
    editar(dono, "aulas", conteudo)
    transicao(criar_admin(), "devolver", "aulas", conteudo, parecer="Rever.")

    assert (
        cliente(dono).delete(url("rascunho", "aulas", conteudo.pk)).status_code == 204
    )


# --- Diff ---


def test_diff_mostra_o_que_entrou_e_o_que_saiu(dono):
    trilha = criar_trilha("logica", autor=dono)
    aula = criar_aula(
        trilha, "vars", titulo="Variáveis", conteudo="um\ndois\ntrês", autor=dono
    )
    editar(dono, "aulas", aula, {"titulo": "Variáveis", "conteudo": "um\n2\ntrês"})

    resposta = cliente(criar_admin()).get(url("diff", "aulas", aula.pk))

    assert resposta.status_code == 200
    # O título não mudou: só o campo alterado aparece.
    assert resposta.json() == {
        "campos": [
            {
                "campo": "conteudo",
                "linhas": [
                    {"tipo": "igual", "texto": "um"},
                    {"tipo": "removido", "texto": "dois"},
                    {"tipo": "adicionado", "texto": "2"},
                    {"tipo": "igual", "texto": "três"},
                ],
            }
        ],
        "filhos": [],
    }


def test_diff_da_trilha_traz_o_da_aula_editada_dentro_dela(dono):
    # Na fila a trilha aparece no lugar da aula: o diff da aula vem junto.
    trilha = criar_trilha("logica", autor=dono)
    aula = criar_aula(trilha, "vars", titulo="Variáveis", conteudo="um", autor=dono)
    criar_aula(trilha, "tipos", titulo="Tipos", autor=dono)
    editar(dono, "aulas", aula, {"titulo": "Variáveis", "conteudo": "dois"})

    dados = cliente(criar_admin()).get(url("diff", "trilhas", trilha.pk)).json()

    assert dados["campos"] == []
    assert [(f["tipo"], f["id"], f["titulo"]) for f in dados["filhos"]] == [
        ("aulas", aula.pk, "Variáveis")
    ]
    assert dados["filhos"][0]["campos"][0]["campo"] == "conteudo"


def test_diff_do_exercicio_de_codigo_mostra_o_caso_de_teste_trocado(dono):
    exercicio = criar_conteudo("exercicios", dono)
    spec = EspecificacaoDeCodigo.objects.create(exercicio=exercicio, funcao="media")
    CasoDeTeste.objects.create(
        especificacao=spec, ordem=1, argumentos=[2, 4], esperado=3, visivel=True
    )
    corpo = {
        "titulo": exercicio.titulo,
        "enunciado": exercicio.enunciado,
        "testes": [{"argumentos": [2, 4], "esperado": 99, "visivel": True}],
    }
    assert editar(dono, "exercicios", exercicio, corpo).status_code == 200

    campos = cliente(dono).get(url("diff", "exercicios", exercicio.pk)).json()["campos"]

    assert campos == [
        {
            "campo": "testes",
            "linhas": [
                {"tipo": "removido", "texto": "[[2, 4], 3, true]"},
                {"tipo": "adicionado", "texto": "[[2, 4], 99, true]"},
            ],
        }
    ]


def exercicio_com_erro_esperado(dono):
    exercicio = criar_conteudo("exercicios", dono)
    spec = EspecificacaoDeCodigo.objects.create(exercicio=exercicio, funcao="dividir")
    CasoDeTeste.objects.create(
        especificacao=spec,
        ordem=1,
        argumentos=[1, 0],
        esperado=None,
        erro_esperado="ZeroDivisionError",
        visivel=True,
    )
    return exercicio


def test_editar_so_o_titulo_preserva_o_erro_esperado_dos_casos(dono):
    # A tela reenvia os casos a cada edição e não conhece `erro_esperado`.
    exercicio = exercicio_com_erro_esperado(dono)
    corpo = {
        "titulo": "Divisão segura",
        "enunciado": exercicio.enunciado,
        "funcao": "dividir",
        "testes": [{"argumentos": [1, 0], "esperado": None, "visivel": True}],
    }

    assert editar(dono, "exercicios", exercicio, corpo).status_code == 200

    assert CasoDeTeste.objects.get().erro_esperado == "ZeroDivisionError"
    campos = cliente(dono).get(url("diff", "exercicios", exercicio.pk)).json()["campos"]
    assert [c["campo"] for c in campos] == ["titulo"]


def test_diff_mostra_o_erro_esperado_que_a_troca_de_casos_apagou(dono):
    exercicio = exercicio_com_erro_esperado(dono)
    corpo = {
        "titulo": exercicio.titulo,
        "enunciado": exercicio.enunciado,
        "testes": [{"argumentos": [4, 2], "esperado": 2, "visivel": True}],
    }
    editar(dono, "exercicios", exercicio, corpo)

    campos = cliente(dono).get(url("diff", "exercicios", exercicio.pk)).json()["campos"]

    assert campos[0]["linhas"] == [
        {"tipo": "removido", "texto": '[[1, 0], null, true, "ZeroDivisionError"]'},
        {"tipo": "adicionado", "texto": "[[4, 2], 2, true]"},
    ]


def test_dono_da_trilha_nao_le_pelo_diff_o_filho_de_outro_autor(dono):
    trilha = criar_trilha("logica", autor=dono)
    outro = criar_autor("outro")
    aula = criar_aula(trilha, "vars", titulo="Variáveis", conteudo="um", autor=outro)
    editar(outro, "aulas", aula, {"titulo": "Variáveis", "conteudo": "dois"})
    rota = url("diff", "trilhas", trilha.pk)

    assert cliente(dono).get(rota).json()["filhos"] == []
    # Quem revisa lê a fila inteira.
    assert [f["id"] for f in cliente(criar_admin()).get(rota).json()["filhos"]] == [aula.pk]


def test_diff_vazio_para_o_que_nunca_foi_aprovado(dono):
    conteudo = criar_conteudo("aulas", dono, status=REVISAO)

    resposta = cliente(criar_admin()).get(url("diff", "aulas", conteudo.pk))

    assert resposta.json() == {"campos": [], "filhos": []}


def test_diff_nunca_traz_a_solucao_do_autor(dono):
    exercicio = criar_conteudo("exercicios", dono)
    editar(dono, "exercicios", exercicio)

    exercicio.refresh_from_db()
    assert "SEGREDO" not in str(exercicio.conteudo_anterior)
    resposta = cliente(dono).get(url("diff", "exercicios", exercicio.pk))
    assert "SEGREDO" not in resposta.content.decode()


def test_autor_nao_le_o_diff_de_outro(dono):
    conteudo = criar_conteudo("aulas", dono)
    editar(dono, "aulas", conteudo)

    rota = url("diff", "aulas", conteudo.pk)
    assert cliente(criar_autor("intruso")).get(rota).status_code == 403
    assert cliente(dono).get(rota).status_code == 200
    assert cliente(criar_aluno()).get(rota).status_code == 403


# --- Meus conteúdos ---

MEUS = reverse("autoria:meus-conteudos")


def test_meus_conteudos_lista_tudo_do_autor_em_qualquer_status(dono):
    trilha = criar_trilha("logica", nome="Lógica", status=RASCUNHO, autor=dono)
    aula = criar_aula(trilha, "vars", titulo="Variáveis", status=REVISAO, autor=dono)
    criar_exercicio(aula, "media", titulo="Média", autor=dono)

    dados = cliente(dono).get(MEUS).json()

    assert [(i["tipo"], i["titulo"], i["status_editorial"]) for i in dados] == [
        ("trilhas", "Lógica", RASCUNHO),
        ("aulas", "Variáveis", REVISAO),
        ("exercicios", "Média", PUBLICADO),
    ]


def test_meus_conteudos_nao_mostra_o_de_outro_autor_nem_o_semeado(dono):
    criar_trilha("minha", nome="Minha", autor=dono)
    criar_trilha("alheia", nome="Alheia", autor=criar_autor("outro"))
    criar_trilha("semeada", nome="Semeada")

    assert [i["titulo"] for i in cliente(dono).get(MEUS).json()] == ["Minha"]


def test_meus_conteudos_do_admin_tambem_e_so_o_dele(dono):
    criar_trilha("alheia", autor=dono)
    admin = criar_admin()
    criar_trilha("do-admin", nome="Do admin", autor=admin)

    assert [i["titulo"] for i in cliente(admin).get(MEUS).json()] == ["Do admin"]


def test_meus_conteudos_sem_submit_review_recebe_403():
    assert cliente(criar_aluno()).get(MEUS).status_code == 403
    assert APIClient().get(MEUS).status_code in (401, 403)
