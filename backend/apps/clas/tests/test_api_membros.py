from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.clas.models import Cargo, MembroDoCla, TipoDeCla
from apps.clas.tests.helpers import codigos, dar_nivel, montar_cla
from apps.contas.tests.helpers import criar_aluno


class ClaMontadoMixin:
    """Clã com líder, dois co-líderes e dois membros."""

    tipo = TipoDeCla.PUBLICO

    def setUp(self):
        self.lider_user = criar_aluno("lider")
        self.cla = montar_cla(self.lider_user, tipo=self.tipo)
        self.lider = self.cla.membros.get()
        self.colider = self._entrar("colider", Cargo.COLIDER)
        self.colider2 = self._entrar("colider2", Cargo.COLIDER)
        self.membro = self._entrar("membro", Cargo.MEMBRO)
        self.membro2 = self._entrar("membro2", Cargo.MEMBRO)

    def _entrar(self, nickname, cargo):
        return MembroDoCla.objects.create(
            cla=self.cla, user=criar_aluno(nickname), cargo=cargo
        )

    def _cargo(self, membro):
        membro.refresh_from_db()
        return membro.cargo

    def _url_membro(self, alvo):
        return reverse(
            "clas:membro", kwargs={"tag": self.cla.tag, "membro_id": alvo.pk}
        )

    def _patch(self, ator, alvo, cargo):
        self.client.force_authenticate(ator.user)
        return self.client.patch(self._url_membro(alvo), {"cargo": cargo}, format="json")

    def _delete(self, ator, alvo):
        self.client.force_authenticate(ator.user)
        return self.client.delete(self._url_membro(alvo))

    def _transferir(self, ator, alvo):
        self.client.force_authenticate(ator.user)
        return self.client.post(
            reverse("clas:lideranca", kwargs={"tag": self.cla.tag}),
            {"membro_id": str(alvo.pk)},
            format="json",
        )


class ListarMembrosTest(ClaMontadoMixin, APITestCase):
    def test_ordem_por_cargo_e_entrada(self):
        self.client.force_authenticate(criar_aluno("visitante"))
        r = self.client.get(reverse("clas:membros", kwargs={"tag": self.cla.tag}))

        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [m["nickname"] for m in r.data],
            ["lider", "colider", "colider2", "membro", "membro2"],
        )
        self.assertEqual(
            set(r.data[0]), {"id", "nickname", "cargo", "cargo_rotulo", "entrou_em"}
        )

    def test_nao_expoe_email(self):
        self.client.force_authenticate(criar_aluno("visitante"))
        r = self.client.get(reverse("clas:membros", kwargs={"tag": self.cla.tag}))
        self.assertNotIn("@", str(r.data))


class ListarMembrosPrivadoTest(ClaMontadoMixin, APITestCase):
    tipo = TipoDeCla.PRIVADO

    def test_membro_ve(self):
        self.client.force_authenticate(self.membro.user)
        r = self.client.get(reverse("clas:membros", kwargs={"tag": self.cla.tag}))
        self.assertEqual(len(r.data), 5)

    def test_de_fora_leva_404(self):
        self.client.force_authenticate(criar_aluno("visitante"))
        r = self.client.get(reverse("clas:membros", kwargs={"tag": self.cla.tag}))
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

    def test_de_fora_nao_gerencia(self):
        estranho = montar_cla(criar_aluno("outro_lider")).membros.get()
        r = self._delete(estranho, self.membro)
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(MembroDoCla.objects.filter(pk=self.membro.pk).exists())


