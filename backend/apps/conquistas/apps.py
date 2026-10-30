from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class ConquistasConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.conquistas"
    label = "conquistas"
    verbose_name = _("Conquistas")

    def ready(self) -> None:
        from . import signals  # noqa: F401
