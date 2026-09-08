from django.db import IntegrityError, transaction
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.contas.documentos import VIGENTES, Documento, versao_vigente
from apps.contas.models import AceiteDeTermos, User

from .helpers import SENHA_PADRAO, criar_aluno, payload_aceite


def _primeiro_codigo(resposta) -> str:
    return resposta.data["error"]["details"][0]["code"]


class AceiteNoCadastroTest(APITestCase):
    def setUp(self):
        self.url = reverse("contas:registrar")
        self.payload = {
            "email": "novato@exemplo.com",
            "nickname": "novato",
            "senha": SENHA_PADRAO,
            "senha_confirmacao": SENHA_PADRAO,
            **payload_aceite(),
        }

    def test_grava_uma_linha_por_documento(self):
        r = self.client.post(self.url, self.payload, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

        usuario = User.objects.get(nickname="novato")
        aceites = AceiteDeTermos.objects.filter(user=usuario)
        self.assertEqual(aceites.count(), len(VIGENTES))
        self.assertEqual(
            {a.documento for a in aceites},
            {Documento.TERMOS, Documento.PRIVACIDADE},
        )

    def test_grava_a_versao_vigente_de_cada_documento(self):
        self.client.post(self.url, self.payload, format="json")

        usuario = User.objects.get(nickname="novato")
        for documento in (Documento.TERMOS, Documento.PRIVACIDADE):
            aceite = AceiteDeTermos.objects.get(user=usuario, documento=documento)
            self.assertEqual(aceite.versao, versao_vigente(documento))

    def test_guarda_o_ip_de_origem(self):
        self.client.post(
            self.url, self.payload, format="json", REMOTE_ADDR="203.0.113.7"
        )

        usuario = User.objects.get(nickname="novato")
        for aceite in AceiteDeTermos.objects.filter(user=usuario):
            self.assertEqual(aceite.ip, "203.0.113.7")

    def test_sem_o_campo_de_aceite_nao_cria_conta(self):
        del self.payload["aceite_documentos"]

        r = self.client.post(self.url, self.payload, format="json")

        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(nickname="novato").exists())

    def test_recusar_o_aceite_nao_cria_conta(self):
        self.payload["aceite_documentos"] = False

        r = self.client.post(self.url, self.payload, format="json")

        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(_primeiro_codigo(r), "aceite_obrigatorio")
        self.assertFalse(User.objects.filter(nickname="novato").exists())
        self.assertFalse(AceiteDeTermos.objects.exists())

    def test_versao_desatualizada_nao_cria_conta(self):
        self.payload["versao_termos"] = "0.9"

        r = self.client.post(self.url, self.payload, format="json")

        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(_primeiro_codigo(r), "versao_desatualizada")
        self.assertFalse(User.objects.filter(nickname="novato").exists())

    def test_versao_desatualizada_de_privacidade_tambem_barra(self):
        self.payload["versao_privacidade"] = "0.9"

        r = self.client.post(self.url, self.payload, format="json")

        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(_primeiro_codigo(r), "versao_desatualizada")

    def test_conta_recusada_nao_deixa_aceite_orfao(self):
        criar_aluno("novato")
        self.payload["email"] = "outro@exemplo.com"

        r = self.client.post(self.url, self.payload, format="json")

        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(AceiteDeTermos.objects.exists())

    def test_aceite_nao_volta_na_resposta(self):
        r = self.client.post(self.url, self.payload, format="json")

        self.assertNotIn("aceite_documentos", r.data.get("usuario", {}))
        self.assertNotIn("versao_termos", r.data.get("usuario", {}))


class DocumentosLegaisTest(APITestCase):
    def setUp(self):
        self.url = reverse("contas:documentos")

    def test_leitura_publica_sem_token(self):
        r = self.client.get(self.url)
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_devolve_a_versao_vigente_dos_dois_documentos(self):
        r = self.client.get(self.url)

        self.assertEqual(r.data["termos"]["versao"], versao_vigente(Documento.TERMOS))
        self.assertEqual(
            r.data["privacidade"]["versao"], versao_vigente(Documento.PRIVACIDADE)
        )

    def test_devolve_o_nome_publico_de_cada_documento(self):
        r = self.client.get(self.url)

        self.assertEqual(r.data["termos"]["rotulo"], "Termos de Uso")
        self.assertEqual(
            r.data["privacidade"]["rotulo"], "Política de Privacidade"
        )

    def test_devolve_o_caminho_da_pagina(self):
        r = self.client.get(self.url)

        self.assertEqual(r.data["termos"]["caminho"], "/termos")
        self.assertEqual(r.data["privacidade"]["caminho"], "/privacidade")

    def test_o_que_a_api_devolve_e_aceito_no_cadastro(self):
        documentos = self.client.get(self.url).data

        r = self.client.post(
            reverse("contas:registrar"),
            {
                "email": "eco@exemplo.com",
                "nickname": "eco",
                "senha": SENHA_PADRAO,
                "senha_confirmacao": SENHA_PADRAO,
                "aceite_documentos": True,
                "versao_termos": documentos["termos"]["versao"],
                "versao_privacidade": documentos["privacidade"]["versao"],
            },
            format="json",
        )

        self.assertEqual(r.status_code, status.HTTP_201_CREATED)


class AceiteDeTermosModelTest(APITestCase):
    def test_nao_grava_o_mesmo_documento_e_versao_duas_vezes(self):
        usuario = criar_aluno("repetido")
        AceiteDeTermos.registrar_vigentes(usuario)

        with self.assertRaises(IntegrityError), transaction.atomic():
            AceiteDeTermos.objects.create(
                user=usuario,
                documento=Documento.TERMOS,
                versao=versao_vigente(Documento.TERMOS),
            )

    def test_versao_nova_convive_com_a_antiga(self):
        usuario = criar_aluno("historico")
        AceiteDeTermos.objects.create(
            user=usuario, documento=Documento.TERMOS, versao="1.0"
        )
        AceiteDeTermos.objects.create(
            user=usuario, documento=Documento.TERMOS, versao="2.0"
        )

        versoes = AceiteDeTermos.objects.filter(
            user=usuario, documento=Documento.TERMOS
        ).values_list("versao", flat=True)
        self.assertEqual(set(versoes), {"1.0", "2.0"})
