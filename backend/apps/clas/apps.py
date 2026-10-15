from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class ClasConfig(AppConfig):

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.clas"
    label = "clas"
    verbose_name = _("Clãs")

    def ready(self):
        from . import signals  # noqa: F401
