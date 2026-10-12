from datetime import timedelta

from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.clas.models import Cargo, Cla, ConviteDoCla, MembroDoCla, TipoDeCla
from apps.clas.tests.helpers import codigos, dar_nivel, montar_cla
from apps.contas.models import NivelDeAcesso, Permissao
from apps.contas.tests.helpers import criar_aluno


def url_convite(tag):
    return reverse("clas:convite", kwargs={"tag": tag})


def url_previa(token):
    return reverse("clas:previa-convite", kwargs={"token": token})


def url_aceitar(token):
    return reverse("clas:aceitar-convite", kwargs={"token": token})


class ConviteBase(APITestCase):
    def setUp(self):
        self.lider = criar_aluno("lider")
        self.cla = montar_cla(self.lider, tipo=TipoDeCla.PRIVADO, nome="Secretos")
        self.colider = criar_aluno("colider")
        MembroDoCla.objects.create(cla=self.cla, user=self.colider, cargo=Cargo.COLIDER)
        self.membro = criar_aluno("membro")
        MembroDoCla.objects.create(cla=self.cla, user=self.membro)

    def _gerar(self, user=None):
        self.client.force_authenticate(user or self.lider)
        return self.client.post(url_convite(self.cla.tag))

    def _token(self):
        return self._gerar().data["token"]


class GerarConviteTest(ConviteBase):
    def test_lider_gera(self):
        r = self._gerar()

        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        token = r.data["token"]
        self.assertGreaterEqual(len(token), 43)
        self.assertTrue(r.data["link"].endswith(f"/clas/convite/{token}"))

        convite = ConviteDoCla.objects.get()
        self.assertEqual(convite.criado_por, self.lider)
        self.assertAlmostEqual(
            convite.expira_em - timezone.now(), timedelta(days=7), delta=timedelta(minutes=1)
        )

    def test_banco_guarda_so_o_hash(self):
        token = self._token()
        convite = ConviteDoCla.objects.get()
        self.assertNotEqual(convite.token_hash, token)
        self.assertNotIn(token, str(ConviteDoCla.objects.values().get()))

    def test_colider_gera(self):
        self.assertEqual(self._gerar(self.colider).status_code, status.HTTP_201_CREATED)

    def test_membro_nao_gera(self):
        r = self._gerar(self.membro)
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(ConviteDoCla.objects.exists())

    def test_de_fora_leva_404(self):
        r = self._gerar(criar_aluno("estranho"))
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

    def test_cla_publico_nao_tem_convite(self):
        Cla.objects.filter(pk=self.cla.pk).update(tipo=TipoDeCla.PUBLICO)
        r = self._gerar()
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(codigos(r), ["cla_publico"])

    def test_gerar_de_novo_derruba_o_anterior(self):
        antigo = self._token()
        novo = self._token()

        self.assertEqual(
            self.client.get(url_previa(antigo)).status_code, status.HTTP_404_NOT_FOUND
        )
        self.assertEqual(self.client.get(url_previa(novo)).status_code, status.HTTP_200_OK)
        self.assertEqual(ConviteDoCla.objects.filter(revogado_em__isnull=True).count(), 1)


class RevogarConviteTest(ConviteBase):
    def test_revogar(self):
        token = self._token()
        r = self.client.delete(url_convite(self.cla.tag))

        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(
            self.client.get(url_previa(token)).status_code, status.HTTP_404_NOT_FOUND
        )

    def test_revogar_sem_convite_nao_quebra(self):
        self.client.force_authenticate(self.lider)
        r = self.client.delete(url_convite(self.cla.tag))
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)

    def test_membro_nao_revoga(self):
        token = self._token()
        self.client.force_authenticate(self.membro)
        r = self.client.delete(url_convite(self.cla.tag))

        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get(url_previa(token)).status_code, status.HTTP_200_OK)

    def test_virar_publico_derruba_o_link(self):
        token = self._token()
        self.client.patch(
            reverse("clas:cla-detalhe", kwargs={"tag": self.cla.tag}),
            {"tipo": "PUBLICO"},
            format="json",
        )
        self.client.force_authenticate(criar_aluno("novato"))
        self.assertEqual(
            self.client.post(url_aceitar(token)).status_code, status.HTTP_404_NOT_FOUND
        )


