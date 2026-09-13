"""Conteúdo da trilha de Python.

Vem depois de Lógica de Programação e não repete o que já foi visto lá:
variável, condicional, repetição e função já são conhecidas. O que esta trilha
acrescenta é o que a linguagem tem de próprio — texto, estruturas de dados,
compreensões, exceções e o mundo fora do programa (arquivos e módulos).
"""

from apps.trilhas.models import Dificuldade, Tipo

from ._tipos_seed import AulaSeed

CONTEUDO_TEXTO = """## Texto é uma sequência

Uma string é uma sequência de caracteres, e por isso responde a `len()`, a
índice e a fatia, como uma lista responderia.

```python
nome = "CodeQuest"
nome[0]      # "C"
nome[-1]     # "t"
nome[0:4]    # "Code"
len(nome)    # 9
```

O índice negativo conta de trás para frente, e a fatia `[inicio:fim]` inclui o
início e exclui o fim. Esse "exclui o fim" é o que faz `nome[0:4]` ter
exatamente 4 caracteres.

## Strings não mudam

```python
nome = "codequest"
nome.upper()   # "CODEQUEST"
nome           # "codequest"
```

`upper()` não alterou `nome`: devolveu uma string nova. Todo método de string
funciona assim. Quem espera que `nome.upper()` mude a variável acaba jogando o
resultado fora, e esse é um dos erros mais comuns de quem está começando.

Para guardar o resultado é preciso atribuir: `nome = nome.upper()`.

## Os métodos que resolvem o dia a dia

- `strip()` remove espaço em branco das pontas. Use sempre em texto que veio
  de fora do programa.
- `split(separador)` quebra em lista. Sem argumento, quebra em qualquer espaço.
- `separador.join(lista)` faz o caminho inverso, e é o jeito certo de juntar
  muitos pedaços.
- `replace(de, para)` troca todas as ocorrências.
- `startswith()` e `endswith()` perguntam pelas pontas sem fatiar.

## Formatar com f-string

```python
nome = "Ana"
nota = 8.456
f"{nome} tirou {nota:.1f}"   # "Ana tirou 8.5"
```

O `f` antes das aspas liga a interpolação, e o que vem depois dos dois-pontos
é o formato: `.1f` arredonda para uma casa decimal. Concatenar com `+` obriga
a converter tudo para texto na mão, e erra na primeira vez que um número passa
pelo caminho.
"""

CONTEUDO_ESTRUTURAS = """## Três estruturas, três perguntas

Lista, dicionário e conjunto guardam coleções, mas respondem a perguntas
diferentes. Escolher errado funciona e fica lento, o que é pior do que quebrar.

| Estrutura | Pergunta que responde bem | Sintaxe |
|---|---|---|
| `list` | "o que vem na posição 3?" | `[1, 2, 3]` |
| `dict` | "qual o valor desta chave?" | `{"a": 1}` |
| `set` | "este item já apareceu?" | `{1, 2, 3}` |

## Dicionário: a chave é o índice

```python
aluno = {"nome": "Ana", "nivel": 12}
aluno["nome"]           # "Ana"
aluno["turma"]          # KeyError
aluno.get("turma")      # None
aluno.get("turma", "-") # "-"
```

`[]` quebra quando a chave não existe; `get()` devolve `None` ou o padrão que
você der. Use `[]` quando a ausência é um erro de verdade, e `get()` quando
ela é esperada. Escolher `get()` por medo esconde bugs.

Percorrer em pares:

```python
for chave, valor in aluno.items():
    print(chave, valor)
```

## Conjunto: pertence ou não pertence

Um `set` não guarda ordem nem repetição, e é isso que o torna a ferramenta
certa para duas coisas: tirar duplicatas (`set(lista)`) e perguntar se algo
está lá (`item in conjunto`).

A busca num `set` não depende do tamanho dele. Num `list`, procurar um item
percorre os itens um a um. Numa coleção de mil elementos consultada mil vezes,
essa diferença deixa de ser detalhe.

## Mutável por referência

```python
a = [1, 2]
b = a
b.append(3)
a            # [1, 2, 3]
```

`b = a` não copiou nada: os dois nomes apontam para a mesma lista. Para copiar
de fato, `a.copy()` ou `list(a)`. Esse é o motivo de nunca usar lista ou
dicionário como valor padrão de parâmetro.
"""

