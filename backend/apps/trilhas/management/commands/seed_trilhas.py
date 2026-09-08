from typing import Any, TypedDict

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.trilhas.models import (
    Aula,
    Dificuldade,
    Exercicio,
    StatusEditorial,
    Tipo,
    Trilha,
)

PUBLICADO = StatusEditorial.PUBLICADO
RASCUNHO = StatusEditorial.RASCUNHO


class ExercicioSeed(TypedDict):
    slug: str
    titulo: str
    ordem: int
    tipo: str
    dificuldade: str
    enunciado: str
    solucao_autor: str


class AulaSeed(TypedDict):
    slug: str
    titulo: str
    ordem: int
    pre_requisito: str | None
    conteudo: str
    exercicios: list[ExercicioSeed]


class TrilhaSeed(TypedDict):
    slug: str
    nome: str
    descricao: str
    ordem: int
    status: str


# Catálogo previsto. Só a primeira tem conteúdo; as outras ficam em rascunho.
TRILHAS: list[TrilhaSeed] = [
    {
        "slug": "logica-de-programacao",
        "nome": "Lógica de Programação",
        "descricao": (
            "O ponto de partida: variáveis, condicionais e repetição. "
            "Aprenda a decompor um problema antes de escrever a primeira linha."
        ),
        "ordem": 1,
        "status": PUBLICADO,
    },
    {
        "slug": "python",
        "nome": "Python",
        "descricao": (
            "Scripts, dados e automação com a linguagem mais direta para começar."
        ),
        "ordem": 2,
        "status": RASCUNHO,
    },
    {
        "slug": "banco-de-dados",
        "nome": "Banco de Dados",
        "descricao": (
            "Modelagem relacional e SQL, do primeiro SELECT ao JOIN que resolve."
        ),
        "ordem": 3,
        "status": RASCUNHO,
    },
    {
        "slug": "javascript-typescript",
        "nome": "JavaScript e TypeScript",
        "descricao": ("A linguagem da web: DOM, eventos, código assíncrono e tipos."),
        "ordem": 4,
        "status": RASCUNHO,
    },
    {
        "slug": "algoritmos",
        "nome": "Algoritmos",
        "descricao": (
            "Listas, árvores, busca e ordenação, com custo de tempo e espaço."
        ),
        "ordem": 5,
        "status": RASCUNHO,
    },
]

CONTEUDO_VARIAVEIS = """## Guardar um valor

Uma variável é um nome para um valor que o programa guarda na memória. Você
escolhe o nome, o computador cuida do resto.

```python
idade = 17
nome = "Ana"
altura = 1.62
estuda = True
```

Cada valor tem um **tipo**: `int` para inteiros, `float` para decimais, `str`
para texto e `bool` para verdadeiro ou falso.

## Por que o tipo importa

`"7" + "3"` devolve `"73"`, porque somar texto é colar um no outro. Já `7 + 3`
devolve `10`. O mesmo símbolo faz coisas diferentes conforme o tipo, e é daí
que vem boa parte dos erros de quem está começando.

## Converter de propósito

`int("7")` vira `7` e `str(7)` vira `"7"`. Tudo que chega de fora do programa,
como o `input()`, chega como texto: converter é o primeiro passo antes de
qualquer conta.
"""

CONTEUDO_CONDICIONAIS = """## Decidir o caminho

Um programa raramente executa sempre as mesmas linhas. O `if` escolhe o que
rodar conforme uma condição ser verdadeira ou falsa.

```python
if idade >= 18:
    print("maior de idade")
else:
    print("menor de idade")
```

## Encadear decisões

`elif` testa a próxima condição só se as anteriores falharam. A ordem importa:
a primeira condição verdadeira vence e as demais nem são avaliadas.

Comparação: `==`, `!=`, `<`, `<=`, `>`, `>=`. Lógicos: `and`, `or`, `not`.

## Combinar condições

`and` só é verdadeiro quando os dois lados são; `or` basta um. Parênteses
resolvem a ambiguidade quando os dois aparecem na mesma linha, e deixam a
intenção explícita para quem for ler depois.
"""

