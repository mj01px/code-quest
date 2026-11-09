from typing import Any

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.correcao.models import CasoDeTeste, EspecificacaoDeCodigo, Linguagem
from apps.trilhas.models import (
    Aula,
    Exercicio,
    Flashcard,
    Questao,
    StatusEditorial,
    Tipo,
    Trilha,
)

from ._conteudo_banco import AULAS_BANCO
from ._conteudo_python import AULAS_PYTHON
from ._licoes import LICOES, LicaoSeed
from ._tipos_seed import AulaSeed, ExercicioSeed
from .seed_trilhas import AULAS as AULAS_LOGICA

AULAS_POR_TRILHA: dict[str, list[AulaSeed]] = {
    "logica-de-programacao": AULAS_LOGICA,
    "python": AULAS_PYTHON,
    "banco-de-dados": AULAS_BANCO,
}


def _exercicios_da_aula(trilha_slug: str, aula_slug: str) -> dict[str, ExercicioSeed]:
    for aula in AULAS_POR_TRILHA[trilha_slug]:
        if aula["slug"] == aula_slug:
            return {exercicio["slug"]: exercicio for exercicio in aula["exercicios"]}
    raise CommandError(f"Aula {trilha_slug}/{aula_slug} não existe no conteúdo base.")


class Command(BaseCommand):
    help = (
        "Publica as lições completas, o quiz e os flashcards das aulas iniciais, "
        "e remove os exercícios que viraram quiz ou flashcard."
    )

    @transaction.atomic
    def handle(self, *args: Any, **options: Any) -> None:
        for licao in LICOES:
            self._aplicar(licao)
        self.stdout.write(
            self.style.SUCCESS(
                f"{len(LICOES)} lições publicadas com quiz e flashcards."
            )
        )

    def _aplicar(self, licao: LicaoSeed) -> None:
        trilha = Trilha.objects.filter(slug=licao["trilha"]).first()
        aula = (
            Aula.objects.filter(trilha=trilha, slug=licao["aula"]).first()
            if trilha
            else None
        )
        if trilha is None or aula is None:
            raise CommandError("Execute seed_trilhas antes de seed_licoes.")

        aula.conteudo = licao["conteudo"]
        aula.status = StatusEditorial.PUBLICADO
        aula.save(update_fields=["conteudo", "status", "atualizada_em"])

        Exercicio.objects.filter(trilha=trilha, slug__in=licao["remover"]).delete()

        base = _exercicios_da_aula(licao["trilha"], licao["aula"])
        for ordem, slug in enumerate(licao["fases"], start=1):
            dados = base[slug]
            aprender = licao["aprender"].get(slug)
            Exercicio.objects.update_or_create(
                trilha=trilha,
                slug=slug,
                defaults={
                    "aula": aula,
                    "titulo": dados["titulo"],
                    "enunciado": dados["enunciado"],
                    "tipo": dados["tipo"],
                    "dificuldade": dados["dificuldade"],
                    "ordem": ordem,
                    "solucao_autor": dados["solucao_autor"],
                    "contexto": aprender["contexto"] if aprender else "",
                    "exemplo": aprender["exemplo"] if aprender else "",
                    "explicacao": (
                        dados["solucao_autor"] if dados["tipo"] == Tipo.TEORICO else ""
                    ),
                    "status": StatusEditorial.PUBLICADO,
                },
            )

        aula.questoes.all().delete()
        for item in licao["questoes"]:
            questao = Questao(
                aula=aula,
                enunciado=item["enunciado"],
                opcoes=item["opcoes"],
                resposta_correta=item["correta"],
            )
            questao.full_clean()
            questao.save()

        aula.flashcards.all().delete()
        Flashcard.objects.bulk_create(
            Flashcard(
                aula=aula,
                pergunta=card["pergunta"],
                resposta=card["resposta"],
                dica=card["dica"],
            )
            for card in licao["flashcards"]
        )

        for slug, correcao in licao["correcao"].items():
            exercicio = Exercicio.objects.get(trilha=trilha, slug=slug)
            especificacao, _ = EspecificacaoDeCodigo.objects.update_or_create(
                exercicio=exercicio,
                defaults={
                    "linguagem": Linguagem.PYTHON,
                    "funcao": correcao["funcao"],
                    "codigo_inicial": correcao["codigo_inicial"],
                    "requisitos": [],
                },
            )
            especificacao.full_clean()
            especificacao.casos.all().delete()
            CasoDeTeste.objects.bulk_create(
                CasoDeTeste(
                    especificacao=especificacao,
                    ordem=ordem,
                    argumentos=caso["argumentos"],
                    esperado=caso["esperado"],
                    visivel=caso["visivel"],
                )
                for ordem, caso in enumerate(correcao["casos"], start=1)
            )