class PromoverRebaixarTest(ClaMontadoMixin, APITestCase):
    def test_lider_promove_membro(self):
        r = self._patch(self.lider, self.membro, Cargo.COLIDER)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["cargo"], Cargo.COLIDER)
        self.assertEqual(self._cargo(self.membro), Cargo.COLIDER)

    def test_colider_promove_membro(self):
        r = self._patch(self.colider, self.membro, Cargo.COLIDER)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(self._cargo(self.membro), Cargo.COLIDER)

    def test_lider_rebaixa_colider(self):
        r = self._patch(self.lider, self.colider, Cargo.MEMBRO)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(self._cargo(self.colider), Cargo.MEMBRO)

    def test_colider_nao_rebaixa_outro_colider(self):
        r = self._patch(self.colider, self.colider2, Cargo.MEMBRO)
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(codigos(r), ["cargo_insuficiente"])
        self.assertEqual(self._cargo(self.colider2), Cargo.COLIDER)

    def test_ninguem_rebaixa_o_lider(self):
        for ator in (self.colider, self.membro):
            with self.subTest(ator=ator.user.nickname):
                r = self._patch(ator, self.lider, Cargo.MEMBRO)
                self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self._cargo(self.lider), Cargo.LIDER)

    def test_membro_nao_promove(self):
        r = self._patch(self.membro, self.membro2, Cargo.COLIDER)
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self._cargo(self.membro2), Cargo.MEMBRO)

    def test_nao_promove_a_lider_por_aqui(self):
        r = self._patch(self.lider, self.colider, Cargo.LIDER)
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self._cargo(self.colider), Cargo.COLIDER)

    def test_nao_mexe_no_proprio_cargo(self):
        r = self._patch(self.colider, self.colider, Cargo.MEMBRO)
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(codigos(r), ["acao_em_si_mesmo"])

    def test_membro_de_outro_cla_da_404(self):
        outro = montar_cla(criar_aluno("outro_lider")).membros.get()
        r = self._patch(self.lider, outro, Cargo.COLIDER)
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self._cargo(outro), Cargo.LIDER)

    def test_de_fora_de_cla_publico_leva_403(self):
        estranho = montar_cla(criar_aluno("outro_lider")).membros.get()
        r = self._patch(estranho, self.membro, Cargo.COLIDER)
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)


class ExpulsarTest(ClaMontadoMixin, APITestCase):
    def _existe(self, membro):
        return MembroDoCla.objects.filter(pk=membro.pk).exists()

    def test_lider_expulsa_membro_e_colider(self):
        for alvo in (self.membro, self.colider):
            with self.subTest(alvo=alvo.user.nickname):
                r = self._delete(self.lider, alvo)
                self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
                self.assertFalse(self._existe(alvo))

    def test_colider_expulsa_membro(self):
        r = self._delete(self.colider, self.membro)
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(self._existe(self.membro))

    def test_colider_nao_expulsa_colider_nem_lider(self):
        for alvo in (self.colider2, self.lider):
            with self.subTest(alvo=alvo.user.nickname):
                r = self._delete(self.colider, alvo)
                self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
                self.assertTrue(self._existe(alvo))

    def test_membro_nao_expulsa(self):
        r = self._delete(self.membro, self.membro2)
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(self._existe(self.membro2))

    def test_nao_se_expulsa(self):
        r = self._delete(self.lider, self.lider)
        self.assertEqual(codigos(r), ["acao_em_si_mesmo"])
        self.assertTrue(self._existe(self.lider))

    def test_expulso_pode_voltar(self):
        self._delete(self.lider, self.membro)
        dar_nivel(self.membro.user, 5)
        self.client.force_authenticate(self.membro.user)
        r = self.client.post(reverse("clas:entrar", kwargs={"tag": self.cla.tag}))
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)


class TransferirLiderancaTest(ClaMontadoMixin, APITestCase):
    def test_lider_transfere_e_vira_colider(self):
        r = self._transferir(self.lider, self.membro)

        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["cargo"], Cargo.LIDER)
        self.assertEqual(self._cargo(self.membro), Cargo.LIDER)
        self.assertEqual(self._cargo(self.lider), Cargo.COLIDER)
        self.assertEqual(self.cla.membros.filter(cargo=Cargo.LIDER).count(), 1)

    def test_transfere_pra_colider(self):
        self._transferir(self.lider, self.colider)
        self.assertEqual(self._cargo(self.colider), Cargo.LIDER)

    def test_so_o_lider_transfere(self):
        for ator in (self.colider, self.membro):
            with self.subTest(ator=ator.user.nickname):
                r = self._transferir(ator, self.membro2)
                self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self._cargo(self.lider), Cargo.LIDER)

    def test_nao_transfere_pra_si_mesmo(self):
        r = self._transferir(self.lider, self.lider)
        self.assertEqual(codigos(r), ["acao_em_si_mesmo"])

    def test_nao_transfere_pra_quem_e_de_fora(self):
        outro = montar_cla(criar_aluno("outro_lider")).membros.get()
        r = self._transferir(self.lider, outro)
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self._cargo(self.lider), Cargo.LIDER)

    def test_membro_id_invalido(self):
        self.client.force_authenticate(self.lider.user)
        r = self.client.post(
            reverse("clas:lideranca", kwargs={"tag": self.cla.tag}),
            {"membro_id": "nao-e-uuid"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_ex_lider_pode_sair_depois(self):
        self._transferir(self.lider, self.colider)
        r = self.client.post(reverse("clas:sair"))
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
