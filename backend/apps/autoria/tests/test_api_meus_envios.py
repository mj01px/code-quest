"""Contrato de "meus envios": o retorno da revisão para quem enviou.

- Em revisão: o que o autor mandou e ainda espera.
- Devolvidos: rascunho com parecer; o rascunho puro não entra.
- Excluídos: o que outra pessoa apagou do que o autor criou, com o motivo.
"""

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.auditoria.models import AcaoAuditoria
from apps.auditoria.services import registrar
from apps.contas.tests.helpers import criar_admin, criar_aluno, criar_autor
from apps.trilhas.models import StatusEditorial
from apps.trilhas.tests.helpers import criar_trilha

pytestmark = pytest.mark.django_db

URL = reverse("autoria:meus-envios")


def cliente(usuario):
    c = APIClient()
    c.force_authenticate(user=usuario)
    return c


def criada_por(autor, slug, **extra):
    """Trilha com o registro de criação que a rota de criação grava."""
    trilha = criar_trilha(slug, autor=autor, **extra)
    registrar(AcaoAuditoria.CONTEUDO_CRIADO, actor=autor, alvo=trilha, tipo="trilhas")
    return trilha


def test_separa_em_revisao_devolvido_e_rascunho_puro():
    autor = criar_autor()
    criar_trilha("espera", nome="Espera", status=StatusEditorial.REVISAO, autor=autor)
    criar_trilha("pura", nome="Pura", status=StatusEditorial.RASCUNHO, autor=autor)
    voltou = criar_trilha(
        "voltou", nome="Voltou", status=StatusEditorial.REVISAO, autor=autor
    )
    cliente(criar_admin()).post(
        reverse("autoria:devolver", kwargs={"tipo": "trilhas", "pk": voltou.pk}),
        {"parecer": "Faltou exemplo."},
        format="json",
    )

    dados = cliente(autor).get(URL).json()

    assert [i["titulo"] for i in dados["em_revisao"]] == ["Espera"]
    assert [(i["titulo"], i["parecer"]) for i in dados["devolvidos"]] == [
        ("Voltou", "Faltou exemplo.")
    ]
    assert dados["excluidos"] == []


def test_exclusao_pelo_admin_aparece_com_quem_e_motivo():
    autor = criar_autor()
    publicada = criada_por(
        autor, "logica", nome="Lógica", status=StatusEditorial.PUBLICADO
    )
    rascunho = criada_por(autor, "rasc", nome="Rasc", status=StatusEditorial.RASCUNHO)
    admin = criar_admin()
    rota = "autoria:rascunho"
    cliente(admin).delete(
        reverse(rota, kwargs={"tipo": "trilhas", "pk": publicada.pk}),
        {"motivo": "Conteúdo duplicado."},
        format="json",
    )
    cliente(admin).delete(reverse(rota, kwargs={"tipo": "trilhas", "pk": rascunho.pk}))

    excluidos = cliente(autor).get(URL).json()["excluidos"]

    assert [
        (e["tipo"], e["titulo"], e["motivo"], e["excluido_por"]) for e in excluidos
    ] == [
        ("trilhas", "Rasc", None, admin.nickname),
        ("trilhas", "Lógica", "Conteúdo duplicado.", admin.nickname),
    ]


def test_nao_mostra_o_que_o_proprio_autor_apagou_nem_o_de_outro():
    autor = criar_autor()
    minha = criada_por(autor, "minha", status=StatusEditorial.RASCUNHO)
    cliente(autor).delete(
        reverse("autoria:rascunho", kwargs={"tipo": "trilhas", "pk": minha.pk})
    )
    alheia = criada_por(criar_autor("outro"), "alheia", status=StatusEditorial.RASCUNHO)
    cliente(criar_admin()).delete(
        reverse("autoria:rascunho", kwargs={"tipo": "trilhas", "pk": alheia.pk})
    )

    assert cliente(autor).get(URL).json()["excluidos"] == []


def test_sem_submit_review_recebe_403():
    assert cliente(criar_aluno()).get(URL).status_code == 403
