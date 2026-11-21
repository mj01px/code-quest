from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.auditoria.models import AcaoAuditoria, RegistroDeAuditoria
from apps.contas.documentos import (
    Documento,
    status_consentimentos,
    versao_vigente,
    vigente,
)
from apps.contas.models import (
    AceiteDeTermos,
    NivelDeAcesso,
    VersaoDeDocumento,
    VersaoDeDocumentoImutavelError,
)
from apps.contas.tests.helpers import criar_admin, criar_aluno

CONTEUDO = "## Primeira seção\n\nTexto da versão nova."


class DocumentoPublicoTests(APITestCase):
    def test_devolve_a_versao_vigente_com_conteudo_e_historico(self):
        resposta = self.client.get(reverse("contas:documento", args=["termos"]))

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertEqual(resposta.data["versao"], "1.3")
        self.assertTrue(resposta.data["vigente"])
        self.assertIn("18 anos ou mais", resposta.data["conteudo"])
        self.assertEqual(
            [item["versao"] for item in resposta.data["historico"]],
            ["1.3", "1.2", "1.1", "1.0"],
        )

    def test_mostra_uma_versao_anterior(self):
        resposta = self.client.get(
            reverse("contas:documento", args=["privacidade"]), {"versao": "1.2"}
        )

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertFalse(resposta.data["vigente"])
        self.assertIn("16 anos ou mais", resposta.data["conteudo"])

    def test_guarda_o_texto_da_primeira_versao(self):
        resposta = self.client.get(
            reverse("contas:documento", args=["termos"]), {"versao": "1.0"}
        )

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertEqual(str(resposta.data["vigente_desde"]), "2026-09-08")
        self.assertIn("[A DEFINIR: idade mínima]", resposta.data["conteudo"])

    def test_versao_inexistente_e_documento_desconhecido_dao_404(self):
        url = reverse("contas:documento", args=["termos"])
        self.assertEqual(
            self.client.get(url, {"versao": "9.9"}).status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertEqual(
            self.client.get(reverse("contas:documento", args=["outro"])).status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_rascunho_e_versao_futura_nao_aparecem(self):
        VersaoDeDocumento.objects.create(
            documento=Documento.TERMOS,
            versao="1.4",
            conteudo=CONTEUDO,
            vigente_desde=timezone.localdate(),
        )
        VersaoDeDocumento.objects.create(
            documento=Documento.PRIVACIDADE,
            versao="1.4",
            conteudo=CONTEUDO,
            situacao=VersaoDeDocumento.Situacao.PUBLICADA,
            vigente_desde=timezone.localdate() + timedelta(days=10),
            publicado_em=timezone.now(),
        )

        termos = self.client.get(reverse("contas:documento", args=["termos"]))
        privacidade = self.client.get(
            reverse("contas:documento", args=["privacidade"]), {"versao": "1.4"}
        )

        self.assertEqual(termos.data["versao"], "1.3")
        self.assertEqual(privacidade.status_code, status.HTTP_404_NOT_FOUND)


class GestaoDeVersoesTests(APITestCase):
    def setUp(self):
        self.admin = criar_admin()
        self.client.force_authenticate(self.admin)
        self.url = reverse("contas:admin-documentos")

    def _payload(self, **extra):
        return {
            "documento": Documento.TERMOS,
            "versao": "1.4",
            "vigente_desde": timezone.localdate().isoformat(),
            "conteudo": CONTEUDO,
            **extra,
        }

    def _criar_rascunho(self, **extra):
        resposta = self.client.post(self.url, self._payload(**extra), format="json")
        self.assertEqual(resposta.status_code, status.HTTP_201_CREATED, resposta.data)
        return resposta.data

    def _codigo(self, resposta):
        return resposta.data["error"]["details"][0]["code"]

    def test_exige_autenticacao_e_permissao(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_401_UNAUTHORIZED)

        self.client.force_authenticate(criar_aluno())
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_403_FORBIDDEN)

        sem_permissao = criar_admin("admin_restrito")
        nivel = NivelDeAcesso.objects.create(nome="Restrito", acesso_admin=True)
        sem_permissao.nivel_de_acesso = nivel
        sem_permissao.save(update_fields=["nivel_de_acesso"])
        self.client.force_authenticate(sem_permissao)
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_403_FORBIDDEN)

    def test_lista_as_versoes_marcando_a_vigente(self):
        resposta = self.client.get(self.url)

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        vigentes = {(v["documento"], v["versao"]) for v in resposta.data if v["vigente"]}
        self.assertEqual(
            vigentes, {(Documento.TERMOS, "1.3"), (Documento.PRIVACIDADE, "1.3")}
        )

    def test_cria_rascunho_com_autor(self):
        dados = self._criar_rascunho()

        self.assertEqual(dados["situacao"], "RASCUNHO")
        self.assertEqual(dados["criado_por"], self.admin.nickname)
        self.assertFalse(dados["vigente"])
        self.assertEqual(versao_vigente(Documento.TERMOS), "1.3")

    def test_recusa_versao_que_nao_e_maior_que_a_publicada(self):
        for versao in ("1.3", "1.3.0", "1.2.9", "1.0"):
            resposta = self.client.post(self.url, self._payload(versao=versao), format="json")
            self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn(self._codigo(resposta), {"versao_nao_e_maior", "versao_existente"})

    def test_recusa_formato_de_versao_invalido(self):
        resposta = self.client.post(self.url, self._payload(versao="v2"), format="json")
        self.assertEqual(self._codigo(resposta), "versao_invalida")

    def test_recusa_vigencia_no_passado(self):
        ontem = (timezone.localdate() - timedelta(days=1)).isoformat()
        resposta = self.client.post(self.url, self._payload(vigente_desde=ontem), format="json")
        self.assertEqual(self._codigo(resposta), "vigencia_no_passado")

    def test_recusa_conteudo_sem_secao(self):
        resposta = self.client.post(
            self.url, self._payload(conteudo="Só um parágrafo."), format="json"
        )
        self.assertEqual(self._codigo(resposta), "conteudo_sem_secao")

    def test_so_um_rascunho_por_documento(self):
        self._criar_rascunho()
        resposta = self.client.post(self.url, self._payload(versao="1.5"), format="json")
        self.assertEqual(self._codigo(resposta), "rascunho_existente")

    def test_edita_e_exclui_rascunho(self):
        dados = self._criar_rascunho()
        url = reverse("contas:admin-documento", args=[dados["id"]])

        editado = self.client.patch(url, {"conteudo": CONTEUDO + "\n\nMais."}, format="json")
        self.assertEqual(editado.status_code, status.HTTP_200_OK)
        self.assertTrue(editado.data["conteudo"].endswith("Mais."))

        trocado = self.client.patch(url, {"documento": Documento.PRIVACIDADE}, format="json")
        self.assertEqual(self._codigo(trocado), "documento_imutavel")

        self.assertEqual(self.client.delete(url).status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(VersaoDeDocumento.objects.filter(pk=dados["id"]).exists())

    def test_versao_publicada_nao_muda_nem_e_excluida(self):
        publicada = VersaoDeDocumento.objects.get(documento=Documento.TERMOS, versao="1.3")
        url = reverse("contas:admin-documento", args=[publicada.pk])

        editada = self.client.patch(url, {"conteudo": CONTEUDO}, format="json")
        excluida = self.client.delete(url)

        self.assertEqual(editada.data["error"]["code"], "versao_publicada")
        self.assertEqual(excluida.data["error"]["code"], "versao_publicada")
        with self.assertRaises(VersaoDeDocumentoImutavelError):
            publicada.conteudo = "outro"
            publicada.save()

    def test_publicar_troca_a_vigente_pede_novo_aceite_e_audita(self):
        aluno = criar_aluno()
        AceiteDeTermos.registrar_vigentes(aluno)
        dados = self._criar_rascunho()

        resposta = self.client.post(
            reverse("contas:admin-documento-publicar", args=[dados["id"]])
        )

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertEqual(resposta.data["situacao"], "PUBLICADA")
        self.assertTrue(resposta.data["vigente"])
        self.assertEqual(resposta.data["publicado_por"], self.admin.nickname)
        self.assertEqual(versao_vigente(Documento.TERMOS), "1.4")
        pendencias = {s["documento"]: s["pendente"] for s in status_consentimentos(aluno)}
        self.assertEqual(
            pendencias, {Documento.TERMOS: True, Documento.PRIVACIDADE: False}
        )
        registro = RegistroDeAuditoria.objects.get(acao=AcaoAuditoria.DOCUMENTO_PUBLICADO)
        self.assertEqual(registro.actor, self.admin)
        self.assertEqual(registro.metadata["versao"], "1.4")

    def test_publicar_duas_vezes_e_recusado(self):
        dados = self._criar_rascunho()
        url = reverse("contas:admin-documento-publicar", args=[dados["id"]])

        self.client.post(url)
        resposta = self.client.post(url)

        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)

    def test_vigencia_futura_so_vale_na_data(self):
        daqui_a_uma_semana = timezone.localdate() + timedelta(days=7)
        dados = self._criar_rascunho(vigente_desde=daqui_a_uma_semana.isoformat())

        self.client.post(reverse("contas:admin-documento-publicar", args=[dados["id"]]))

        self.assertEqual(versao_vigente(Documento.TERMOS), "1.3")
        self.assertEqual(vigente(Documento.TERMOS, hoje=daqui_a_uma_semana).versao, "1.4")
