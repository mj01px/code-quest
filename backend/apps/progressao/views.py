from django.conf import settings
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, serializers, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.auditoria.models import AcaoAuditoria
from apps.auditoria.services import registrar
from apps.core.permissions import HasPerm, IsAdmin
from apps.correcao.excecoes import CorretorIndisponivel
from apps.correcao.judge0 import Judge0Error
from apps.correcao.serializers import CorrecaoSerializer, EnvioDeCodigoSerializer
from apps.correcao.services import corrigir_envio, tem_correcao_automatica
from apps.correcao.views import PODE_SUBMETER_CODIGO, Judge0PorMinuto, codigo_enviado
from apps.trilhas.models import (
    AlternativaExercicio,
    Aula,
    Exercicio,
    StatusEditorial,
    Tipo,
    Trilha,
)

from .conclusao import resumo_da_conclusao
from .models import TipoDeEtapa, TrilhaIniciada
from .sequencia import EXERCICIO, estado_da_trilha, exigir_liberado
from .serializers import (
    ConclusaoDaTrilhaSerializer,
    ConclusaoSerializer,
    DashboardAdminSerializer,
    EscolhaSerializer,
    EtapaConcluidaSerializer,
    ExercicioConcluidoSerializer,
    LogDoDashboardSerializer,
    ProgressoSerializer,
    RespostasDoQuizSerializer,
    ResultadoXPSerializer,
    RevelarFlashcardSerializer,
    SequenciaSerializer,
    TrilhaIniciadaSerializer,
)
from .services import (
    concluir_leitura,
    concluir_quiz,
    creditar_exercicio,
    criatura_ativa,
    etapas_concluidas,
    exercicios_concluidos,
    iniciar_trilha,
    ler_sequencia,
    logs_do_dashboard,
    montar_dashboard_admin,
    montar_progresso,
    obter_progresso,
    trilha_atual,
    trilhas_iniciadas,
)

# Iniciar trilha e concluir exercício são capacidades governadas pelo RBAC
# ler o próprio progresso continua exigindo só login
PODE_INICIAR_TRILHA = HasPerm("trilhas.enroll")
PODE_CONCLUIR_EXERCICIO = HasPerm("exercicios.complete")


@extend_schema(tags=["progressao"], responses=ProgressoSerializer)
class MeuProgressoView(generics.GenericAPIView):
    serializer_class = ProgressoSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        ativa = criatura_ativa(request.user)
        # se o usuario nao tiver criatura ativa, morre aqui silenciosamente
        # retornando 204 pra n quebrar o front
        if ativa is None:
            return Response(status=status.HTTP_204_NO_CONTENT)

        progresso = montar_progresso(obter_progresso(ativa))
        return Response(self.get_serializer(progresso).data)


@extend_schema(tags=["progressao"], responses=SequenciaSerializer)
class MinhaSequenciaView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "eu_progresso"

    def get(self, request):
        return Response(SequenciaSerializer(ler_sequencia(user=request.user)).data)


@extend_schema(tags=["admin"], responses=DashboardAdminSerializer)
class AdminDashboardView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        periodo = request.query_params.get("periodo", "")
        return Response(DashboardAdminSerializer(montar_dashboard_admin(periodo)).data)


class LogsDoDashboardPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "tamanho"
    max_page_size = 50


@extend_schema(tags=["admin"])
class AdminLogsView(generics.ListAPIView):
    # Logs seguem a mesma permissão da trilha completa: painel não basta.
    permission_classes = [IsAdmin, HasPerm("auditoria.view")]
    serializer_class = LogDoDashboardSerializer
    pagination_class = LogsDoDashboardPagination

    def get_queryset(self):
        return logs_do_dashboard()

    def list(self, request, *args, **kwargs):
        # Antes de listar, como em `AuditoriaListView`: página inválida (404)
        # também é uma tentativa de consulta e entra na trilha.
        registrar(
            AcaoAuditoria.ACESSO_AUDITORIA,
            request=request,
            origem="dashboard",
            pagina=request.query_params.get("page", "1"),
        )
        return super().list(request, *args, **kwargs)


@extend_schema(
    tags=["progressao"],
    request=None,
    responses={201: TrilhaIniciadaSerializer, 200: TrilhaIniciadaSerializer},
)
class IniciarTrilhaView(APIView):
    """Marca a trilha como iniciada para o aluno.

    Idempotente: 201 na primeira vez, 200 nas seguintes, e o corpo é o mesmo
    nos dois casos. Repetir o clique não é erro, e devolver 409 obrigaria a
    tela a tratar como falha algo que está certo.
    """

    permission_classes = [IsAuthenticated, PODE_INICIAR_TRILHA]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "conclusao"

    def post(self, request, trilha_slug):
        trilha = get_object_or_404(Trilha.objects.publicados(), slug=trilha_slug)

        criada = iniciar_trilha(user=request.user, trilha=trilha)
        marca = TrilhaIniciada.objects.get(user=request.user, trilha=trilha)

        return Response(
            TrilhaIniciadaSerializer(marca).data,
            status=status.HTTP_201_CREATED if criada else status.HTTP_200_OK,
        )


