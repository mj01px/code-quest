from django.utils.translation import gettext_lazy as _
from rest_framework import status
from rest_framework.exceptions import APIException, Throttled


#erro pra mostrar quando o corretor estiver fora do ar
class CorretorIndisponivel(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = _("A correção está fora do ar agora. Tente de novo em instantes.")
    default_code = "corretor_indisponivel"


# Disjuntor da cota diária do RapidAPI: 503 porque o limite é do serviço, não
# do pedido do aluno.
class CotaDiariaEsgotada(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = _("A correção atingiu o limite de hoje. Tente de novo amanhã.")
    default_code = "limite_diario"


# Teto diário por usuário: 429, e a mensagem já diz quando volta.
class CotaDoUsuarioEsgotada(Throttled):
    default_detail = _("Você usou todas as correções de hoje. Tente de novo amanhã.")
    default_code = "limite_do_usuario"