CONTEUDO_COMPREENSOES = """## Transformar uma coleção

O laço que cria uma lista a partir de outra tem forma fixa: cria vazia,
percorre, anexa.

```python
dobros = []
for n in numeros:
    dobros.append(n * 2)
```

A compreensão diz a mesma coisa numa linha, e diz melhor, porque o nome
`dobros` já nasce com o valor final:

```python
dobros = [n * 2 for n in numeros]
```

## Filtrar no caminho

```python
pares = [n for n in numeros if n % 2 == 0]
```

O `if` no fim descarta o que não interessa. Ele filtra; ele não escolhe entre
dois valores. Para escolher, o `if/else` vai antes do `for`:

```python
rotulos = ["par" if n % 2 == 0 else "impar" for n in numeros]
```

São duas construções diferentes que se parecem, e trocá-las é erro de sintaxe
num caso e resultado errado no outro.

## Também vale para dicionário e conjunto

```python
{aluno: nota for aluno, nota in pares}
{palavra.lower() for palavra in palavras}
```

## Quando não usar

A compreensão serve para transformar e filtrar. Quando começa a ter duas
condições, dois `for` aninhados ou uma chamada longa dentro, o laço comum é
mais legível. Compreensão não é prêmio por escrever menos linha.

## Enumerar e emparelhar

```python
for i, item in enumerate(itens, start=1):
    print(i, item)

for nome, nota in zip(nomes, notas):
    print(nome, nota)
```

`enumerate` dá o índice junto do item, e dispensa o contador manual.
`zip` anda em duas coleções ao mesmo tempo e para na menor.
"""

CONTEUDO_FUNCOES = """## Argumentos com nome

```python
def criar(nome, nivel=1, ativo=True):
    ...

criar("Ana")
criar("Ana", 5)
criar("Ana", ativo=False)
```

Parâmetros com valor padrão vêm depois dos obrigatórios. Na chamada, passar
pelo nome (`ativo=False`) deixa claro o que cada valor significa:
`criar("Ana", 5, False)` obriga quem lê a ir conferir a assinatura.

## A armadilha do padrão mutável

```python
def adicionar(item, lista=[]):   # errado
    lista.append(item)
    return lista

adicionar("a")   # ["a"]
adicionar("b")   # ["a", "b"]  <- a mesma lista de antes
```

O valor padrão é criado **uma vez**, quando a função é definida, e não a cada
chamada. Com lista ou dicionário no padrão, o estado vaza de uma chamada para
a outra. A forma correta usa `None` como sinal:

```python
def adicionar(item, lista=None):
    if lista is None:
        lista = []
    lista.append(item)
    return lista
```

## Devolver mais de um valor

```python
def dividir(a, b):
    return a // b, a % b

inteiro, resto = dividir(7, 2)
```

Na verdade é uma tupla só, desempacotada na atribuição.

## Escopo

Um nome atribuído dentro da função vive só nela. Ler uma variável de fora
funciona; atribuir cria uma nova, local, e a de fora continua intacta. Se uma
função precisa alterar algo de fora, o caminho honesto é receber por parâmetro
e devolver o resultado, não mexer no que é global.

## Uma função, um trabalho

Uma função que calcula e imprime faz duas coisas, e só pode ser reaproveitada
por quem também quer a impressão. Calcular e devolver deixa a decisão de
mostrar para quem chamou.
"""