@extend_schema(
    tags=["progressao"],
    responses={200: serializers.ListSerializer(child=serializers.SlugField())},
)
class MinhasTrilhasIniciadasView(APIView):
    """Os slugs das trilhas em que o aluno já entrou.

    Lista enxuta de propósito: a tela só precisa saber se a trilha está na
    lista, e o catálogo com nome e contagem já vem da rota pública.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "eu_progresso"

    def get(self, request):
        return Response(trilhas_iniciadas(user=request.user))


@extend_schema(
    tags=["progressao"], request=EnvioDeCodigoSerializer, responses=ConclusaoSerializer
)
class ConcluirExercicioView(APIView):
    permission_classes = [IsAuthenticated, PODE_CONCLUIR_EXERCICIO]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "conclusao"

    def post(self, request, trilha_slug, exercicio_slug):
        # Aula e trilha publicadas também, como no detalhe do catálogo: um
        # exercício publicado sob pai em revisão não pode creditar XP.
        exercicio = get_object_or_404(
            Exercicio.objects.publicados(),
            trilha__slug=trilha_slug,
            trilha__status=StatusEditorial.PUBLICADO,
            aula__status=StatusEditorial.PUBLICADO,
            slug=exercicio_slug,
        )

        exigir_liberado(
            user=request.user,
            trilha=exercicio.trilha,
            tipo=EXERCICIO,
            aula_slug=exercicio.aula.slug,
            exercicio_slug=exercicio.slug,
        )

        correcao = None
        # O texto devolvido ao aluno é `explicacao`, nunca `solucao_autor`: este
        # monta a resposta à mão, fora da varredura transversal de serializers.
        if exercicio.tipo == Tipo.ALTERNATIVA:
            escolha = EscolhaSerializer(data=request.data)
            escolha.is_valid(raise_exception=True)
            alternativa = AlternativaExercicio.objects.filter(
                exercicio=exercicio, pk=escolha.validated_data["alternativa_id"]
            ).first()
            if alternativa is None:
                raise serializers.ValidationError(
                    {
                        "alternativa_id": serializers.ErrorDetail(
                            "Escolha uma alternativa deste exercício.",
                            code="alternativa_invalida",
                        )
                    }
                )
            if not alternativa.correta:
                return Response(
                    {
                        "aprovado": False,
                        "correcao": None,
                        "explicacao": exercicio.explicacao,
                        "alternativa_correta_id": exercicio.alternativas.get(
                            correta=True
                        ).pk,
                    }
                )

        if exercicio.tipo == Tipo.FLASHCARD:
            revelacao = RevelarFlashcardSerializer(data=request.data)
            revelacao.is_valid(raise_exception=True)

        if exercicio.tipo == Tipo.CODIGO and tem_correcao_automatica(exercicio):
            # Só o envio que chama o Judge0 gasta o balde dele, o mesmo de
            # executar/. Concluir exercício sem código segue em `conclusao`.
            # Permissão antes do balde: 403 não gasta a rajada de ninguém.
            self.permission_classes = [PODE_SUBMETER_CODIGO]
            self.check_permissions(request)
            self.throttle_classes = [Judge0PorMinuto]
            self.check_throttles(request)
            try:
                correcao = corrigir_envio(
                    user=request.user,
                    exercicio=exercicio,
                    codigo=codigo_enviado(request),
                )
            except Judge0Error:
                raise CorretorIndisponivel() from None

            if not correcao.aprovado:
                return Response(
                    {"aprovado": False, "correcao": CorrecaoSerializer(correcao).data}
                )

        resultado = creditar_exercicio(user=request.user, exercicio=exercicio)
        montar_progresso(resultado.progresso)

        dados = ResultadoXPSerializer(resultado, context={"request": request}).data
        resposta = {
            **dados,
            "aprovado": True,
            "correcao": CorrecaoSerializer(correcao).data if correcao else None,
        }
        if exercicio.tipo in (Tipo.ALTERNATIVA, Tipo.TEORICO) or (
            exercicio.tipo == Tipo.CODIGO and correcao is None
        ):
            resposta["explicacao"] = exercicio.explicacao
        elif exercicio.tipo == Tipo.FLASHCARD:
            resposta["resposta"] = exercicio.explicacao
        return Response(resposta)


@extend_schema(
    tags=["progressao"],
    parameters=[
        OpenApiParameter(
            name="trilha",
            type=str,
            description="Restringe a lista às conclusões de uma trilha.",
        )
    ],
)
class MeusExerciciosConcluidosView(generics.ListAPIView):
    """A lista que o front usa para marcar exercício feito.

    Escopo de throttle próprio: é lida em toda navegação, então não pode
    dividir orçamento com `catalogo` nem com `conclusao`.
    """

    serializer_class = ExercicioConcluidoSerializer
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "eu_progresso"

    def get_queryset(self):
        return exercicios_concluidos(
            user=self.request.user,
            trilha_slug=self.request.query_params.get("trilha"),
        )


def _aula_publicada(trilha_slug, aula_slug):
    return get_object_or_404(
        Aula.objects.publicados().select_related("trilha"),
        trilha__slug=trilha_slug,
        trilha__status=StatusEditorial.PUBLICADO,
        slug=aula_slug,
    )


@extend_schema(tags=["progressao"], request=None, responses=EtapaConcluidaSerializer)
class ConcluirLeituraView(APIView):
    """Marca a leitura da lição. Idempotente: 201 na primeira vez, 200 depois."""

    permission_classes = [IsAuthenticated, PODE_CONCLUIR_EXERCICIO]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "conclusao"

    def post(self, request, trilha_slug, aula_slug):
        aula = _aula_publicada(trilha_slug, aula_slug)
        exigir_liberado(
            user=request.user,
            trilha=aula.trilha,
            tipo=TipoDeEtapa.LEITURA,
            aula_slug=aula.slug,
        )
        etapa, criada = concluir_leitura(user=request.user, aula=aula)
        return Response(
            EtapaConcluidaSerializer(etapa).data,
            status=status.HTTP_201_CREATED if criada else status.HTTP_200_OK,
        )


@extend_schema(
    tags=["progressao"],
    request=RespostasDoQuizSerializer,
    responses=EtapaConcluidaSerializer,
)
class ConcluirQuizView(APIView):
    """Corrige o quiz no servidor e registra a etapa.

    A resposta traz `acertos` desta tentativa; o melhor resultado fica gravado
    na etapa e é o que volta em `eu/etapas-concluidas/`.
    """

    permission_classes = [IsAuthenticated, PODE_CONCLUIR_EXERCICIO]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "conclusao"

    def post(self, request, trilha_slug, aula_slug):
        aula = _aula_publicada(trilha_slug, aula_slug)
        exigir_liberado(
            user=request.user,
            trilha=aula.trilha,
            tipo=TipoDeEtapa.QUIZ,
            aula_slug=aula.slug,
        )
        entrada = RespostasDoQuizSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        etapa, criada, acertos, total = concluir_quiz(
            user=request.user, aula=aula, respostas=entrada.validated_data["respostas"]
        )
        dados = EtapaConcluidaSerializer(etapa).data
        dados["acertos"] = acertos
        dados["total"] = total
        return Response(
            dados, status=status.HTTP_201_CREATED if criada else status.HTTP_200_OK
        )


class MinhasEtapasConcluidasView(generics.ListAPIView):
    serializer_class = EtapaConcluidaSerializer
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "eu_progresso"
    pagination_class = None

    def get_queryset(self):
        return etapas_concluidas(user=self.request.user)


@extend_schema(tags=["progressao"])
class PassosDaTrilhaView(APIView):
    """A ordem de estudo da trilha e o estado de cada passo para o aluno."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "eu_progresso"

    def get(self, request, trilha_slug):
        trilha = get_object_or_404(Trilha.objects.publicados(), slug=trilha_slug)
        livre = not settings.PROGRESSAO_SEQUENCIAL
        return Response(
            [
                {
                    "tipo": estado.passo.tipo,
                    "aula_slug": estado.passo.aula_slug,
                    "exercicio_slug": estado.passo.exercicio_slug,
                    "titulo": estado.passo.titulo,
                    "estado": "liberado"
                    if livre and estado.estado == "bloqueado"
                    else estado.estado,
                }
                for estado in estado_da_trilha(request.user, trilha)
            ]
        )


@extend_schema(tags=["progressao"])
class TrilhaAtualView(APIView):
    """A trilha da atividade mais recente do aluno, para o "continuar"."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "eu_progresso"

    def get(self, request):
        return Response({"trilha": trilha_atual(user=request.user)})


@extend_schema(tags=["progressao"], responses=ConclusaoDaTrilhaSerializer)
class ConclusaoDaTrilhaView(APIView):
    """O resumo da tela de quest completa: fases, XP, precisão e conquistas."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "eu_progresso"

    def get(self, request, trilha_slug):
        trilha = get_object_or_404(
            Trilha.objects.publicados().filter(desafio=False), slug=trilha_slug
        )
        return Response(
            ConclusaoDaTrilhaSerializer(
                resumo_da_conclusao(user=request.user, trilha=trilha)
            ).data
        )

