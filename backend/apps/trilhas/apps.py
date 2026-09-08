from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class TrilhasConfig(AppConfig):

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.trilhas"
    label = "trilhas"
    verbose_name = _("Trilhas")
