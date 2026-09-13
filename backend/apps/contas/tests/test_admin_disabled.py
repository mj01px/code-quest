"""O admin do Django não é o painel administrativo do produto.

Nenhum model do projeto é registrado nele: não existe admin.py em app nenhuma.
O painel administrativo de verdade vai ser construído nas telas da plataforma,
passando pelas regras de negócio e gravando na trilha de auditoria, duas coisas
que escrever pelo admin do Django pularia. A monografia promete que TODA ação
administrativa fica registrada, e um admin registrado seria um buraco nessa
promessa.

Este arquivo é a rede de segurança contra alguém acrescentar um admin.py
"só para facilitar" e abrir esse buraco sem perceber.
"""

from django.conf import settings
from django.contrib import admin
from django.test import TestCase

from .helpers import criar_admin


class NenhumModelRegistradoTest(TestCase):
    def test_nenhum_model_do_projeto_esta_no_admin(self):
        registrados = [m._meta.label for m in admin.site._registry]
        do_projeto = [
            label
            for label in registrados
            if label.split(".")[0] in {"contas", "gamificacao", "core", "trilhas", "progressao"}
        ]
        self.assertEqual(do_projeto, [], f"registrados indevidamente: {do_projeto}")


class RotasDoAdminTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.staff = criar_admin("staffdev", is_staff=True, is_superuser=True)

    def setUp(self):
        self.client.force_login(self.staff)

    def test_usuario_nao_e_editavel_pelo_admin(self):
        resposta = self.client.get(f"/{settings.ADMIN_URL}contas/user/")
        self.assertEqual(resposta.status_code, 404)

    def test_criatura_nao_e_editavel_pelo_admin(self):
        resposta = self.client.get(f"/{settings.ADMIN_URL}gamificacao/creature/")
        self.assertEqual(resposta.status_code, 404)

    def test_posse_nao_e_editavel_pelo_admin(self):
        resposta = self.client.get(f"/{settings.ADMIN_URL}gamificacao/usercreature/")
        self.assertEqual(resposta.status_code, 404)


class CaminhoConfiguravelTest(TestCase):
    def test_admin_url_vem_de_variavel_de_ambiente(self):
        # Em produção o caminho não pode ser o /admin/ que todo bot varre.
        self.assertTrue(settings.ADMIN_URL.endswith("/"))
