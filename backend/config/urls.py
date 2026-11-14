from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

api = [
    path("", include("apps.autoria.urls")),
    path("", include("apps.contas.urls")),
    path("", include("apps.auditoria.urls")),
    path("", include("apps.gamificacao.urls")),
    path("", include("apps.trilhas.urls")),
    path("", include("apps.progressao.urls")),
    path("", include("apps.correcao.urls")),
    path("", include("apps.clas.urls")),
    path("", include("apps.conquistas.urls")),
    path("", include("apps.ranking.urls")),
]

urlpatterns = [
    path(settings.ADMIN_URL, admin.site.urls),
    path("api/v1/", include(api)),
]

# Swagger e schema entregam o mapa de todas as rotas: so com API_DOCS=True
# (padrao: o mesmo que DEBUG, ou seja, ligado no dev e desligado em producao).
if settings.API_DOCS:
    urlpatterns += [
        path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
        path(
            "api/docs/",
            SpectacularSwaggerView.as_view(url_name="schema"),
            name="docs",
        ),
    ]
