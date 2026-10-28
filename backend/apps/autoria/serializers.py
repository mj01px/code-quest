from typing import Any

from django.db import IntegrityError, transaction
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied

from apps.correcao.models import CasoDeTeste, EspecificacaoDeCodigo
from apps.trilhas.models import Aula, Exercicio, StatusEditorial, Tipo, Trilha
from apps.trilhas.serializers import ExercicioDetalheSerializer

from .models import SolicitacaoAutoria
from .services import MODELOS, slug_livre

# Única rota autorizada a serializar `solucao_autor`.


class SolucaoAutorSerializer(serializers.ModelSerializer[Exercicio]):
    trilha_slug = serializers.SlugField(source="trilha.slug", read_only=True)
    exercicio_slug = serializers.SlugField(source="slug", read_only=True)
    status_editorial = serializers.CharField(source="status", read_only=True)

    class Meta:
        model = Exercicio
        fields = [
            "trilha_slug",
            "exercicio_slug",
            "solucao_autor",
            "status_editorial",
        ]
        read_only_fields = fields


# Item das filas editoriais; serve aos três models, por isso não é ModelSerializer.
class ItemEditorialSerializer(serializers.Serializer[object]):
    id = serializers.IntegerField(read_only=True)
    tipo = serializers.ChoiceField(choices=list(MODELOS), read_only=True)
    titulo = serializers.CharField(read_only=True)
    status_editorial = serializers.ChoiceField(StatusEditorial.choices, read_only=True)


# Exercício na leitura editorial: o detalhe público mais o código inicial. A
# solução fica de fora, como no detalhe público; ela tem rota própria.
class ExercicioEditorialSerializer(ExercicioDetalheSerializer):
    # Exercício teórico não tem especificação de código: vem null.
    codigo_inicial = serializers.CharField(
        source="especificacao_codigo.codigo_inicial", read_only=True, allow_null=True
    )

    class Meta(ExercicioDetalheSerializer.Meta):
        fields = [*ExercicioDetalheSerializer.Meta.fields, "codigo_inicial"]
        read_only_fields = fields


# --- Solicitação de autoria ---
# A situação sai por método: `status` é nome proibido na varredura transversal
# de serializers, que vale para o projeto inteiro.


class SolicitacaoAutoriaSerializer(serializers.ModelSerializer[SolicitacaoAutoria]):
    areas = serializers.PrimaryKeyRelatedField(
        many=True, allow_empty=False, queryset=Trilha.objects.publicados()
    )
    areas_nomes: serializers.SlugRelatedField[Trilha] = serializers.SlugRelatedField(
        source="areas", slug_field="nome", many=True, read_only=True
    )
    situacao = serializers.SerializerMethodField()

    class Meta:
        model = SolicitacaoAutoria
        fields = [
            "id",
            "areas",
            "areas_nomes",
            "carta_apresentacao",
            "portfolio_link",
            "aceite_diretrizes",
            "situacao",
            "motivo_rejeicao",
            "criado_em",
        ]
        read_only_fields = ["id", "motivo_rejeicao", "criado_em"]

    def get_situacao(self, obj: SolicitacaoAutoria) -> str:
        return obj.status

    def validate_aceite_diretrizes(self, valor: bool) -> bool:
        if not valor:
            raise serializers.ValidationError(
                "Aceite as diretrizes de autoria para enviar.", code="sem_aceite"
            )
        return valor

    def validate(self, dados: dict[str, Any]) -> dict[str, Any]:
        usuario = self.context["request"].user
        if usuario.has_perm("trilhas.create"):
            raise serializers.ValidationError(
                "Você já pode criar conteúdo.", code="ja_autor"
            )
        if usuario.solicitacoes_autoria.filter(
            status=SolicitacaoAutoria.Status.PENDENTE
        ).exists():
            raise serializers.ValidationError(
                "Você já tem uma solicitação em análise.", code="solicitacao_pendente"
            )
        return dados

    def create(self, dados: dict[str, Any]) -> SolicitacaoAutoria:
        # A checagem acima perde a corrida de dois POSTs; a constraint não.
        try:
            with transaction.atomic():
                return super().create(dados)
        except IntegrityError:
            raise serializers.ValidationError(
                "Você já tem uma solicitação em análise.", code="solicitacao_pendente"
            ) from None


