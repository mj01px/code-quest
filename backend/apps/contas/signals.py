from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import NivelDeAcesso, User

# Cada papel embutido tem um nível de sistema homônimo (semeado na migração).
_NIVEL_POR_PAPEL = {
    User.Role.STUDENT: "Aluno",
    User.Role.AUTHOR: "Autor",
    User.Role.ADMIN: "Admin",
}


@receiver(post_save, sender=User)
def atribuir_nivel_padrao(sender, instance, created, **kwargs):
    """Usuário novo recebe o nível de sistema do seu papel, se ainda não tem um.

    Usa `update()` para não redisparar o post_save nem tocar outros campos. Sem
    o nível semeado (ex.: banco recém-criado antes da migração), não faz nada — a
    leitura de permissões cai no padrão do papel de qualquer forma.
    """
    if not created or instance.nivel_de_acesso_id is not None:
        return
    nome = _NIVEL_POR_PAPEL.get(instance.role)
    if nome is None:
        return
    nivel = NivelDeAcesso.objects.filter(nome=nome, sistema=True).first()
    if nivel is not None:
        User.objects.filter(pk=instance.pk).update(nivel_de_acesso=nivel)
        instance.nivel_de_acesso = nivel