CONTEUDO_REPETICAO = """## Repetir sem copiar e colar

Loops executam o mesmo bloco várias vezes. O `for` percorre uma sequência
conhecida; o `while` repete enquanto uma condição continuar verdadeira.

```python
for numero in [1, 2, 3]:
    print(numero)

contador = 0
while contador < 3:
    contador = contador + 1
```

## O acumulador

O padrão mais comum: uma variável começa em zero (ou em lista vazia) e cresce a
cada volta. Ela precisa ser criada **antes** do loop, senão reinicia toda vez.

## Laço infinito

Se a condição do `while` nunca fica falsa, o programa trava. Garanta sempre que
algo dentro do loop muda o valor testado.
"""

CONTEUDO_LISTAS = """## Guardar vários valores

Uma lista guarda muitos valores sob um nome só, na ordem em que foram postos.
O índice começa em zero, e `-1` é o último.

```python
notas = [8, 6, 9]
notas.append(10)
print(notas[0], notas[-1])
```

## Percorrer

`for nota in notas` entrega um valor por vez. Quando a posição importa, use
`enumerate(notas)`, que devolve índice e valor juntos.

## Quando a lista não serve

Um dicionário associa chave a valor e encontra pela chave, sem percorrer tudo.
Um conjunto (`set`) não guarda ordem nem repetição, e é o caminho curto para
responder "esse valor já apareceu?".
"""

CONTEUDO_FUNCOES = """## Dar nome a um trecho

Uma função embrulha um pedaço de lógica sob um nome, recebe parâmetros e
devolve um resultado. Quem chama não precisa saber como ela faz.

```python
def area(base, altura):
    return base * altura / 2
```

## Parâmetros com valor padrão

O padrão vale quando quem chama omite o argumento. Ele precisa ficar depois dos
parâmetros obrigatórios.

```python
def saudacao(nome, prefixo="Olá"):
    return f"{prefixo}, {nome}!"
```

## Retornar cedo

Um `return` no meio da função encerra ali mesmo. Tratar os casos impossíveis
logo no começo evita blocos aninhados fundo demais.

## Escopo

Variável criada dentro da função só existe dentro dela. Isso é proteção, não
limitação: garante que uma função não estraga o estado de outra.
"""

CONTEUDO_DEPURACAO = """## Ler o erro antes de mexer

O traceback do Python se lê de baixo para cima: a última linha diz o tipo do
erro e a mensagem, e as de cima mostram o caminho até ele. `NameError` é nome
que não existe, `TypeError` é operação entre tipos incompatíveis, `IndexError`
é posição fora da lista, `ZeroDivisionError` é divisão por zero.

## Reproduzir, isolar, corrigir

Antes de mudar qualquer linha, encontre a entrada que quebra o programa toda
vez. Depois reduza o caso até sobrar o mínimo que ainda falha. Só então
corrija, e rode de novo a entrada original.

## Print bem posto

Um `print` no lugar certo mostra o valor real da variável no momento certo, e
resolve a maioria dos casos. O que ele não resolve pede o `pdb`, que pausa a
execução e deixa inspecionar o estado.

## Guardas em vez de conserto depois

Checar o caso impossível na entrada da função custa uma linha. Descobrir o
mesmo caso três funções adiante, pelo traceback, custa uma tarde.
"""

