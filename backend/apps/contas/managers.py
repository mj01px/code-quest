from django.contrib.auth.base_user import BaseUserManager
from django.utils.translation import gettext_lazy as _


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, nickname, password, **extra_fields):
        if not email:
            raise ValueError(_("O e-mail é obrigatório."))
        if not nickname:
            raise ValueError(_("O nickname é obrigatório."))

        user = self.model(
            email=self.normalize_email(email),
            nickname=nickname,
            **extra_fields,
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, nickname, password=None, **extra_fields):
        extra_fields.setdefault("role", self.model.Role.STUDENT)
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, nickname, password, **extra_fields)

    def create_superuser(self, email, nickname, password=None, **extra_fields):
        extra_fields.setdefault("role", self.model.Role.ADMIN)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError(_("Um superusuário precisa ter is_staff=True."))
        if extra_fields.get("is_superuser") is not True:
            raise ValueError(_("Um superusuário precisa ter is_superuser=True."))

        return self._create_user(email, nickname, password, **extra_fields)
