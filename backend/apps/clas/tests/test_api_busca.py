from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.clas.models import MembroDoCla, TipoDeCla
from apps.clas.tests.helpers import codigos, montar_cla
from apps.contas.tests.helpers import criar_aluno

URL = reverse("clas:clas")


class BuscaTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = criar_aluno("buscador")
        cls.bugados = montar_cla(criar_aluno("l1"), nome="Os Bugados", tag="BUGADXS2")
        cls.cafe = montar_cla(criar_aluno("l2"), nome="Clã do Café", tag="CAFECAFE")
        cls.secreto = montar_cla(
            criar_aluno("l3"), nome="Bugados Secretos", tipo=TipoDeCla.PRIVADO
        )
        MembroDoCla.objects.create(cla=cls.cafe, user=criar_aluno("m1"))

    def setUp(self):
        self.client.force_authenticate(self.user)

    def _tags(self, **params):
        r = self.client.get(URL, params)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        return [c["tag"] for c in r.data["results"]]

    def test_lista_so_publicos(self):
        tags = self._tags()
        self.assertCountEqual(tags, [self.bugados.tag, self.cafe.tag])
        self.assertNotIn(self.secreto.tag, tags)

    def test_mais_membros_primeiro(self):
        self.assertEqual(self._tags(), [self.cafe.tag, self.bugados.tag])

    def test_por_nome_sem_diferenciar_maiusculas(self):
        self.assertEqual(self._tags(busca="bugad"), [self.bugados.tag])

    def test_por_tag_com_e_sem_cerquilha(self):
        for busca in ("CAFECAFE", "#cafecafe", " #CAFECAFE "):
            with self.subTest(busca=busca):
                self.assertEqual(self._tags(busca=busca), [self.cafe.tag])

    def test_tag_de_cla_privado_nao_aparece(self):
        self.assertEqual(self._tags(busca=self.secreto.tag), [])

    def test_sem_resultado(self):
        self.assertEqual(self._tags(busca="nada a ver"), [])

    def test_resposta_traz_os_dados_publicos(self):
        r = self.client.get(URL, {"busca": "CAFECAFE"})
        cla = r.data["results"][0]
        self.assertEqual(cla["total_membros"], 2)
        self.assertEqual(
            set(cla),
            {
                "tag",
                "nome",
                "descricao",
                "bandeira",
                "bandeira_rotulo",
                "tipo",
                "tipo_rotulo",
                "nivel_minimo",
                "total_membros",
                "criado_em",
            },
        )

    def test_paginada(self):
        r = self.client.get(URL, {"tamanho": 1})
        self.assertEqual(r.data["count"], 2)
        self.assertEqual(len(r.data["results"]), 1)
        self.assertIsNotNone(r.data["next"])

    def test_busca_longa_demais(self):
        r = self.client.get(URL, {"busca": "x" * 51})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(codigos(r), ["busca_longa"])

    def test_anonimo(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(URL).status_code, status.HTTP_401_UNAUTHORIZED)
