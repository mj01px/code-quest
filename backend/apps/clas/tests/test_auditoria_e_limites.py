from unittest import mock

from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.throttling import SimpleRateThrottle

from apps.auditoria.models import AcaoAuditoria, RegistroDeAuditoria
from apps.clas.models import Cargo, MembroDoCla, TipoDeCla
from apps.clas.tests.helpers import dar_nivel, montar_cla
from apps.contas.lgpd import anonimizar_conta, exportar_dados
from apps.contas.tests.helpers import criar_aluno


def logs(acao):
    return list(RegistroDeAuditoria.objects.filter(acao=acao))


class AuditoriaTest(APITestCase):
    def setUp(self):
        self.lider = criar_aluno("lider")
        dar_nivel(self.lider, 5)

    def _criar(self, **extra):
        self.client.force_authenticate(self.lider)
        dados = {"nome": "Os Bugados", "bandeira": "guilda_1", **extra}
        return self.client.post(reverse("clas:clas"), dados, format="json")

    def test_criar(self):
        tag = self._criar().data["tag"]
        [registro] = logs(AcaoAuditoria.CLA_CRIADO)
        self.assertEqual(registro.actor, self.lider)
        self.assertEqual(registro.alvo_tipo, "cla")
        self.assertEqual(registro.metadata["tag"], tag)

    def test_editar_registra_so_os_campos_que_mudaram(self):
        tag = self._criar(bandeira="guilda_1").data["tag"]
        url = reverse("clas:cla-detalhe", kwargs={"tag": tag})

        self.client.patch(url, {"bandeira": "guilda_1"}, format="json")
        self.assertEqual(logs(AcaoAuditoria.CLA_EDITADO), [])

        self.client.patch(url, {"bandeira": "guilda_2", "descricao": "x"}, format="json")
        [registro] = logs(AcaoAuditoria.CLA_EDITADO)
        self.assertCountEqual(registro.metadata["campos"], ["bandeira", "descricao"])

    def test_entrar_sair_e_apagar(self):
        tag = self._criar().data["tag"]
        novato = criar_aluno("novato")
        dar_nivel(novato, 5)
        self.client.force_authenticate(novato)
        self.client.post(reverse("clas:entrar", kwargs={"tag": tag}))
        self.client.post(reverse("clas:sair"))
        self.client.force_authenticate(self.lider)
        self.client.post(reverse("clas:sair"))

        [entrou] = logs(AcaoAuditoria.CLA_ENTROU)
        self.assertEqual(entrou.metadata["via"], "direta")
        self.assertEqual(len(logs(AcaoAuditoria.CLA_SAIU)), 2)
        [apagado] = logs(AcaoAuditoria.CLA_APAGADO)
        self.assertEqual(apagado.metadata["motivo"], "ultimo_membro_saiu")
        self.assertEqual(apagado.metadata["tag"], tag)

    def test_gestao_de_membros(self):
        cla = montar_cla(self.lider)
        membro = MembroDoCla.objects.create(cla=cla, user=criar_aluno("membro"))
        outro = MembroDoCla.objects.create(cla=cla, user=criar_aluno("outro"))
        self.client.force_authenticate(self.lider)

        def url(alvo):
            return reverse("clas:membro", kwargs={"tag": cla.tag, "membro_id": alvo.pk})

        self.client.patch(url(membro), {"cargo": "COLIDER"}, format="json")
        self.client.patch(url(membro), {"cargo": "MEMBRO"}, format="json")
        self.client.delete(url(outro))
        self.client.post(
            reverse("clas:lideranca", kwargs={"tag": cla.tag}),
            {"membro_id": str(membro.pk)},
            format="json",
        )

        [promovido] = logs(AcaoAuditoria.CLA_MEMBRO_PROMOVIDO)
        self.assertEqual(promovido.metadata["usuario_id"], str(membro.user_id))
        self.assertEqual(len(logs(AcaoAuditoria.CLA_MEMBRO_REBAIXADO)), 1)
        [expulso] = logs(AcaoAuditoria.CLA_MEMBRO_EXPULSO)
        self.assertEqual(expulso.metadata["usuario_id"], str(outro.user_id))
        [transferida] = logs(AcaoAuditoria.CLA_LIDERANCA_TRANSFERIDA)
        self.assertEqual(transferida.metadata["motivo"], "manual")
        self.assertEqual(transferida.metadata["para_usuario_id"], str(membro.user_id))

    def test_acao_negada_nao_gera_log(self):
        cla = montar_cla(self.lider)
        membro = MembroDoCla.objects.create(cla=cla, user=criar_aluno("membro"))
        self.client.force_authenticate(membro.user)
        r = self.client.post(
            reverse("clas:lideranca", kwargs={"tag": cla.tag}),
            {"membro_id": str(membro.pk)},
            format="json",
        )
        self.assertNotEqual(r.status_code, status.HTTP_200_OK)
        self.assertFalse(
            RegistroDeAuditoria.objects.filter(acao__startswith="CLA_").exists()
        )

    def test_convite_nunca_vai_pro_log(self):
        tag = self._criar(tipo="PRIVADO").data["tag"]
        url = reverse("clas:convite", kwargs={"tag": tag})
        token = self.client.post(url).data["token"]
        token2 = self.client.post(url).data["token"]
        novato = criar_aluno("novato")
        dar_nivel(novato, 5)
        self.client.force_authenticate(novato)
        self.client.post(reverse("clas:aceitar-convite", kwargs={"token": token2}))
        self.client.force_authenticate(self.lider)
        self.client.delete(url)

        gerados = logs(AcaoAuditoria.CLA_CONVITE_GERADO)
        self.assertEqual([g.metadata["substituiu_anterior"] for g in gerados], [True, False])
        self.assertEqual(len(logs(AcaoAuditoria.CLA_CONVITE_REVOGADO)), 1)
        self.assertEqual(logs(AcaoAuditoria.CLA_ENTROU)[0].metadata["via"], "convite")

        tudo = str(list(RegistroDeAuditoria.objects.values()))
        self.assertNotIn(token, tudo)
        self.assertNotIn(token2, tudo)

    def test_virar_publico_registra_a_revogacao(self):
        tag = self._criar(tipo="PRIVADO").data["tag"]
        self.client.post(reverse("clas:convite", kwargs={"tag": tag}))
        self.client.patch(
            reverse("clas:cla-detalhe", kwargs={"tag": tag}),
            {"tipo": "PUBLICO"},
            format="json",
        )
        [revogado] = logs(AcaoAuditoria.CLA_CONVITE_REVOGADO)
        self.assertEqual(revogado.metadata["motivo"], "virou_publico")

    def test_conta_excluida(self):
        cla = montar_cla(self.lider)
        colider = MembroDoCla.objects.create(
            cla=cla, user=criar_aluno("colider"), cargo=Cargo.COLIDER
        )

        anonimizar_conta(self.lider)

        [transferida] = logs(AcaoAuditoria.CLA_LIDERANCA_TRANSFERIDA)
        self.assertEqual(transferida.metadata["motivo"], "conta_excluida")
        self.assertEqual(transferida.metadata["para_usuario_id"], str(colider.user_id))
        # a limpeza da exclusão também pega os logs do clã
        self.assertEqual(transferida.actor_email_snapshot, "")


