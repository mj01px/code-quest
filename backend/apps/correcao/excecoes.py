from django.utils.translation import gettext_lazy as _
from rest_framework import status
from rest_framework.exceptions import APIException

#erro pra mostrar quando o corretor estiver fora do ar
class CorretorIndisponivel(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = _("A correção está fora do ar agora. Tente de novo em instantes.")
    default_code = "corretor_indisponivel"