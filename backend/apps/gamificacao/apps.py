from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class GamificacaoConfig(AppConfig):

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.gamificacao"
    label = "gamificacao"
    verbose_name = _("Gamificação")
