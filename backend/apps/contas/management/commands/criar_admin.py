"""Cria o administrador inicial da plataforma a partir de variaveis de ambiente.

Diferente do `createsuperuser`, coloca o usuario no nivel de sistema "Admin"
(o que libera o painel via `acesso_admin`) e ja marca o e-mail como verificado,
sem o que o login fica bloqueado. Idempotente: se o e-mail ja existe, nao mexe.

    ADMIN_EMAIL=... ADMIN_NICKNAME=... ADMIN_PASSWORD=... python manage.py criar_admin
"""

import os
from typing import Any

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.contas.models import NivelDeAcesso


class Command(BaseCommand):
    help = "Cria o admin inicial (ADMIN_EMAIL, ADMIN_NICKNAME, ADMIN_PASSWORD)."

    def handle(self, *args: Any, **options: Any) -> None:
        email = os.environ.get("ADMIN_EMAIL", "").strip()
        nickname = os.environ.get("ADMIN_NICKNAME", "").strip()
        senha = os.environ.get("ADMIN_PASSWORD", "")
        if not (email and nickname and senha):
            raise CommandError(
                "Defina ADMIN_EMAIL, ADMIN_NICKNAME e ADMIN_PASSWORD."
            )

        user_model = get_user_model()
        if user_model.objects.filter(email__iexact=email).exists():
            self.stdout.write(f"Admin {email} ja existe, nada a fazer.")
            return

        try:
            user_model._meta.get_field("nickname").clean(nickname, None)
        except ValidationError as erro:
            raise CommandError("Nickname invalido: " + " ".join(erro.messages)) from erro

        try:
            validate_password(senha)
        except ValidationError as erro:
            raise CommandError("Senha fraca: " + " ".join(erro.messages)) from erro

        nivel = NivelDeAcesso.objects.filter(nome="Admin", sistema=True).first()
        if nivel is None:
            raise CommandError("Nivel 'Admin' nao encontrado; rode o migrate antes.")

        with transaction.atomic():
            admin = user_model.objects.create_user(
                email=email,
                nickname=nickname,
                password=senha,
                role=user_model.Role.ADMIN,
                nivel_de_acesso=nivel,
                email_verified_at=timezone.now(),
            )
        self.stdout.write(self.style.SUCCESS(f"Admin {admin.email} criado."))
