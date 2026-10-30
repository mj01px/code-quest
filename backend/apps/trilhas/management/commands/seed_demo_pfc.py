from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.correcao.models import EspecificacaoDeCodigo
from apps.trilhas.models import (
    AlternativaExercicio,
    Aula,
    Dificuldade,
    Exercicio,
    StatusEditorial,
    Tipo,
    Trilha,
)

CODIGOS_PYTHON = ("iniciais-do-nome", "limpar-entrada")
CONTEUDO = {
    "python": {
        "aula": "texto-e-formatacao",
        "exercicios": [
            {
                "slug": "string-imutavel-escolha",
                "titulo": "O resultado de upper",
                "enunciado": 'Se `nome = "ana"` e chamamos `nome.upper()` sem guardar o retorno, qual é o valor de `nome`?',
                "tipo": Tipo.ALTERNATIVA,
                "resposta": "Strings são imutáveis. upper() devolve uma nova string; sem atribuição, nome continua sendo ana.",
                "opcoes": ["ANA", "ana", "Ana", "Erro de execução"],
                "correta": 2,
            },
        ],
    },
    "logica-de-programacao": {
        "aula": "variaveis-e-tipos",
        "exercicios": [
            {
                "slug": "valor-da-variavel-escolha",
                "titulo": "Atualizar uma variável",
                "enunciado": "Se `pontos = 4` e depois `pontos = pontos + 3`, qual é o valor final de pontos?",
                "tipo": Tipo.ALTERNATIVA,
                "resposta": "A expressão usa o valor antigo, 4, soma 3 e guarda 7 em pontos.",
                "opcoes": ["3", "4", "7", "43"],
                "correta": 3,
            },
            {
                "slug": "texto-ou-numero-escolha",
                "titulo": "Texto ou número",
                "enunciado": 'Em Python, qual é o resultado de `"5" + "2"`?',
                "tipo": Tipo.ALTERNATIVA,
                "resposta": "Os dois valores são textos. O sinal + concatena as strings e produz 52, também como texto.",
                "opcoes": ["7", '"52"', "Erro de sintaxe", '"7"'],
                "correta": 2,
            },
            {
                "slug": "variavel-flashcard",
                "titulo": "Explique o que é uma variável",
                "enunciado": "Explique em voz alta: o que é uma variável e o que acontece quando atribuímos um novo valor a ela? Depois revele a resposta.",
                "tipo": Tipo.FLASHCARD,
                "resposta": "Uma variável é um nome associado a um valor. Uma nova atribuição faz esse nome passar a apontar para o novo valor.",
            },
        ],
    },
    "banco-de-dados": {
        "aula": "modelagem-e-tabelas",
        "exercicios": [
            {
                "slug": "chave-primaria-escolha",
                "titulo": "Escolher a chave primária",
                "enunciado": "Qual propriedade uma chave primária precisa garantir em uma tabela?",
                "tipo": Tipo.ALTERNATIVA,
                "resposta": "A chave primária identifica cada linha de forma única e não aceita valor nulo.",
                "opcoes": [
                    "Pode se repetir",
                    "Identifica cada linha sem aceitar nulo",
                    "Sempre contém texto",
                    "É opcional em cada linha",
                ],
                "correta": 2,
            },
            {
                "slug": "email-unico-escolha",
                "titulo": "E-mail sem duplicação",
                "enunciado": "Qual restrição SQL impede dois alunos de terem o mesmo e-mail cadastrado?",
                "tipo": Tipo.ALTERNATIVA,
                "resposta": "UNIQUE impede a repetição do valor da coluna. NOT NULL apenas impede valores ausentes.",
                "opcoes": ["NOT NULL", "DEFAULT", "UNIQUE", "ORDER BY"],
                "correta": 3,
            },
            {
                "slug": "chave-estrangeira-flashcard",
                "titulo": "Explique a chave estrangeira",
                "enunciado": "Explique em voz alta como uma chave estrangeira liga duas tabelas. Depois revele a resposta.",
                "tipo": Tipo.FLASHCARD,
                "resposta": "Uma chave estrangeira guarda o valor de uma chave de outra tabela, criando a relação entre as linhas e permitindo verificar a integridade da referência.",
            },
        ],
    },
}


class Command(BaseCommand):
    help = "Publica os nove exercícios alternativos da demonstração do PFC."

    @transaction.atomic
    def handle(self, *args, **options):
        trilhas = {}
        aulas = {}
        for slug, dados in CONTEUDO.items():
            trilhas[slug] = Trilha.objects.filter(slug=slug).first()
            if trilhas[slug] is None:
                raise CommandError("Execute seed_trilhas antes de seed_demo_pfc.")
            aulas[slug] = Aula.objects.filter(
                trilha=trilhas[slug], slug=dados["aula"]
            ).first()
            if aulas[slug] is None:
                raise CommandError("Execute seed_trilhas antes de seed_demo_pfc.")

        codigos = list(
            Exercicio.objects.filter(trilha=trilhas["python"], slug__in=CODIGOS_PYTHON)
        )
        if (
            len(codigos) != 2
            or EspecificacaoDeCodigo.objects.filter(exercicio__in=codigos).count() != 2
        ):
            raise CommandError("Execute seed_correcao antes de seed_demo_pfc.")

        selecionados = [exercicio.pk for exercicio in codigos]
        for ordem, exercicio in enumerate(
            sorted(codigos, key=lambda item: item.slug), start=1
        ):
            exercicio.aula = aulas["python"]
            exercicio.tipo = Tipo.CODIGO
            exercicio.ordem = ordem
            exercicio.save(update_fields=["aula", "tipo", "ordem", "trilha"])
        for slug, dados in CONTEUDO.items():
            for ordem, item in enumerate(
                dados["exercicios"], start=3 if slug == "python" else 1
            ):
                exercicio, _ = Exercicio.objects.update_or_create(
                    trilha=trilhas[slug],
                    slug=item["slug"],
                    defaults={
                        "aula": aulas[slug],
                        "titulo": item["titulo"],
                        "enunciado": item["enunciado"],
                        "tipo": item["tipo"],
                        "dificuldade": Dificuldade.INICIANTE,
                        "ordem": ordem,
                        "explicacao": item["resposta"],
                        "status": StatusEditorial.PUBLICADO,
                    },
                )
                selecionados.append(exercicio.pk)
                if item["tipo"] == Tipo.ALTERNATIVA:
                    for posicao, texto in enumerate(item["opcoes"], start=1):
                        AlternativaExercicio.objects.update_or_create(
                            exercicio=exercicio,
                            ordem=posicao,
                            defaults={
                                "texto": texto,
                                "correta": posicao == item["correta"],
                            },
                        )
                    exercicio.alternativas.exclude(
                        ordem__in=range(1, len(item["opcoes"]) + 1)
                    ).delete()

        Exercicio.objects.filter(trilha__in=trilhas.values()).exclude(
            pk__in=selecionados
        ).update(status=StatusEditorial.RASCUNHO)
        Aula.objects.filter(trilha__in=trilhas.values()).exclude(
            pk__in=[aula.pk for aula in aulas.values()]
        ).update(status=StatusEditorial.RASCUNHO)
        Aula.objects.filter(pk__in=[aula.pk for aula in aulas.values()]).update(
            status=StatusEditorial.PUBLICADO
        )
        Exercicio.objects.filter(pk__in=selecionados).update(
            status=StatusEditorial.PUBLICADO
        )
        self.stdout.write(
            self.style.SUCCESS("Nove exercícios publicados para a demonstração.")
        )
