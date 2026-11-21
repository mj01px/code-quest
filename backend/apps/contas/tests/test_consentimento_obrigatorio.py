import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from apps.contas.documentos import Documento, vigentes
from apps.contas.models import AceiteDeTermos, VersaoDeDocumento
from apps.contas.tests.helpers import autenticar, criar_aluno


def _publicar_nova_versao_dos_termos() -> None:
    VersaoDeDocumento.objects.create(
        documento=Documento.TERMOS,
        versao="1.4",
        conteudo="## Seção\n\nTexto novo.",
        situacao=VersaoDeDocumento.Situacao.PUBLICADA,
        vigente_desde=timezone.localdate(),
        publicado_em=timezone.now(),
    )


@pytest.mark.consentimento
class ConsentimentoObrigatorioTests(APITestCase):
    def setUp(self):
        self.aluno = criar_aluno()
        AceiteDeTermos.registrar_vigentes(self.aluno)
        _publicar_nova_versao_dos_termos()
        self.trilhas = reverse("trilhas:trilha-lista")

    def _pelo_cabecalho(self):
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {AccessToken.for_user(self.aluno)}"
        )

    def test_bloqueia_a_plataforma_enquanto_houver_documento_pendente(self):
        autenticar(self.client, self.aluno)

        resposta = self.client.get(self.trilhas)

        self.assertEqual(resposta.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(resposta.data["error"]["code"], "consentimento_pendente")

    def test_bloqueia_tambem_pelo_cabecalho_authorization(self):
        self._pelo_cabecalho()

        resposta = self.client.get(self.trilhas)

        self.assertEqual(resposta.data["error"]["code"], "consentimento_pendente")

    def test_deixa_ver_os_dados_da_conta_e_os_documentos(self):
        autenticar(self.client, self.aluno)

        for rota in (
            "contas:eu",
            "contas:consentimentos",
            "contas:exportar",
            "auditoria:minha-atividade",
        ):
            with self.subTest(rota=rota):
                self.assertEqual(
                    self.client.get(reverse(rota)).status_code, status.HTTP_200_OK
                )
        self.assertEqual(
            self.client.get(reverse("contas:documento", args=["termos"])).status_code,
            status.HTTP_200_OK,
        )

    def test_nao_deixa_alterar_a_conta_sem_aceitar(self):
        self._pelo_cabecalho()

        resposta = self.client.patch(reverse("contas:eu"), {"nickname": "outro"})

        self.assertEqual(resposta.data["error"]["code"], "consentimento_pendente")

    def test_aceitar_libera_a_plataforma(self):
        self._pelo_cabecalho()

        aceite = self.client.post(reverse("contas:consentimentos-aceitar"))
        resposta = self.client.get(self.trilhas)

        self.assertEqual(aceite.status_code, status.HTTP_200_OK)
        self.assertEqual(resposta.status_code, status.HTTP_200_OK)

    def test_quem_esta_em_dia_usa_normalmente(self):
        outro = criar_aluno("em_dia")
        AceiteDeTermos.registrar_vigentes(outro)
        autenticar(self.client, outro)

        self.assertEqual(self.client.get(self.trilhas).status_code, status.HTTP_200_OK)

    def test_rotas_publicas_continuam_abertas_para_quem_esta_logado(self):
        self._pelo_cabecalho()

        for rota, dados in (
            ("contas:senha-esquecida", {"email": "x@example.com"}),
            ("contas:senha-redefinir", {"token": "x", "senha": "y"}),
            ("contas:verificar", {"token": "x"}),
            ("contas:confirmar-troca-email", {"token": "x"}),
        ):
            with self.subTest(rota=rota):
                resposta = self.client.post(reverse(rota), dados, format="json")
                codigo = resposta.data.get("error", {}).get("code") if resposta.data else None
                self.assertNotEqual(codigo, "consentimento_pendente")

    def test_deixa_pedir_a_exclusao_da_conta(self):
        self._pelo_cabecalho()

        resposta = self.client.post(reverse("contas:excluir"), {}, format="json")

        self.assertNotEqual(resposta.status_code, status.HTTP_403_FORBIDDEN)

    def test_consulta_das_versoes_vigentes_e_uma_query_so(self):
        with self.assertNumQueries(1):
            atuais = vigentes()

        self.assertEqual(atuais[Documento.TERMOS].versao, "1.4")
        self.assertIsNone(atuais[Documento.TERMOS].conteudo)