class ExportacaoLgpdTest(APITestCase):
    def test_sem_cla(self):
        self.assertIsNone(exportar_dados(criar_aluno())["cla"])

    def test_com_cla(self):
        lider = criar_aluno("lider")
        cla = montar_cla(lider, tipo=TipoDeCla.PRIVADO)
        dados = exportar_dados(lider)["cla"]
        self.assertEqual(dados["tag"], cla.tag)
        self.assertEqual(dados["nome"], cla.nome)
        self.assertEqual(dados["cargo"], Cargo.LIDER)


TAXAS_DE_TESTE = {"clas_escrita": "2/min", "clas_busca": "2/min", "convite": "2/min"}


class LimitesTest(APITestCase):
    def setUp(self):
        patch = mock.patch.dict(SimpleRateThrottle.THROTTLE_RATES, TAXAS_DE_TESTE)
        patch.start()
        self.addCleanup(patch.stop)
        cache.clear()
        self.user = criar_aluno()
        self.client.force_authenticate(self.user)

    def test_busca(self):
        url = reverse("clas:clas")
        for _ in range(2):
            self.assertEqual(self.client.get(url).status_code, status.HTTP_200_OK)
        self.assertEqual(
            self.client.get(url).status_code, status.HTTP_429_TOO_MANY_REQUESTS
        )

    def test_escrita(self):
        url = reverse("clas:sair")
        for _ in range(2):
            self.client.post(url)
        self.assertEqual(
            self.client.post(url).status_code, status.HTTP_429_TOO_MANY_REQUESTS
        )

    def test_convite(self):
        url = reverse("clas:previa-convite", kwargs={"token": "chute"})
        for _ in range(2):
            self.assertEqual(self.client.get(url).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            self.client.get(url).status_code, status.HTTP_429_TOO_MANY_REQUESTS
        )

    def test_baldes_separados(self):
        busca = reverse("clas:clas")
        for _ in range(3):
            self.client.get(busca)
        self.assertNotEqual(
            self.client.post(reverse("clas:sair")).status_code,
            status.HTTP_429_TOO_MANY_REQUESTS,
        )

    def test_leitura_nao_usa_balde_de_escrita(self):
        cla = montar_cla(self.user)
        url = reverse("clas:cla-detalhe", kwargs={"tag": cla.tag})
        for _ in range(3):
            self.assertEqual(self.client.get(url).status_code, status.HTTP_200_OK)