AULAS: list[AulaSeed] = [
    {
        "slug": "variaveis-e-tipos",
        "titulo": "Variáveis e tipos",
        "ordem": 1,
        "pre_requisito": None,
        "conteudo": CONTEUDO_VARIAVEIS,
        "exercicios": [
            {
                "slug": "media-de-duas-notas",
                "titulo": "Média de duas notas",
                "ordem": 1,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INICIANTE,
                "enunciado": (
                    "Escreva uma função `media(nota1, nota2)` que receba duas "
                    "notas numéricas e devolva a média aritmética delas.\n\n"
                    "Exemplo: `media(8, 6)` deve devolver `7.0`."
                ),
                "solucao_autor": (
                    "def media(nota1, nota2):\n    return (nota1 + nota2) / 2\n"
                ),
            },
            {
                "slug": "trocar-valores",
                "titulo": "Trocar dois valores",
                "ordem": 2,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INICIANTE,
                "enunciado": (
                    "Escreva uma função `trocar(a, b)` que devolva os dois "
                    "valores na ordem invertida.\n\n"
                    "Exemplo: `trocar(1, 2)` deve devolver `(2, 1)`."
                ),
                "solucao_autor": "def trocar(a, b):\n    return b, a\n",
            },
            {
                "slug": "tipo-do-resultado",
                "titulo": "Qual é o tipo do resultado?",
                "ordem": 3,
                "tipo": Tipo.TEORICO,
                "dificuldade": Dificuldade.INICIANTE,
                "enunciado": (
                    "Em Python, qual é o tipo do resultado de `10 / 2`?\n\n"
                    "Justifique por que não é `int`, mesmo que o resultado não "
                    "tenha casas decimais."
                ),
                "solucao_autor": (
                    "É `float`. O operador `/` sempre devolve float em Python 3, "
                    "independente de o resultado ser exato. Para divisão inteira "
                    "usa-se `//`."
                ),
            },
            {
                "slug": "converter-entrada",
                "titulo": "Converter o que vem de fora",
                "ordem": 4,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INICIANTE,
                "enunciado": (
                    "Escreva `dobro_do_texto(texto)` que receba um número em "
                    "forma de texto e devolva o dobro dele como inteiro.\n\n"
                    'Exemplo: `dobro_do_texto("21")` deve devolver `42`.\n\n'
                    'Dica: `"21" * 2` devolve `"2121"`, não `42`.'
                ),
                "solucao_autor": (
                    "def dobro_do_texto(texto):\n    return int(texto) * 2\n"
                ),
            },
        ],
    },
    {
        "slug": "condicionais",
        "titulo": "Condicionais",
        "ordem": 2,
        "pre_requisito": "variaveis-e-tipos",
        "conteudo": CONTEUDO_CONDICIONAIS,
        "exercicios": [
            {
                "slug": "par-ou-impar",
                "titulo": "Par ou ímpar",
                "ordem": 1,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INICIANTE,
                "enunciado": (
                    "Escreva uma função `par_ou_impar(numero)` que devolva a "
                    'string `"par"` ou `"impar"` conforme o número recebido.\n\n'
                    "Dica: o resto da divisão por 2 (`%`) resolve."
                ),
                "solucao_autor": (
                    "def par_ou_impar(numero):\n"
                    '    return "par" if numero % 2 == 0 else "impar"\n'
                ),
            },
            {
                "slug": "maior-de-tres",
                "titulo": "O maior de três números",
                "ordem": 2,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "Escreva uma função `maior(a, b, c)` que devolva o maior dos "
                    "três números, **sem usar** a função pronta `max()`.\n\n"
                    "Exemplo: `maior(3, 9, 5)` deve devolver `9`."
                ),
                "solucao_autor": (
                    "def maior(a, b, c):\n"
                    "    resultado = a\n"
                    "    if b > resultado:\n"
                    "        resultado = b\n"
                    "    if c > resultado:\n"
                    "        resultado = c\n"
                    "    return resultado\n"
                ),
            },
            {
                "slug": "classificar-nota",
                "titulo": "Classificar uma nota",
                "ordem": 3,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    'Escreva `classificar(nota)` que devolva `"aprovado"` para '
                    'nota maior ou igual a 7, `"recuperacao"` de 5 a 6.9, e '
                    '`"reprovado"` abaixo de 5.\n\n'
                    "Cuidado com as bordas: 7 é aprovado e 5 é recuperação."
                ),
                "solucao_autor": (
                    "def classificar(nota):\n"
                    "    if nota >= 7:\n"
                    '        return "aprovado"\n'
                    "    if nota >= 5:\n"
                    '        return "recuperacao"\n'
                    '    return "reprovado"\n'
                ),
            },
            {
                "slug": "ano-bissexto",
                "titulo": "Ano bissexto",
                "ordem": 4,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "Escreva `bissexto(ano)` que devolva `True` quando o ano for "
                    "bissexto.\n\n"
                    "A regra tem três partes: é bissexto se for divisível por 4, "
                    "mas não se for divisível por 100, a menos que também seja "
                    "divisível por 400.\n\n"
                    "Exemplos: 2024 é bissexto, 1900 não é, 2000 é."
                ),
                "solucao_autor": (
                    "def bissexto(ano):\n"
                    "    if ano % 400 == 0:\n"
                    "        return True\n"
                    "    if ano % 100 == 0:\n"
                    "        return False\n"
                    "    return ano % 4 == 0\n"
                ),
            },
        ],
    },
    {
        "slug": "repeticao",
        "titulo": "Repetição",
        "ordem": 3,
        "pre_requisito": "condicionais",
        "conteudo": CONTEUDO_REPETICAO,
        "exercicios": [
            {
                "slug": "somar-ate-n",
                "titulo": "Somar de 1 até N",
                "ordem": 1,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INICIANTE,
                "enunciado": (
                    "Escreva `somar_ate(n)` que devolva a soma de todos os "
                    "inteiros de 1 até `n`.\n\n"
                    "Exemplo: `somar_ate(5)` deve devolver `15`."
                ),
                "solucao_autor": (
                    "def somar_ate(n):\n"
                    "    total = 0\n"
                    "    for numero in range(1, n + 1):\n"
                    "        total = total + numero\n"
                    "    return total\n"
                ),
            },
            {
                "slug": "contar-vogais",
                "titulo": "Contar vogais",
                "ordem": 2,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "Escreva `contar_vogais(texto)` que devolva quantas vogais "
                    "existem na string recebida. Considere apenas a, e, i, o, u, "
                    "sem acento, em maiúscula ou minúscula.\n\n"
                    'Exemplo: `contar_vogais("CodeQuest")` deve devolver `4`.'
                ),
                "solucao_autor": (
                    "def contar_vogais(texto):\n"
                    "    total = 0\n"
                    "    for letra in texto.lower():\n"
                    '        if letra in "aeiou":\n'
                    "            total = total + 1\n"
                    "    return total\n"
                ),
            },
            {
                "slug": "tabuada",
                "titulo": "Tabuada de um número",
                "ordem": 3,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INICIANTE,
                "enunciado": (
                    "Escreva `tabuada(numero)` que devolva uma lista com os "
                    "resultados da tabuada de 1 a 10.\n\n"
                    "Exemplo: `tabuada(3)` deve devolver "
                    "`[3, 6, 9, 12, 15, 18, 21, 24, 27, 30]`."
                ),
                "solucao_autor": (
                    "def tabuada(numero):\n"
                    "    return [numero * i for i in range(1, 11)]\n"
                ),
            },
            {
                "slug": "fatorial",
                "titulo": "Fatorial de um número",
                "ordem": 4,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "Escreva `fatorial(n)` que devolva o produto de todos os "
                    "inteiros de 1 até `n`. Por definição, `fatorial(0)` é `1`."
                    "\n\nExemplo: `fatorial(5)` deve devolver `120`.\n\n"
                    "Dica: o acumulador começa em 1. Começando em zero, toda "
                    "multiplicação devolveria zero."
                ),
                "solucao_autor": (
                    "def fatorial(n):\n"
                    "    resultado = 1\n"
                    "    for numero in range(2, n + 1):\n"
                    "        resultado = resultado * numero\n"
                    "    return resultado\n"
                ),
            },
            {
                "slug": "sequencia-de-fibonacci",
                "titulo": "Sequência de Fibonacci",
                "ordem": 5,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "Escreva `fibonacci(quantidade)` que devolva uma lista com "
                    "os primeiros termos da sequência, em que cada termo é a "
                    "soma dos dois anteriores, começando em 0 e 1.\n\n"
                    "Exemplo: `fibonacci(7)` deve devolver "
                    "`[0, 1, 1, 2, 3, 5, 8]`.\n\n"
                    "Cuidado com `quantidade` igual a 0 ou 1."
                ),
                "solucao_autor": (
                    "def fibonacci(quantidade):\n"
                    "    termos = []\n"
                    "    atual, proximo = 0, 1\n"
                    "    for _ in range(quantidade):\n"
                    "        termos.append(atual)\n"
                    "        atual, proximo = proximo, atual + proximo\n"
                    "    return termos\n"
                ),
            },
        ],
    },
    {
        "slug": "listas-e-colecoes",
        "titulo": "Listas e coleções",
        "ordem": 4,
        "pre_requisito": "repeticao",
        "conteudo": CONTEUDO_LISTAS,
        "exercicios": [
            {
                "slug": "maior-da-lista",
                "titulo": "O maior valor da lista",
                "ordem": 1,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INICIANTE,
                "enunciado": (
                    "Escreva `maior_da_lista(numeros)` que devolva o maior "
                    "valor, **sem usar** `max()`. Para lista vazia, devolva "
                    "`None`.\n\n"
                    "Exemplo: `maior_da_lista([3, 9, 5])` deve devolver `9`."
                ),
                "solucao_autor": (
                    "def maior_da_lista(numeros):\n"
                    "    if not numeros:\n"
                    "        return None\n"
                    "    maior = numeros[0]\n"
                    "    for numero in numeros:\n"
                    "        if numero > maior:\n"
                    "            maior = numero\n"
                    "    return maior\n"
                ),
            },
            {
                "slug": "media-da-lista",
                "titulo": "Média de uma lista de notas",
                "ordem": 2,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INICIANTE,
                "enunciado": (
                    "Escreva `media_das_notas(notas)` que devolva a média da "
                    "lista recebida. Para lista vazia, devolva `0.0`, sem "
                    "quebrar.\n\n"
                    "Exemplo: `media_das_notas([8, 6, 10])` deve devolver `8.0`."
                ),
                "solucao_autor": (
                    "def media_das_notas(notas):\n"
                    "    if not notas:\n"
                    "        return 0.0\n"
                    "    return sum(notas) / len(notas)\n"
                ),
            },
            {
                "slug": "remover-repetidos",
                "titulo": "Remover valores repetidos",
                "ordem": 3,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "Escreva `sem_repetidos(valores)` que devolva uma lista sem "
                    "duplicatas, **preservando a ordem** da primeira "
                    "aparição.\n\n"
                    "Exemplo: `sem_repetidos([3, 1, 3, 2, 1])` deve devolver "
                    "`[3, 1, 2]`.\n\n"
                    "Dica: `set(valores)` remove as repetições, mas perde a "
                    "ordem."
                ),
                "solucao_autor": (
                    "def sem_repetidos(valores):\n"
                    "    vistos = set()\n"
                    "    resultado = []\n"
                    "    for valor in valores:\n"
                    "        if valor in vistos:\n"
                    "            continue\n"
                    "        vistos.add(valor)\n"
                    "        resultado.append(valor)\n"
                    "    return resultado\n"
                ),
            },
            {
                "slug": "contar-palavras",
                "titulo": "Contar palavras de um texto",
                "ordem": 4,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "Escreva `contar_palavras(texto)` que devolva um dicionário "
                    "com cada palavra e quantas vezes ela aparece. Ignore "
                    "maiúsculas e minúsculas.\n\n"
                    'Exemplo: `contar_palavras("um dois um")` deve devolver '
                    '`{"um": 2, "dois": 1}`.'
                ),
                "solucao_autor": (
                    "def contar_palavras(texto):\n"
                    "    contagem = {}\n"
                    "    for palavra in texto.lower().split():\n"
                    "        contagem[palavra] = contagem.get(palavra, 0) + 1\n"
                    "    return contagem\n"
                ),
            },
            {
                "slug": "lista-ou-dicionario",
                "titulo": "Lista ou dicionário?",
                "ordem": 5,
                "tipo": Tipo.TEORICO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "Você precisa guardar a nota de cada aluno e consultar pela "
                    "matrícula, muitas vezes por segundo.\n\n"
                    "Escolheria lista ou dicionário? Justifique pelo custo da "
                    "busca em cada uma."
                ),
                "solucao_autor": (
                    "Dicionário. A lista obriga a percorrer os elementos até "
                    "achar a matrícula, e o custo cresce com o tamanho. O "
                    "dicionário vai direto pela chave, com custo praticamente "
                    "constante. A lista só ganharia se a ordem importasse mais "
                    "que a busca."
                ),
            },
        ],
    },
    {
        "slug": "funcoes",
        "titulo": "Funções",
        "ordem": 5,
        "pre_requisito": "listas-e-colecoes",
        "conteudo": CONTEUDO_FUNCOES,
        "exercicios": [
            {
                "slug": "saudacao-com-padrao",
                "titulo": "Saudação com valor padrão",
                "ordem": 1,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INICIANTE,
                "enunciado": (
                    'Escreva `saudacao(nome, prefixo="Olá")` que devolva a '
                    "frase montada com o prefixo e o nome.\n\n"
                    'Exemplos: `saudacao("Ana")` devolve `"Olá, Ana!"` e '
                    '`saudacao("Ana", "Bom dia")` devolve `"Bom dia, Ana!"`.'
                ),
                "solucao_autor": (
                    'def saudacao(nome, prefixo="Olá"):\n'
                    '    return f"{prefixo}, {nome}!"\n'
                ),
            },
            {
                "slug": "aplicar-desconto",
                "titulo": "Aplicar desconto",
                "ordem": 2,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "Escreva `com_desconto(preco, percentual)` que devolva o "
                    "preço final.\n\n"
                    "Recuse percentual fora da faixa de 0 a 100 levantando "
                    "`ValueError`, antes de qualquer conta.\n\n"
                    "Exemplo: `com_desconto(200, 25)` deve devolver `150.0`."
                ),
                "solucao_autor": (
                    "def com_desconto(preco, percentual):\n"
                    "    if not 0 <= percentual <= 100:\n"
                    '        raise ValueError("percentual fora da faixa")\n'
                    "    return preco * (1 - percentual / 100)\n"
                ),
            },
            {
                "slug": "escopo-de-variavel",
                "titulo": "Por que o valor não mudou?",
                "ordem": 3,
                "tipo": Tipo.TEORICO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "O código abaixo imprime `10`, e não `20`. Explique por "
                    "quê.\n\n"
                    "```python\n"
                    "total = 10\n"
                    "\n"
                    "def dobrar():\n"
                    "    total = 20\n"
                    "\n"
                    "dobrar()\n"
                    "print(total)\n"
                    "```"
                ),
                "solucao_autor": (
                    "A atribuição dentro da função cria uma variável local, que "
                    "existe só enquanto a função roda e some ao terminar. O "
                    "`total` de fora nunca é tocado. O caminho correto é a "
                    "função devolver o novo valor com `return`, e quem chama "
                    "decidir o que fazer com ele."
                ),
            },
            {
                "slug": "validar-senha",
                "titulo": "Validar uma senha",
                "ordem": 4,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.AVANCADO,
                "enunciado": (
                    "Escreva `senha_valida(senha)` que devolva `True` apenas "
                    "quando a senha tiver ao menos 8 caracteres, uma letra "
                    "maiúscula, uma minúscula e um dígito.\n\n"
                    "Use `return` cedo para cada regra que falhar: a função "
                    "fica plana, sem `if` aninhado."
                ),
                "solucao_autor": (
                    "def senha_valida(senha):\n"
                    "    if len(senha) < 8:\n"
                    "        return False\n"
                    "    if not any(letra.isupper() for letra in senha):\n"
                    "        return False\n"
                    "    if not any(letra.islower() for letra in senha):\n"
                    "        return False\n"
                    "    return any(letra.isdigit() for letra in senha)\n"
                ),
            },
        ],
    },
    {
        "slug": "depuracao",
        "titulo": "Depuração e boas práticas",
        "ordem": 6,
        "pre_requisito": "funcoes",
        "conteudo": CONTEUDO_DEPURACAO,
        "exercicios": [
            {
                "slug": "mensagem-de-erro",
                "titulo": "Ler o traceback",
                "ordem": 1,
                "tipo": Tipo.TEORICO,
                "dificuldade": Dificuldade.INICIANTE,
                "enunciado": (
                    "Um programa termina com `IndexError: list index out of "
                    "range` na linha `print(notas[3])`.\n\n"
                    "O que essa mensagem diz sobre a lista `notas`, e qual é a "
                    "primeira coisa a verificar?"
                ),
                "solucao_autor": (
                    "A lista tem menos de 4 elementos: a posição 3 não existe. "
                    "O primeiro passo é imprimir `len(notas)` e o conteúdo da "
                    "lista logo antes da linha que quebrou, para descobrir se "
                    "ela chegou vazia ou menor do que o esperado."
                ),
            },
            {
                "slug": "achar-o-erro-do-loop",
                "titulo": "O acumulador no lugar errado",
                "ordem": 2,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "A função abaixo deveria somar a lista, mas sempre devolve "
                    "o último elemento. Corrija.\n\n"
                    "```python\n"
                    "def somar(numeros):\n"
                    "    for numero in numeros:\n"
                    "        total = 0\n"
                    "        total = total + numero\n"
                    "    return total\n"
                    "```"
                ),
                "solucao_autor": (
                    "def somar(numeros):\n"
                    "    total = 0\n"
                    "    for numero in numeros:\n"
                    "        total = total + numero\n"
                    "    return total\n"
                    "\n"
                    "# O `total = 0` estava dentro do loop e zerava o\n"
                    "# acumulador a cada volta. O lugar dele é antes do `for`.\n"
                ),
            },
            {
                "slug": "dividir-com-seguranca",
                "titulo": "Dividir sem quebrar",
                "ordem": 3,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "Escreva `dividir(a, b)` que devolva o resultado da divisão "
                    "e `None` quando o divisor for zero, sem deixar o "
                    "`ZeroDivisionError` escapar.\n\n"
                    "Exemplos: `dividir(10, 2)` devolve `5.0` e "
                    "`dividir(10, 0)` devolve `None`."
                ),
                "solucao_autor": (
                    "def dividir(a, b):\n"
                    "    if b == 0:\n"
                    "        return None\n"
                    "    return a / b\n"
                ),
            },
            {
                "slug": "refatorar-condicional",
                "titulo": "Achatar o if aninhado",
                "ordem": 4,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.AVANCADO,
                "enunciado": (
                    "Reescreva a função abaixo com `return` cedo, sem mudar o "
                    "comportamento e sem passar de um nível de indentação "
                    "dentro do corpo.\n\n"
                    "```python\n"
                    "def pode_dirigir(pessoa):\n"
                    "    if pessoa is not None:\n"
                    "        if pessoa.idade >= 18:\n"
                    "            if pessoa.tem_habilitacao:\n"
                    "                return True\n"
                    "    return False\n"
                    "```"
                ),
                "solucao_autor": (
                    "def pode_dirigir(pessoa):\n"
                    "    if pessoa is None:\n"
                    "        return False\n"
                    "    if pessoa.idade < 18:\n"
                    "        return False\n"
                    "    return pessoa.tem_habilitacao\n"
                ),
            },
        ],
    },
]


