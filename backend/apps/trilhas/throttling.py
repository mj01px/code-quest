import ipaddress
from functools import cache

from django.conf import settings
from rest_framework.request import Request
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

Rede = ipaddress.IPv4Network | ipaddress.IPv6Network


@cache
def _redes_isentas() -> tuple[Rede, ...]:
    return tuple(
        ipaddress.ip_network(rede, strict=False)
        for rede in settings.THROTTLE_REDES_ISENTAS
    )


class CatalogoThrottle(ScopedRateThrottle):
    """O escopo do catálogo, menos para quem renderiza as telas por dentro.

    O `next build` e a revalidação das páginas leem o catálogo em rajada, todos
    do mesmo IP (o servidor Next), e estourariam o limite público. Esses pedidos
    chegam sem X-Forwarded-For, então `get_ident` devolve o REMOTE_ADDR do Next.
    Pedido que vem da internet passa pelo Nginx, que sobrescreve o cabeçalho com
    o IP do aluno, então nunca cai numa rede isenta. Lista vazia (o padrão) não
    isenta ninguém.
    """

    def allow_request(self, request: Request, view: APIView) -> bool:
        redes = _redes_isentas()
        if redes:
            try:
                ip = ipaddress.ip_address(self.get_ident(request))
            except ValueError:
                ip = None
            if ip is not None and any(ip in rede for rede in redes):
                return True
        return super().allow_request(request, view)
