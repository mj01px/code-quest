from django.urls import path

from .views import EuView, LoginView, RegistrarView, RenovarView

app_name = "contas"

urlpatterns = [
    path("auth/registrar/", RegistrarView.as_view(), name="registrar"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/renovar/", RenovarView.as_view(), name="renovar"),
    path("auth/eu/", EuView.as_view(), name="eu"),
]
