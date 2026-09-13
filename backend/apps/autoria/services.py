from django.db.models import QuerySet

from apps.trilhas.models import Exercicio


def exercicios_para_autoria() -> QuerySet[Exercicio]:
    """Todos os exercícios, sem filtro editorial.

    A rota de autoria não usa `publicados()` de propósito: quem tem
    `trilhas.view_solution` precisa revisar a solução antes de publicar, e
    filtrar por status deixaria a rota inútil justo nesse momento.
    """
    return Exercicio.objects.select_related("trilha").all()
