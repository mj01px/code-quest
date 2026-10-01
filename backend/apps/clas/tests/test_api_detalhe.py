from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.clas.models import Bandeira, Cargo, ConviteDoCla, MembroDoCla, TipoDeCla
from apps.clas.tests.helpers import codigos, montar_cla
from apps.contas.tests.helpers import criar_aluno


def url(tag):
    return reverse("clas:cla-detalhe", kwargs={"tag": tag})


class VerClaTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.lider = criar_aluno("lider")
        cls.estranho = criar_aluno("estranho")
        cls.publico = montar_cla(cls.lider, descricao="aberto pra todos")
        cls.privado = montar_cla(criar_aluno("lider2"), tipo=TipoDeCla.PRIVADO)
        cls.membro_privado = criar_aluno("membro")
        MembroDoCla.objects.create(cla=cls.privado, user=cls.membro_privado)

    def test_publico_qualquer_logado_ve(self):
        self.client.force_authenticate(self.estranho)
        r = self.client.get(url(self.publico.tag))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["descricao"], "aberto pra todos")
        self.assertEqual(r.data["total_membros"], 1)

    def test_tag_em_minusculo(self):
        self.client.force_authenticate(self.estranho)
        r = self.client.get(url(self.publico.tag.lower()))
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_privado_membro_ve(self):
        self.client.force_authenticate(self.membro_privado)
        r = self.client.get(url(self.privado.tag))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["total_membros"], 2)

    def test_privado_e_inexistente_respondem_igual(self):
        self.client.force_authenticate(self.estranho)
        privado = self.client.get(url(self.privado.tag))
        inexistente = self.client.get(url("ZZZZZZZZ"))

        self.assertEqual(privado.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(inexistente.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(privado.data, inexistente.data)

    def test_anonimo(self):
        r = self.client.get(url(self.publico.tag))
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)


class EditarClaTest(APITestCase):
    def setUp(self):
        self.lider = criar_aluno("lider")
        self.cla = montar_cla(self.lider, tipo=TipoDeCla.PRIVADO)
        self.colider = criar_aluno("colider")
        MembroDoCla.objects.create(cla=self.cla, user=self.colider, cargo=Cargo.COLIDER)
        self.membro = criar_aluno("membro")
        MembroDoCla.objects.create(cla=self.cla, user=self.membro)

    def _patch(self, user, dados, cla=None):
        self.client.force_authenticate(user)
        return self.client.patch(url((cla or self.cla).tag), dados, format="json")

    def test_lider_edita(self):
        r = self._patch(
            self.lider,
            {"descricao": " nova ", "bandeira": "guilda_3", "nivel_minimo": 8},
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["descricao"], "nova")
        self.assertEqual(r.data["total_membros"], 3)

        self.cla.refresh_from_db()
        self.assertEqual(self.cla.bandeira, Bandeira.GUILDA_3)
        self.assertEqual(self.cla.nivel_minimo, 8)

    def test_colider_edita(self):
        r = self._patch(self.colider, {"descricao": "do co-líder"})
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_membro_nao_edita(self):
        r = self._patch(self.membro, {"descricao": "hackeado"})
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(codigos(r), ["cargo_insuficiente"])
        self.cla.refresh_from_db()
        self.assertEqual(self.cla.descricao, "")

    def test_de_fora_de_cla_publico_leva_403(self):
        publico = montar_cla(criar_aluno("outro_lider"))
        r = self._patch(self.membro, {"descricao": "x"}, cla=publico)
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_de_fora_de_cla_privado_leva_404(self):
        r = self._patch(criar_aluno("estranho"), {"descricao": "x"})
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

    def test_nome_nao_muda(self):
        r = self._patch(self.lider, {"nome": "Outro Nome", "descricao": "x"})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(codigos(r), ["nome_nao_editavel"])
        self.cla.refresh_from_db()
        self.assertEqual(self.cla.nome, "Os Bugados")
        self.assertEqual(self.cla.descricao, "")

    def test_tag_enviada_e_ignorada(self):
        tag = self.cla.tag
        r = self._patch(self.lider, {"tag": "AAAAAAAA"})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.cla.refresh_from_db()
        self.assertEqual(self.cla.tag, tag)

    def test_nivel_minimo_fora_da_faixa(self):
        r = self._patch(self.lider, {"nivel_minimo": 4})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(codigos(r), ["nivel_minimo_invalido"])

    def test_virar_publico_revoga_o_convite(self):
        agora = timezone.now()
        convite = ConviteDoCla.objects.create(
            cla=self.cla, token_hash="a" * 64, expira_em=agora + timedelta(days=7)
        )
        r = self._patch(self.lider, {"tipo": "PUBLICO"})

        self.assertEqual(r.status_code, status.HTTP_200_OK)
        convite.refresh_from_db()
        self.assertIsNotNone(convite.revogado_em)

    def test_editar_outra_coisa_nao_mexe_no_convite(self):
        convite = ConviteDoCla.objects.create(
            cla=self.cla,
            token_hash="a" * 64,
            expira_em=timezone.now() + timedelta(days=7),
        )
        self._patch(self.lider, {"descricao": "x", "tipo": "PRIVADO"})
        convite.refresh_from_db()
        self.assertIsNone(convite.revogado_em)


class MeuClaTest(APITestCase):
    URL = reverse("clas:meu-cla")

    def test_sem_cla(self):
        self.client.force_authenticate(criar_aluno())
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)

    def test_com_cla(self):
        lider = criar_aluno("lider")
        cla = montar_cla(lider, tipo=TipoDeCla.PRIVADO)
        MembroDoCla.objects.create(cla=cla, user=criar_aluno("outro"))
        self.client.force_authenticate(lider)

        r = self.client.get(self.URL)

        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["cargo"], Cargo.LIDER)
        self.assertEqual(r.data["cla"]["tag"], cla.tag)
        self.assertEqual(r.data["cla"]["total_membros"], 2)

    def test_anonimo(self):
        self.assertEqual(
            self.client.get(self.URL).status_code, status.HTTP_401_UNAUTHORIZED
        )
