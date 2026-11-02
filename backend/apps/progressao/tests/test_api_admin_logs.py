from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.auditoria.models import AcaoAuditoria, RegistroDeAuditoria
from apps.auditoria.services import registrar
from apps.contas.tests.helpers import criar_admin, criar_aluno


class AdminLogsTests(APITestCase):
    def setUp(self):
        self.url = reverse("progressao:admin-logs")
        self.admin = criar_admin()

    def test_anonimo_recebe_401(self):
        self.assertEqual(
            self.client.get(self.url).status_code, status.HTTP_401_UNAUTHORIZED
        )

    def test_aluno_recebe_403(self):
        self.client.force_authenticate(criar_aluno())

        self.assertEqual(
            self.client.get(self.url).status_code, status.HTTP_403_FORBIDDEN
        )

    def test_pagina_de_dez_do_mais_novo_para_o_mais_antigo(self):
        for _ in range(12):
            registrar(AcaoAuditoria.LOGIN_OK, actor=self.admin)
        self.client.force_authenticate(self.admin)

        primeira = self.client.get(self.url)
        segunda = self.client.get(self.url, {"page": 2})

        self.assertEqual(primeira.status_code, status.HTTP_200_OK)
        self.assertEqual(primeira.data["count"], 12)
        self.assertEqual(len(primeira.data["results"]), 10)
        self.assertEqual(len(segunda.data["results"]), 2)
        datas = [linha["criado_em"] for linha in primeira.data["results"]]
        self.assertEqual(datas, sorted(datas, reverse=True))
        linha = primeira.data["results"][0]
        self.assertEqual(linha["usuario"], self.admin.nickname)
        self.assertEqual(linha["acao"], AcaoAuditoria.LOGIN_OK)

    def test_consulta_e_registrada_mas_nao_aparece_na_lista(self):
        registrar(AcaoAuditoria.LOGIN_OK, actor=self.admin)
        self.client.force_authenticate(self.admin)

        self.client.get(self.url)
        resposta = self.client.get(self.url)

        acoes = {linha["acao"] for linha in resposta.data["results"]}
        self.assertEqual(acoes, {AcaoAuditoria.LOGIN_OK})
        self.assertEqual(
            RegistroDeAuditoria.objects.filter(
                acao=AcaoAuditoria.ACESSO_AUDITORIA, actor=self.admin
            ).count(),
            2,
        )

    def test_dashboard_nao_traz_mais_logs(self):
        self.client.force_authenticate(self.admin)

        resposta = self.client.get(reverse("progressao:admin-dashboard"))

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertNotIn("logs_recentes", resposta.data)
        self.assertFalse(
            RegistroDeAuditoria.objects.filter(
                acao=AcaoAuditoria.ACESSO_AUDITORIA
            ).exists()
        )
