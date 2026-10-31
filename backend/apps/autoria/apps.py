from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class AutoriaConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.autoria"
    label = "autoria"
    verbose_name = _("Autoria")
