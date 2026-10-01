from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.clas.models import Cargo, Cla, MembroDoCla, TipoDeCla
from apps.clas.tests.helpers import codigos, dar_nivel, montar_cla
from apps.contas.models import NivelDeAcesso, Permissao
from apps.contas.tests.helpers import criar_aluno

URL_SAIR = reverse("clas:sair")


def url_entrar(tag):
    return reverse("clas:entrar", kwargs={"tag": tag})


class EntrarTest(APITestCase):
    def setUp(self):
        self.lider = criar_aluno("lider")
        self.cla = montar_cla(self.lider)
        self.user = criar_aluno("novato")
        dar_nivel(self.user, 5)
        self.client.force_authenticate(self.user)

    def test_entra_como_membro(self):
        r = self.client.post(url_entrar(self.cla.tag))

        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data["cargo"], Cargo.MEMBRO)
        self.assertEqual(r.data["cla"]["tag"], self.cla.tag)
        self.assertEqual(r.data["cla"]["total_membros"], 2)

    def test_nivel_abaixo_de_5_mesmo_com_cla_no_minimo(self):
        dar_nivel(self.user, 4)
        r = self.client.post(url_entrar(self.cla.tag))
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(codigos(r), ["nivel_insuficiente"])

    def test_respeita_o_nivel_minimo_do_cla(self):
        Cla.objects.filter(pk=self.cla.pk).update(nivel_minimo=10)
        r = self.client.post(url_entrar(self.cla.tag))
        self.assertEqual(codigos(r), ["nivel_insuficiente"])

        dar_nivel(self.user, 10)
        r = self.client.post(url_entrar(self.cla.tag))
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_ja_em_outro_cla(self):
        montar_cla(self.user, nome="Meu Clã")
        r = self.client.post(url_entrar(self.cla.tag))
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(codigos(r), ["ja_em_cla"])

    def test_entrar_de_novo_no_mesmo(self):
        self.client.post(url_entrar(self.cla.tag))
        r = self.client.post(url_entrar(self.cla.tag))
        self.assertEqual(codigos(r), ["ja_em_cla"])
        self.assertEqual(self.cla.membros.count(), 2)

    @override_settings(CLA_LIMITE_MEMBROS=2)
    def test_cla_cheio(self):
        MembroDoCla.objects.create(cla=self.cla, user=criar_aluno("segundo"))
        r = self.client.post(url_entrar(self.cla.tag))
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(codigos(r), ["cla_cheio"])
        self.assertEqual(self.cla.membros.count(), 2)

    def test_privado_nao_aceita_entrada_direta(self):
        privado = montar_cla(criar_aluno("lider2"), tipo=TipoDeCla.PRIVADO)
        r = self.client.post(url_entrar(privado.tag))
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(MembroDoCla.objects.filter(user=self.user).exists())

    def test_tag_inexistente(self):
        r = self.client.post(url_entrar("ZZZZZZZZ"))
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

    def test_sem_comunidades_join(self):
        nivel = NivelDeAcesso.objects.create(nome="sem_entrar_em_cla")
        nivel.permissoes.set(Permissao.objects.exclude(codename="comunidades.join"))
        self.user.nivel_de_acesso = nivel
        self.user.save(update_fields=["nivel_de_acesso"])
        self.user.invalidar_cache_permissoes()

        r = self.client.post(url_entrar(self.cla.tag))

        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(MembroDoCla.objects.filter(user=self.user).exists())

    def test_anonimo(self):
        self.client.force_authenticate(None)
        r = self.client.post(url_entrar(self.cla.tag))
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)


class SairTest(APITestCase):
    def setUp(self):
        self.lider = criar_aluno("lider")
        self.cla = montar_cla(self.lider)
        self.colider = criar_aluno("colider")
        MembroDoCla.objects.create(cla=self.cla, user=self.colider, cargo=Cargo.COLIDER)
        self.membro = criar_aluno("membro")
        MembroDoCla.objects.create(cla=self.cla, user=self.membro)

    def _sair(self, user):
        self.client.force_authenticate(user)
        return self.client.post(URL_SAIR)

    def test_membro_sai(self):
        r = self._sair(self.membro)
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(MembroDoCla.objects.filter(user=self.membro).exists())
        self.assertEqual(self.cla.membros.count(), 2)

    def test_colider_sai(self):
        r = self._sair(self.colider)
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)

    def test_lider_nao_sai_com_gente_no_cla(self):
        r = self._sair(self.lider)
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(codigos(r), ["lider_precisa_transferir"])
        self.assertTrue(MembroDoCla.objects.filter(user=self.lider).exists())

    def test_lider_sozinho_sai_e_o_cla_e_apagado(self):
        self._sair(self.membro)
        self._sair(self.colider)

        r = self._sair(self.lider)

        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Cla.objects.filter(pk=self.cla.pk).exists())

    def test_quem_saiu_pode_entrar_de_novo(self):
        dar_nivel(self.membro, 5)
        self._sair(self.membro)
        r = self.client.post(url_entrar(self.cla.tag))
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_sem_cla(self):
        r = self._sair(criar_aluno("solto"))
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(codigos(r), ["sem_cla"])

    def test_anonimo(self):
        r = self.client.post(URL_SAIR)
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)