CONTEUDO_EXCECOES = """## Erro não é fim de programa

Quando algo dá errado, Python levanta uma exceção. Sem tratamento, ela sobe
até o topo e derruba o programa.

```python
try:
    idade = int(texto)
except ValueError:
    idade = 0
```

## Capture o que você sabe tratar

```python
except Exception:   # quase sempre errado
    pass
```

Isso engole tudo: o erro de digitação, a falta de memória, o `Ctrl+C` do
usuário. O programa segue quebrado, em silêncio, e o bug aparece três camadas
adiante sem pista de onde nasceu.

Capture a exceção específica que você sabe tratar, e deixe o resto subir. Uma
falha visível é melhor do que uma falha escondida.

## As mais comuns

- `ValueError`: o tipo está certo, o valor não. `int("abc")`.
- `TypeError`: o tipo está errado. `"a" + 1`.
- `KeyError` e `IndexError`: chave ou posição que não existe.
- `ZeroDivisionError`: divisão por zero.
- `FileNotFoundError`: o arquivo não está lá.

## else e finally

```python
try:
    arquivo = open(caminho)
except FileNotFoundError:
    print("não achei")
else:
    print(arquivo.read())    # só roda se não houve erro
finally:
    print("sempre roda")     # limpeza, com erro ou sem
```

## Levantar a sua

```python
def raiz(n):
    if n < 0:
        raise ValueError("raiz de número negativo")
    return n ** 0.5
```

Falhar cedo, com mensagem que diz o que aconteceu, custa menos do que devolver
um valor estranho que só vai explodir lá na frente.
"""

CONTEUDO_ARQUIVOS = """## Abrir com with

```python
with open("notas.txt", encoding="utf-8") as arquivo:
    conteudo = arquivo.read()
```

O `with` fecha o arquivo ao sair do bloco, inclusive se der erro no meio. Sem
ele é preciso lembrar do `close()` em todos os caminhos de saída, e um deles
sempre escapa.

`encoding="utf-8"` não é opcional: sem ele, o Python usa a codificação padrão
do sistema, que muda entre Windows e Linux. É assim que acento vira símbolo
estranho na máquina do colega.

## Ler e escrever

```python
arquivo.read()        # tudo num texto só
arquivo.readlines()   # lista de linhas
for linha in arquivo: # uma por vez, sem carregar tudo
    ...
```

O modo decide o que pode ser feito: `"r"` lê (padrão), `"w"` escreve **e apaga
o que havia**, `"a"` acrescenta no fim. Trocar `"a"` por `"w"` sem querer apaga
o arquivo inteiro, e não há aviso.

## Caminhos

```python
from pathlib import Path

destino = Path("dados") / "notas.txt"
destino.exists()
destino.parent.mkdir(parents=True, exist_ok=True)
```

`Path` monta caminho com `/` e resolve a diferença entre as barras do Windows
e do Linux. Montar caminho concatenando texto funciona numa máquina só.

## Módulos

Todo arquivo `.py` é um módulo importável:

```python
import math
from math import sqrt
from meu_modulo import minha_funcao
```

```python
if __name__ == "__main__":
    main()
```

Esse bloco só roda quando o arquivo é executado direto. Sem ele, importar o
módulo executa o script inteiro como efeito colateral do `import`.

## Ambiente virtual

```
python -m venv venv
pip install requests
pip freeze > requirements.txt
```

O `venv` isola as dependências de um projeto das do outro. Instalar tudo no
Python do sistema faz dois projetos disputarem a mesma versão de biblioteca, e
um deles perde.
"""

