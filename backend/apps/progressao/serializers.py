from rest_framework import serializers

from apps.correcao.serializers import CorrecaoSerializer
from apps.gamificacao.serializers import MinhaCriaturaSerializer

from .models import EventoXP, Nivel, ProgressoCriatura


class NivelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Nivel
        fields = ("numero", "titulo", "xp_necessario")


class ProgressoSerializer(serializers.ModelSerializer):
    criatura = MinhaCriaturaSerializer(source="user_creature", read_only=True)
    nivel = NivelSerializer(read_only=True)
    proximo_nivel = NivelSerializer(read_only=True, allow_null=True)
    xp_no_nivel = serializers.IntegerField(read_only=True)
    xp_para_o_proximo = serializers.IntegerField(read_only=True, allow_null=True)

    class Meta:
        model = ProgressoCriatura
        fields = (
            "criatura",
            "xp_total",
            "nivel",
            "proximo_nivel",
            "xp_no_nivel",
            "xp_para_o_proximo",
            "atualizado_em",
        )


class SequenciaSerializer(serializers.Serializer):
    atual = serializers.IntegerField(read_only=True)
    recorde = serializers.IntegerField(read_only=True)
    feito_hoje = serializers.BooleanField(read_only=True)
    ultimo_dia = serializers.DateField(read_only=True, allow_null=True)


class DiaSerializer(serializers.Serializer):
    """Um dia da janela de 7 dias de `por_dia`; as subclasses somam os valores."""

    dia = serializers.CharField(read_only=True)
    data = serializers.DateField(read_only=True)


class AtividadeDiaSerializer(DiaSerializer):
    xp = serializers.IntegerField(read_only=True)


class DashboardSerializer(serializers.Serializer):
    xp_total = serializers.IntegerField(read_only=True)
    exercicios_concluidos = serializers.IntegerField(read_only=True)
    sequencia_atual = serializers.IntegerField(read_only=True)
    trilhas_iniciadas = serializers.IntegerField(read_only=True)
    atividade_semanal = AtividadeDiaSerializer(many=True, read_only=True)


class NovosUsuariosDiaSerializer(DiaSerializer):
    quantidade = serializers.IntegerField(read_only=True)


class SubmissoesDiaSerializer(DiaSerializer):
    aprovadas = serializers.IntegerField(read_only=True)
    rejeitadas = serializers.IntegerField(read_only=True)


class LogRecenteSerializer(serializers.Serializer):
    """Só data, quem e o quê: IP, user agent e metadata ficam na auditoria."""

    id = serializers.UUIDField(read_only=True)
    criado_em = serializers.DateTimeField(source="created_at", read_only=True)
    usuario = serializers.SerializerMethodField()
    acao = serializers.CharField(read_only=True)
    acao_rotulo = serializers.CharField(source="get_acao_display", read_only=True)
    detalhes = serializers.CharField(read_only=True)

    def get_usuario(self, obj) -> str:
        # Sem autor = requisição anônima (ex.: login com e-mail inexistente).
        return obj.actor.nickname if obj.actor else "Anônimo"


class DashboardAdminSerializer(serializers.Serializer):
    total_usuarios = serializers.IntegerField(read_only=True)
    trilhas_publicadas = serializers.IntegerField(read_only=True)
    fila_revisao = serializers.IntegerField(read_only=True)
    submissoes_judge = serializers.IntegerField(read_only=True)
    novos_usuarios_semana = NovosUsuariosDiaSerializer(many=True, read_only=True)
    submissoes_semana = SubmissoesDiaSerializer(many=True, read_only=True)
    logs_recentes = LogRecenteSerializer(many=True, read_only=True)


class SequenciaConclusaoSerializer(serializers.Serializer):
    atual = serializers.IntegerField(read_only=True)
    recorde = serializers.IntegerField(read_only=True)
    aumentou = serializers.BooleanField(read_only=True)


class ResultadoXPSerializer(serializers.Serializer):
    xp_ganho = serializers.IntegerField(read_only=True)
    ja_concluido = serializers.BooleanField(read_only=True)
    subiu_de_nivel = serializers.BooleanField(read_only=True)
    # Não diz que evoluiu: diz que dá para evoluir. Quem evolui é o aluno, na
    # tela de configurações, um estágio por vez.
    pode_evoluir = serializers.BooleanField(read_only=True)
    progresso = ProgressoSerializer(read_only=True)
    sequencia = SequenciaConclusaoSerializer(read_only=True)


class ConclusaoSerializer(ResultadoXPSerializer):
    aprovado = serializers.BooleanField(read_only=True)
    correcao = CorrecaoSerializer(read_only=True, allow_null=True)


class TrilhaIniciadaSerializer(serializers.Serializer):
    """A trilha do ponto de vista de quem acabou de entrar nela.

    Nasce da rota de iniciar e responde a única pergunta que a tela faz depois
    do clique: em que trilha estou e desde quando.
    """

    trilha = serializers.SlugField(source="trilha.slug", read_only=True)
    iniciada_em = serializers.DateTimeField(read_only=True)


class ExercicioConcluidoSerializer(serializers.ModelSerializer):
    """Só o que a tela precisa para marcar o exercício como feito.

    Nasce de `EventoXP` e nomeia campo a campo, então nada de `Exercicio` vaza
    por aqui, `solucao_autor` inclusive.
    """

    trilha_slug = serializers.SlugField(source="exercicio.trilha.slug", read_only=True)
    exercicio_slug = serializers.SlugField(source="exercicio.slug", read_only=True)

    class Meta:
        model = EventoXP
        fields = ["trilha_slug", "exercicio_slug", "xp", "criado_em"]
