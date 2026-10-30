from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class RankingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.ranking"
    label = "ranking"
    verbose_name = _("Ranking")
