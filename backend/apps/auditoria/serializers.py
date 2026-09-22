from rest_framework import serializers

from .models import RegistroDeAuditoria


class RegistroDeAuditoriaSerializer(serializers.ModelSerializer):
    actor_nickname = serializers.CharField(
        source="actor.nickname", read_only=True, default=None
    )

    class Meta:
        model = RegistroDeAuditoria
        fields = [
            "id",
            "created_at",
            "acao",
            "actor",
            "actor_nickname",
            "actor_email_snapshot",
            "alvo_tipo",
            "alvo_id",
            "ip",
            "user_agent",
            "metadata",
        ]
        read_only_fields = fields


class AtividadeSerializer(serializers.ModelSerializer):
    """Versão enxuta e amigável para o histórico do próprio titular."""

    acao_rotulo = serializers.CharField(source="get_acao_display", read_only=True)

    class Meta:
        model = RegistroDeAuditoria
        fields = ["id", "acao", "acao_rotulo", "created_at", "ip"]
        read_only_fields = fields