class PreviaTest(ConviteBase):
    def test_mostra_so_o_basico(self):
        token = self._token()
        self.client.force_authenticate(criar_aluno("curioso"))

        r = self.client.get(url_previa(token))

        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(
            r.data, {"nome": "Secretos", "bandeira": "guilda_1", "total_membros": 3}
        )

    def test_convites_invalidos_respondem_igual(self):
        token = self._token()
        revogado = token
        self._token()

        expirado = self._token()
        ConviteDoCla.objects.filter(revogado_em__isnull=True).update(
            criado_em=timezone.now() - timedelta(days=10),
            expira_em=timezone.now() - timedelta(seconds=1),
        )

        respostas = [
            self.client.get(url_previa(t)) for t in (revogado, expirado, "inventado", "x" * 300)
        ]
        for r in respostas:
            self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(len({str(r.data) for r in respostas}), 1)

    def test_anonimo(self):
        token = self._token()
        self.client.force_authenticate(None)
        r = self.client.get(url_previa(token))
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)


class AceitarConviteTest(ConviteBase):
    def setUp(self):
        super().setUp()
        self.token = self._token()
        self.novato = criar_aluno("novato")
        dar_nivel(self.novato, 5)
        self.client.force_authenticate(self.novato)

    def test_entra_como_membro(self):
        r = self.client.post(url_aceitar(self.token))

        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data["cargo"], Cargo.MEMBRO)
        self.assertEqual(r.data["cla"]["tag"], self.cla.tag)
        # agora enxerga o clã privado
        detalhe = self.client.get(reverse("clas:cla-detalhe", kwargs={"tag": self.cla.tag}))
        self.assertEqual(detalhe.status_code, status.HTTP_200_OK)

    def test_link_serve_pra_mais_de_um(self):
        self.client.post(url_aceitar(self.token))
        outro = criar_aluno("outro")
        dar_nivel(outro, 5)
        self.client.force_authenticate(outro)

        r = self.client.post(url_aceitar(self.token))

        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.cla.membros.count(), 5)

    def test_respeita_o_nivel_minimo(self):
        Cla.objects.filter(pk=self.cla.pk).update(nivel_minimo=10)
        r = self.client.post(url_aceitar(self.token))
        self.assertEqual(codigos(r), ["nivel_insuficiente"])

    @override_settings(CLA_LIMITE_MEMBROS=3)
    def test_cla_cheio(self):
        r = self.client.post(url_aceitar(self.token))
        self.assertEqual(codigos(r), ["cla_cheio"])

    def test_ja_em_cla(self):
        montar_cla(self.novato, nome="Meu")
        r = self.client.post(url_aceitar(self.token))
        self.assertEqual(codigos(r), ["ja_em_cla"])

    def test_expirado(self):
        ConviteDoCla.objects.update(
            criado_em=timezone.now() - timedelta(days=10),
            expira_em=timezone.now() - timedelta(seconds=1),
        )
        r = self.client.post(url_aceitar(self.token))
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(MembroDoCla.objects.filter(user=self.novato).exists())

    def test_sem_comunidades_join(self):
        nivel = NivelDeAcesso.objects.create(nome="sem_entrar_em_cla")
        nivel.permissoes.set(Permissao.objects.exclude(codename="comunidades.join"))
        self.novato.nivel_de_acesso = nivel
        self.novato.save(update_fields=["nivel_de_acesso"])
        self.novato.invalidar_cache_permissoes()

        r = self.client.post(url_aceitar(self.token))

        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_entrada_direta_continua_bloqueada(self):
        r = self.client.post(reverse("clas:entrar", kwargs={"tag": self.cla.tag}))
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
