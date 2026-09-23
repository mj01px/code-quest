from django.urls import path

from .views import AuditoriaListView, MinhaAtividadeView

app_name = "auditoria"

urlpatterns = [
    path("auditoria/", AuditoriaListView.as_view(), name="lista"),
    path("auth/eu/atividade/", MinhaAtividadeView.as_view(), name="minha-atividade"),
]