class SolicitacaoAdminSerializer(SolicitacaoAutoriaSerializer):
    solicitante = serializers.SerializerMethodField()

    class Meta(SolicitacaoAutoriaSerializer.Meta):
        fields = [*SolicitacaoAutoriaSerializer.Meta.fields, "solicitante"]
        read_only_fields = fields

    def get_solicitante(self, obj: SolicitacaoAutoria) -> dict[str, str]:
        return {
            "id": str(obj.usuario_id),
            "nickname": obj.usuario.nickname,
            "email": obj.usuario.email,
        }


class RejeicaoSerializer(serializers.Serializer[None]):
    motivo = serializers.CharField(max_length=1000)


# --- Criação de conteúdo ---
# Todo conteúdo nasce em RASCUNHO (default do model) e com o autor da request,
# preenchido na view. Filho só entra em pai do próprio autor, salvo admin.


def _exigir_dono(conteudo: Trilha | Aula, request: Any) -> None:
    if request.user.is_platform_admin or conteudo.autor_id == request.user.pk:
        return
    raise PermissionDenied("Você só pode adicionar conteúdo ao que criou.")


class NovaTrilhaSerializer(serializers.ModelSerializer[Trilha]):
    class Meta:
        model = Trilha
        fields = ["id", "nome", "slug", "descricao", "dificuldade"]
        read_only_fields = ["id", "slug"]

    def create(self, dados: dict[str, Any]) -> Trilha:
        dados["slug"] = slug_livre(dados["nome"], Trilha.objects.all())
        return super().create(dados)


class NovaAulaSerializer(serializers.ModelSerializer[Aula]):
    class Meta:
        model = Aula
        fields = ["id", "trilha", "titulo", "slug", "conteudo"]
        read_only_fields = ["id", "slug"]

    def validate_trilha(self, trilha: Trilha) -> Trilha:
        _exigir_dono(trilha, self.context["request"])
        return trilha

    def create(self, dados: dict[str, Any]) -> Aula:
        trilha = dados["trilha"]
        dados["slug"] = slug_livre(dados["titulo"], Aula.objects.filter(trilha=trilha))
        dados["ordem"] = trilha.aulas.count() + 1
        return super().create(dados)


class CasoNovoSerializer(serializers.Serializer[None]):
    argumentos = serializers.ListField(child=serializers.JSONField(), default=list)
    esperado = serializers.JSONField(required=False, allow_null=True, default=None)
    visivel = serializers.BooleanField(default=True)


class NovoExercicioSerializer(serializers.ModelSerializer[Exercicio]):
    # Com `funcao`, o exercício é de código e os testes viram casos do
    # corretor; sem, é teórico.
    funcao = serializers.CharField(
        max_length=60, required=False, allow_blank=True, write_only=True
    )
    testes = CasoNovoSerializer(many=True, required=False, write_only=True)

    class Meta:
        model = Exercicio
        fields = [
            "id",
            "aula",
            "titulo",
            "slug",
            "enunciado",
            "dificuldade",
            "tipo",
            "funcao",
            "testes",
        ]
        read_only_fields = ["id", "slug", "tipo"]

    def validate_aula(self, aula: Aula) -> Aula:
        _exigir_dono(aula, self.context["request"])
        return aula

    def validate(self, dados: dict[str, Any]) -> dict[str, Any]:
        funcao = dados.get("funcao", "")
        if funcao and not funcao.isidentifier():
            raise serializers.ValidationError(
                {"funcao": "Nome de função inválido."}, code="funcao_invalida"
            )
        if funcao and not dados.get("testes"):
            raise serializers.ValidationError(
                {"testes": "Exercício de código precisa de ao menos um teste."},
                code="sem_testes",
            )
        if dados.get("testes") and not funcao:
            raise serializers.ValidationError(
                {"funcao": "Informe a função que os testes chamam."},
                code="sem_funcao",
            )
        return dados

    def create(self, dados: dict[str, Any]) -> Exercicio:
        funcao = dados.pop("funcao", "")
        testes = dados.pop("testes", [])
        aula = dados["aula"]
        dados["slug"] = slug_livre(
            dados["titulo"], Exercicio.objects.filter(trilha_id=aula.trilha_id)
        )
        dados["ordem"] = aula.exercicios.count() + 1
        dados["tipo"] = Tipo.CODIGO if funcao else Tipo.TEORICO
        with transaction.atomic():
            exercicio = super().create(dados)
            if funcao:
                spec = EspecificacaoDeCodigo.objects.create(
                    exercicio=exercicio, funcao=funcao
                )
                CasoDeTeste.objects.bulk_create(
                    CasoDeTeste(especificacao=spec, ordem=i, **caso)
                    for i, caso in enumerate(testes, start=1)
                )
        return exercicio