AULAS_PYTHON: list[AulaSeed] = [
    {
        "slug": "texto-e-formatacao",
        "titulo": "Texto e formatação",
        "ordem": 1,
        "pre_requisito": None,
        "conteudo": CONTEUDO_TEXTO,
        "exercicios": [
            {
                "slug": "iniciais-do-nome",
                "titulo": "Iniciais do nome",
                "ordem": 1,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INICIANTE,
                "enunciado": (
                    "Escreva `iniciais(nome_completo)` que devolva as iniciais "
                    "em maiúsculas, separadas por ponto.\n\n"
                    'Exemplo: `iniciais("ana paula souza")` devolve `"A.P.S"`.'
                ),
                "solucao_autor": (
                    "def iniciais(nome_completo):\n"
                    '    return ".".join(p[0].upper() for p in nome_completo.split())\n'
                ),
            },
            {
                "slug": "limpar-entrada",
                "titulo": "Limpar o que veio de fora",
                "ordem": 2,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INICIANTE,
                "enunciado": (
                    "Escreva `normalizar(email)` que remova espaços das pontas "
                    "e devolva o endereço em minúsculas.\n\n"
                    'Exemplo: `normalizar("  Ana@Email.COM ")` devolve '
                    '`"ana@email.com"`.'
                ),
                "solucao_autor": (
                    "def normalizar(email):\n    return email.strip().lower()\n"
                ),
            },
            {
                "slug": "string-nao-muda",
                "titulo": "Por que o nome não mudou?",
                "ordem": 3,
                "tipo": Tipo.TEORICO,
                "dificuldade": Dificuldade.INICIANTE,
                "enunciado": (
                    "O código abaixo imprime `ana`, e não `ANA`. Explique por "
                    "quê e corrija.\n\n"
                    "```python\n"
                    'nome = "ana"\n'
                    "nome.upper()\n"
                    "print(nome)\n"
                    "```"
                ),
                "solucao_autor": (
                    "Strings são imutáveis: `upper()` não altera `nome`, devolve "
                    "uma string nova, que foi descartada porque ninguém a "
                    "guardou. A correção é atribuir o retorno: "
                    "`nome = nome.upper()`."
                ),
            },
            {
                "slug": "boletim-formatado",
                "titulo": "Boletim formatado",
                "ordem": 4,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "Escreva `linha_do_boletim(nome, nota)` que devolva o nome "
                    "seguido da nota com duas casas decimais, separados por "
                    "dois-pontos e um espaço.\n\n"
                    'Exemplo: `linha_do_boletim("Ana", 8.456)` devolve '
                    '`"Ana: 8.46"`.\n\n'
                    "Use f-string, não concatenação."
                ),
                "solucao_autor": (
                    "def linha_do_boletim(nome, nota):\n"
                    '    return f"{nome}: {nota:.2f}"\n'
                ),
            },
        ],
    },
    {
        "slug": "listas-dicionarios-e-conjuntos",
        "titulo": "Listas, dicionários e conjuntos",
        "ordem": 2,
        "pre_requisito": "texto-e-formatacao",
        "conteudo": CONTEUDO_ESTRUTURAS,
        "exercicios": [
            {
                "slug": "contar-palavras",
                "titulo": "Contar palavras",
                "ordem": 1,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "Escreva `contar(frase)` que devolva um dicionário com "
                    "quantas vezes cada palavra aparece.\n\n"
                    'Exemplo: `contar("a b a")` devolve `{"a": 2, "b": 1}`.'
                ),
                "solucao_autor": (
                    "def contar(frase):\n"
                    "    total = {}\n"
                    "    for palavra in frase.split():\n"
                    "        total[palavra] = total.get(palavra, 0) + 1\n"
                    "    return total\n"
                ),
            },
            {
                "slug": "remover-duplicatas",
                "titulo": "Remover duplicatas mantendo a ordem",
                "ordem": 2,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "Escreva `sem_repetir(itens)` que devolva a lista sem "
                    "duplicatas, preservando a ordem da primeira aparição.\n\n"
                    "Exemplo: `sem_repetir([3, 1, 3, 2, 1])` devolve "
                    "`[3, 1, 2]`.\n\n"
                    "Dica: `set(itens)` tira as repetições mas perde a ordem."
                ),
                "solucao_autor": (
                    "def sem_repetir(itens):\n"
                    "    vistos = set()\n"
                    "    saida = []\n"
                    "    for item in itens:\n"
                    "        if item not in vistos:\n"
                    "            vistos.add(item)\n"
                    "            saida.append(item)\n"
                    "    return saida\n"
                ),
            },
            {
                "slug": "colchete-ou-get",
                "titulo": "Colchete ou get?",
                "ordem": 3,
                "tipo": Tipo.TEORICO,
                "dificuldade": Dificuldade.INICIANTE,
                "enunciado": (
                    "Qual a diferença entre `aluno['turma']` e "
                    "`aluno.get('turma')` quando a chave não existe? Dê um caso "
                    "em que cada um é a escolha certa."
                ),
                "solucao_autor": (
                    "`[]` levanta `KeyError`; `get()` devolve `None` (ou o padrão "
                    "informado). Use `[]` quando a ausência da chave é um erro de "
                    "programação que deve aparecer na hora, como um campo "
                    "obrigatório. Use `get()` quando a ausência é prevista, como "
                    "um campo opcional com valor padrão. Usar `get()` por toda "
                    "parte esconde erros reais atrás de `None`."
                ),
            },
            {
                "slug": "media-por-aluno",
                "titulo": "Média por aluno",
                "ordem": 4,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "Recebendo um dicionário de nome para lista de notas, "
                    "escreva `medias(notas)` que devolva um dicionário de nome "
                    "para a média.\n\n"
                    'Exemplo: `medias({"Ana": [8, 6]})` devolve `{"Ana": 7.0}`.'
                    "\n\n"
                    "Aluno sem nota nenhuma deve ficar com `0.0`, e não quebrar."
                ),
                "solucao_autor": (
                    "def medias(notas):\n"
                    "    return {\n"
                    "        nome: (sum(lista) / len(lista) if lista else 0.0)\n"
                    "        for nome, lista in notas.items()\n"
                    "    }\n"
                ),
            },
            {
                "slug": "duas-listas-viraram-uma",
                "titulo": "Por que as duas listas mudaram?",
                "ordem": 5,
                "tipo": Tipo.TEORICO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "Explique por que `a` termina como `[1, 2, 3]` e como "
                    "corrigir para que ela continue `[1, 2]`.\n\n"
                    "```python\n"
                    "a = [1, 2]\n"
                    "b = a\n"
                    "b.append(3)\n"
                    "```"
                ),
                "solucao_autor": (
                    "`b = a` não copia a lista: cria um segundo nome para o mesmo "
                    "objeto, então alterar por um dos nomes é visível pelo outro. "
                    "Para uma cópia independente, use `b = a.copy()` ou "
                    "`b = list(a)`."
                ),
            },
        ],
    },
    {
        "slug": "compreensoes-e-iteracao",
        "titulo": "Compreensões e iteração",
        "ordem": 3,
        "pre_requisito": "listas-dicionarios-e-conjuntos",
        "conteudo": CONTEUDO_COMPREENSOES,
        "exercicios": [
            {
                "slug": "quadrados-pares",
                "titulo": "Quadrados dos pares",
                "ordem": 1,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INICIANTE,
                "enunciado": (
                    "Escreva `quadrados_pares(numeros)` que devolva os quadrados "
                    "apenas dos números pares, usando uma compreensão.\n\n"
                    "Exemplo: `quadrados_pares([1, 2, 3, 4])` devolve `[4, 16]`."
                ),
                "solucao_autor": (
                    "def quadrados_pares(numeros):\n"
                    "    return [n**2 for n in numeros if n % 2 == 0]\n"
                ),
            },
            {
                "slug": "filtro-ou-escolha",
                "titulo": "Filtrar ou escolher?",
                "ordem": 2,
                "tipo": Tipo.TEORICO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "Explique a diferença entre as duas linhas e diga o que cada "
                    "uma devolve para `[1, 2, 3, 4]`.\n\n"
                    "```python\n"
                    "[n for n in nums if n % 2 == 0]\n"
                    '["par" if n % 2 == 0 else "impar" for n in nums]\n'
                    "```"
                ),
                "solucao_autor": (
                    "A primeira filtra: o `if` no fim decide se o item entra na "
                    "lista, que sai menor. Devolve `[2, 4]`. A segunda escolhe "
                    "entre dois valores para cada item: o `if/else` vem antes do "
                    "`for` e é uma expressão, então a lista mantém o tamanho "
                    'original. Devolve `["impar", "par", "impar", "par"]`.'
                ),
            },
            {
                "slug": "indice-e-item",
                "titulo": "Numerar a lista",
                "ordem": 3,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INICIANTE,
                "enunciado": (
                    "Escreva `numerar(itens)` que devolva uma lista de strings no "
                    'formato `"1. item"`, começando em 1.\n\n'
                    'Exemplo: `numerar(["a", "b"])` devolve `["1. a", "2. b"]`.'
                    "\n\n"
                    "Use `enumerate`, sem contador manual."
                ),
                "solucao_autor": (
                    "def numerar(itens):\n"
                    "    return [\n"
                    '        f"{i}. {item}" for i, item in enumerate(itens, start=1)\n'
                    "    ]\n"
                ),
            },
            {
                "slug": "juntar-nomes-e-notas",
                "titulo": "Juntar nomes e notas",
                "ordem": 4,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "Escreva `aprovados(nomes, notas)` que devolva os nomes de "
                    "quem tirou 7 ou mais. As duas listas vêm na mesma ordem.\n\n"
                    'Exemplo: `aprovados(["Ana", "Bia"], [8, 5])` devolve '
                    '`["Ana"]`.'
                ),
                "solucao_autor": (
                    "def aprovados(nomes, notas):\n"
                    "    return [\n"
                    "        nome for nome, nota in zip(nomes, notas) if nota >= 7\n"
                    "    ]\n"
                ),
            },
        ],
    },
    {
        "slug": "funcoes-e-argumentos",
        "titulo": "Funções e argumentos",
        "ordem": 4,
        "pre_requisito": "compreensoes-e-iteracao",
        "conteudo": CONTEUDO_FUNCOES,
        "exercicios": [
            {
                "slug": "saudacao-com-padrao",
                "titulo": "Saudação com padrão",
                "ordem": 1,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INICIANTE,
                "enunciado": (
                    'Escreva `saudacao(nome, prefixo="Olá")` que devolva o '
                    "prefixo, um espaço, o nome e um ponto de exclamação.\n\n"
                    'Exemplo: `saudacao("Ana")` devolve `"Olá Ana!"` e '
                    '`saudacao("Ana", "Oi")` devolve `"Oi Ana!"`.'
                ),
                "solucao_autor": (
                    'def saudacao(nome, prefixo="Olá"):\n'
                    '    return f"{prefixo} {nome}!"\n'
                ),
            },
            {
                "slug": "padrao-mutavel",
                "titulo": "A lista que não esvazia",
                "ordem": 2,
                "tipo": Tipo.TEORICO,
                "dificuldade": Dificuldade.AVANCADO,
                "enunciado": (
                    "A função abaixo devolve `['a']` na primeira chamada e "
                    "`['a', 'b']` na segunda, mesmo sem ninguém passar lista. "
                    "Explique por quê e corrija.\n\n"
                    "```python\n"
                    "def adicionar(item, lista=[]):\n"
                    "    lista.append(item)\n"
                    "    return lista\n"
                    "```"
                ),
                "solucao_autor": (
                    "O valor padrão é avaliado uma única vez, quando a função é "
                    "definida, e não a cada chamada. Todas as chamadas sem "
                    "argumento compartilham a mesma lista, que vai acumulando. A "
                    "correção usa `None` como sinal:\n\n"
                    "```python\n"
                    "def adicionar(item, lista=None):\n"
                    "    if lista is None:\n"
                    "        lista = []\n"
                    "    lista.append(item)\n"
                    "    return lista\n"
                    "```"
                ),
            },
            {
                "slug": "divisao-com-resto",
                "titulo": "Divisão com resto",
                "ordem": 3,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INICIANTE,
                "enunciado": (
                    "Escreva `dividir(a, b)` que devolva o quociente inteiro e o "
                    "resto, nessa ordem.\n\n"
                    "Exemplo: `dividir(7, 2)` devolve `(3, 1)`."
                ),
                "solucao_autor": "def dividir(a, b):\n    return a // b, a % b\n",
            },
            {
                "slug": "calcular-ou-imprimir",
                "titulo": "Calcular ou imprimir?",
                "ordem": 4,
                "tipo": Tipo.TEORICO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "Por que uma função que calcula a média e já imprime o "
                    "resultado é pior do que uma que só devolve o número?"
                ),
                "solucao_autor": (
                    "Porque ela faz duas coisas e só serve para quem quer as "
                    "duas. Quem precisar da média para somar, gravar em arquivo "
                    "ou mostrar numa tela não consegue reaproveitá-la, e ainda "
                    "ganha uma impressão indesejada. Também fica difícil de "
                    "testar: verificar um retorno é direto, verificar o que foi "
                    "impresso exige capturar a saída. Quem calcula devolve; quem "
                    "chamou decide o que fazer com o valor."
                ),
            },
        ],
    },
    {
        "slug": "erros-e-excecoes",
        "titulo": "Erros e exceções",
        "ordem": 5,
        "pre_requisito": "funcoes-e-argumentos",
        "conteudo": CONTEUDO_EXCECOES,
        "exercicios": [
            {
                "slug": "inteiro-seguro",
                "titulo": "Converter sem quebrar",
                "ordem": 1,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INICIANTE,
                "enunciado": (
                    "Escreva `para_inteiro(texto, padrao=0)` que devolva o texto "
                    "convertido para inteiro, ou o padrão se a conversão "
                    "falhar.\n\n"
                    'Exemplo: `para_inteiro("42")` devolve `42` e '
                    '`para_inteiro("abc")` devolve `0`.\n\n'
                    "Capture apenas a exceção que pode acontecer aqui."
                ),
                "solucao_autor": (
                    "def para_inteiro(texto, padrao=0):\n"
                    "    try:\n"
                    "        return int(texto)\n"
                    "    except ValueError:\n"
                    "        return padrao\n"
                ),
            },
            {
                "slug": "except-generico",
                "titulo": "O except que engole tudo",
                "ordem": 2,
                "tipo": Tipo.TEORICO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "Por que `except Exception: pass` é considerado um erro "
                    "grave, mesmo quando o programa parece funcionar?"
                ),
                "solucao_autor": (
                    "Porque captura falhas que não têm nada a ver com o que se "
                    "queria tratar: um nome digitado errado, um erro de tipo, uma "
                    "falha de rede. O programa segue com estado inválido e o "
                    "sintoma aparece bem longe da causa, sem rastro. O `pass` "
                    "ainda apaga a mensagem, então nem o log sobra. A regra é "
                    "capturar a exceção específica que se sabe tratar e deixar o "
                    "resto subir."
                ),
            },
            {
                "slug": "raiz-com-validacao",
                "titulo": "Falhar cedo",
                "ordem": 3,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "Escreva `raiz(numero)` que devolva a raiz quadrada e "
                    "levante `ValueError` com uma mensagem clara se o número for "
                    "negativo."
                ),
                "solucao_autor": (
                    "def raiz(numero):\n"
                    "    if numero < 0:\n"
                    '        raise ValueError("não há raiz real de número negativo")\n'
                    "    return numero**0.5\n"
                ),
            },
            {
                "slug": "media-lista-vazia",
                "titulo": "Média de lista vazia",
                "ordem": 4,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "Escreva `media(notas)` que devolva a média da lista. Com "
                    "lista vazia, devolva `0.0` em vez de deixar estourar "
                    "`ZeroDivisionError`.\n\n"
                    "Resolva com uma verificação, não com `try`: o caso vazio é "
                    "previsto, não excepcional."
                ),
                "solucao_autor": (
                    "def media(notas):\n"
                    "    if not notas:\n"
                    "        return 0.0\n"
                    "    return sum(notas) / len(notas)\n"
                ),
            },
        ],
    },
    {
        "slug": "arquivos-e-modulos",
        "titulo": "Arquivos e módulos",
        "ordem": 6,
        "pre_requisito": "erros-e-excecoes",
        "conteudo": CONTEUDO_ARQUIVOS,
        "exercicios": [
            {
                "slug": "contar-linhas",
                "titulo": "Contar linhas do arquivo",
                "ordem": 1,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INICIANTE,
                "enunciado": (
                    "Escreva `contar_linhas(caminho)` que devolva quantas linhas "
                    "o arquivo tem. Use `with` e informe o encoding."
                ),
                "solucao_autor": (
                    "def contar_linhas(caminho):\n"
                    '    with open(caminho, encoding="utf-8") as arquivo:\n'
                    "        return sum(1 for _ in arquivo)\n"
                ),
            },
            {
                "slug": "por-que-with",
                "titulo": "Por que with?",
                "ordem": 2,
                "tipo": Tipo.TEORICO,
                "dificuldade": Dificuldade.INICIANTE,
                "enunciado": (
                    "O que o `with open(...)` garante que o par `open()` e "
                    "`close()` escrito na mão não garante?"
                ),
                "solucao_autor": (
                    "Que o arquivo é fechado ao sair do bloco por qualquer "
                    "caminho, inclusive quando uma exceção acontece no meio da "
                    "leitura ou quando há um `return` antes do fim. Escrito na "
                    "mão, o `close()` precisa estar em todos os caminhos de "
                    "saída, e um deles sempre escapa. Arquivo aberto demais trava "
                    "a escrita de outros processos e esgota descritores."
                ),
            },
            {
                "slug": "modo-de-abertura",
                "titulo": "O modo que apagou o arquivo",
                "ordem": 3,
                "tipo": Tipo.TEORICO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "Um script que deveria acrescentar uma linha ao fim do "
                    "registro apagou o histórico inteiro. Qual foi o erro, e qual "
                    'a diferença entre os modos `"w"` e `"a"`?'
                ),
                "solucao_autor": (
                    'O script abriu com `"w"`, que trunca o arquivo no momento da '
                    "abertura, antes mesmo de escrever qualquer coisa. O modo "
                    'correto é `"a"`, que posiciona no fim e preserva o que já '
                    "estava lá. Nenhum dos dois avisa nem pede confirmação."
                ),
            },
            {
                "slug": "salvar-linhas",
                "titulo": "Gravar uma lista",
                "ordem": 4,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "Escreva `salvar(caminho, linhas)` que grave cada item da "
                    "lista numa linha do arquivo, substituindo o conteúdo "
                    "anterior."
                ),
                "solucao_autor": (
                    "def salvar(caminho, linhas):\n"
                    '    with open(caminho, "w", encoding="utf-8") as arquivo:\n'
                    "        for linha in linhas:\n"
                    '            arquivo.write(f"{linha}\\n")\n'
                ),
            },
            {
                "slug": "main-guard",
                "titulo": "O bloco __main__",
                "ordem": 5,
                "tipo": Tipo.TEORICO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    'Para que serve `if __name__ == "__main__":` e o que acontece '
                    "com um script que não tem esse bloco quando alguém o importa?"
                ),
                "solucao_autor": (
                    "Ele separa o que roda quando o arquivo é executado direto do "
                    "que roda quando ele é importado. Sem o bloco, o `import` "
                    "executa o script inteiro como efeito colateral: o menu "
                    "aparece, o arquivo é gravado, a requisição é feita. Quem só "
                    "queria reaproveitar uma função leva o programa junto."
                ),
            },
        ],
    },
]
