from unittest import mock

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.clas import palavras_proibidas
from apps.clas.models import Cargo, Cla, MembroDoCla, TipoDeCla
from apps.clas.tests.helpers import codigos, dar_nivel, montar_cla
from apps.contas.models import NivelDeAcesso, Permissao
from apps.contas.tests.helpers import criar_aluno, criar_nao_verificado

URL = reverse("clas:clas")


def payload(**extra):
    dados = {"nome": "Os Bugados", "bandeira": "guilda_2"}
    dados.update(extra)
    return dados


class CriarClaTest(APITestCase):
    def setUp(self):
        self.user = criar_aluno()
        dar_nivel(self.user, 5)
        self.client.force_authenticate(self.user)

    def test_cria_e_vira_lider(self):
        r = self.client.post(URL, payload(descricao="bora"), format="json")

        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data["nome"], "Os Bugados")
        self.assertEqual(r.data["bandeira"], "guilda_2")
        self.assertEqual(r.data["tipo"], TipoDeCla.PUBLICO)
        self.assertEqual(r.data["nivel_minimo"], 5)
        self.assertEqual(r.data["total_membros"], 1)
        self.assertEqual(len(r.data["tag"]), 8)

        membro = MembroDoCla.objects.get(user=self.user)
        self.assertEqual(membro.cargo, Cargo.LIDER)
        self.assertEqual(membro.cla.tag, r.data["tag"])

    def test_cria_privado_com_nivel_minimo(self):
        r = self.client.post(
            URL, payload(tipo="PRIVADO", nivel_minimo=12), format="json"
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data["tipo"], TipoDeCla.PRIVADO)
        self.assertEqual(r.data["nivel_minimo"], 12)

    def test_nome_e_normalizado(self):
        r = self.client.post(URL, payload(nome="  Os   Bugados "), format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data["nome"], "Os Bugados")

    def test_tag_enviada_e_ignorada(self):
        r = self.client.post(URL, payload(tag="AAAAAAAA"), format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertNotEqual(r.data["tag"], "AAAAAAAA")

    def test_nivel_abaixo_de_5(self):
        dar_nivel(self.user, 4)
        r = self.client.post(URL, payload(), format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(codigos(r), ["nivel_insuficiente"])
        self.assertFalse(Cla.objects.exists())

    def test_sem_criatura(self):
        user = criar_aluno("sem_criatura")
        self.client.force_authenticate(user)
        r = self.client.post(URL, payload(), format="json")
        self.assertEqual(codigos(r), ["nivel_insuficiente"])

    def test_email_nao_verificado(self):
        user = criar_nao_verificado()
        dar_nivel(user, 10)
        self.client.force_authenticate(user)
        r = self.client.post(URL, payload(), format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(codigos(r), ["email_nao_verificado"])

    def test_ja_esta_em_cla(self):
        montar_cla(self.user)
        r = self.client.post(URL, payload(nome="Outro"), format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(codigos(r), ["ja_em_cla"])
        self.assertEqual(Cla.objects.count(), 1)

    def test_nome_pode_repetir(self):
        montar_cla(criar_aluno("outro"), nome="Os Bugados")
        r = self.client.post(URL, payload(), format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_nome_invalido(self):
        casos = {"ab": "nome_tamanho", "x" * 25: "nome_tamanho", "Clã!": "nome_invalido"}
        for nome, codigo in casos.items():
            with self.subTest(nome=nome):
                r = self.client.post(URL, payload(nome=nome), format="json")
                self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertEqual(r.data["error"]["details"][0]["field"], "nome")
                self.assertIn(codigo, codigos(r))

    def test_campos_obrigatorios(self):
        r = self.client.post(URL, {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        campos = {d["field"] for d in r.data["error"]["details"]}
        self.assertEqual(campos, {"nome", "bandeira"})

    def test_bandeira_e_tipo_fora_da_lista(self):
        for campo, valor in (("bandeira", "guilda_9"), ("tipo", "SECRETO")):
            with self.subTest(campo=campo):
                r = self.client.post(URL, payload(**{campo: valor}), format="json")
                self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertEqual(r.data["error"]["details"][0]["field"], campo)

    def test_nivel_minimo_fora_da_faixa(self):
        for valor in (4, 31):
            with self.subTest(valor=valor):
                r = self.client.post(URL, payload(nivel_minimo=valor), format="json")
                self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertEqual(codigos(r), ["nivel_minimo_invalido"])
        self.assertFalse(Cla.objects.exists())

    def test_nivel_minimo_no_teto(self):
        r = self.client.post(URL, payload(nivel_minimo=30), format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    @mock.patch.object(palavras_proibidas, "PALAVRAS_PROIBIDAS", frozenset({"bobo"}))
    def test_palavra_proibida(self):
        for campo, valor in (("nome", "Clã Bobo"), ("descricao", "somos b0b0s e b0b0")):
            with self.subTest(campo=campo):
                r = self.client.post(URL, payload(**{campo: valor}), format="json")
                self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertEqual(codigos(r), ["termo_proibido"])
        self.assertFalse(Cla.objects.exists())

    def test_tenta_outra_tag_se_repetir(self):
        montar_cla(criar_aluno("outro"), tag="AAAAAAAA")
        with mock.patch(
            "apps.clas.services.gerar_tag", side_effect=["AAAAAAAA", "BBBBBBBB"]
        ):
            r = self.client.post(URL, payload(), format="json")

        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data["tag"], "BBBBBBBB")


class CriarClaAcessoTest(APITestCase):
    def test_anonimo(self):
        r = self.client.post(URL, payload(), format="json")
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_sem_comunidades_create(self):
        user = criar_aluno()
        dar_nivel(user, 10)
        nivel = NivelDeAcesso.objects.create(nome="sem_criar_cla")
        nivel.permissoes.set(Permissao.objects.exclude(codename="comunidades.create"))
        user.nivel_de_acesso = nivel
        user.save(update_fields=["nivel_de_acesso"])
        user.invalidar_cache_permissoes()
        self.client.force_authenticate(user)

        r = self.client.post(URL, payload(), format="json")

        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Cla.objects.exists())