class Command(BaseCommand):
    help = "Cria ou atualiza as trilhas e o conteúdo inicial de Lógica de Programação."

    @transaction.atomic
    def handle(self, *args: Any, **options: Any) -> None:
        trilhas = self._semear_trilhas()
        aulas, exercicios = self._semear_conteudo(trilhas["logica-de-programacao"])
        self.stdout.write(
            self.style.SUCCESS(
                f"{len(trilhas)} trilhas, {aulas} aulas e {exercicios} "
                "exercícios sincronizados."
            )
        )

    def _semear_trilhas(self) -> dict[str, Trilha]:
        registros: dict[str, Trilha] = {}
        for dados in TRILHAS:
            trilha, _ = Trilha.objects.update_or_create(
                slug=dados["slug"],
                defaults={
                    "nome": dados["nome"],
                    "descricao": dados["descricao"],
                    "ordem": dados["ordem"],
                    "status": dados["status"],
                },
            )
            registros[dados["slug"]] = trilha
        return registros

    def _semear_conteudo(self, trilha: Trilha) -> tuple[int, int]:
        aulas: dict[str, Aula] = {}
        total_exercicios = 0

        for dados in AULAS:
            pre_requisito_slug = dados["pre_requisito"]
            aula, _ = Aula.objects.update_or_create(
                trilha=trilha,
                slug=dados["slug"],
                defaults={
                    "titulo": dados["titulo"],
                    "conteudo": dados["conteudo"],
                    "ordem": dados["ordem"],
                    "status": PUBLICADO,
                    "pre_requisito": (
                        aulas[pre_requisito_slug] if pre_requisito_slug else None
                    ),
                },
            )
            aulas[dados["slug"]] = aula

            for exercicio in dados["exercicios"]:
                Exercicio.objects.update_or_create(
                    trilha=trilha,
                    slug=exercicio["slug"],
                    defaults={
                        "aula": aula,
                        "titulo": exercicio["titulo"],
                        "enunciado": exercicio["enunciado"],
                        "tipo": exercicio["tipo"],
                        "dificuldade": exercicio["dificuldade"],
                        "ordem": exercicio["ordem"],
                        "solucao_autor": exercicio["solucao_autor"],
                        "status": PUBLICADO,
                    },
                )
                total_exercicios += 1

        return len(aulas), total_exercicios
