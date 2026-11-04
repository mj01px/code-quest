from typing import TypedDict


class QuestaoSeed(TypedDict):
    enunciado: str
    opcoes: list[str]
    correta: str


class FlashcardSeed(TypedDict):
    pergunta: str
    resposta: str
    dica: str


class CasoSeed(TypedDict):
    argumentos: list[object]
    esperado: object
    visivel: bool


class CorrecaoSeed(TypedDict):
    funcao: str
    codigo_inicial: str
    casos: list[CasoSeed]


class AprenderSeed(TypedDict):
    contexto: str
    exemplo: str


class LicaoSeed(TypedDict):
    trilha: str
    aula: str
    conteudo: str
    fases: list[str]
    remover: list[str]
    questoes: list[QuestaoSeed]
    flashcards: list[FlashcardSeed]
    correcao: dict[str, CorrecaoSeed]
    aprender: dict[str, AprenderSeed]


def _caso(argumentos: list[object], esperado: object, visivel: bool) -> CasoSeed:
    return {"argumentos": argumentos, "esperado": esperado, "visivel": visivel}


LICAO_VARIAVEIS = """Todo programa guarda informação. Nesta lição você descobre onde ela mora, que forma ela tem e como mudar o valor guardado sem se perder.

## 1. Guardar um valor

Uma **variável** é um nome que aponta para um valor guardado na memória. Você escolhe o nome, e o computador cuida de onde guardar.

```python
idade = 17
nome = "Ana"
```

A partir daqui, sempre que o programa encontrar `idade`, ele usa o valor `17`.

> **Regra prática:** escolha nomes que contam o que o valor significa. `x` não diz nada, e `nota_final` diz tudo.

## 2. O sinal de igual é uma ordem

Em matemática, `=` afirma que dois lados são iguais. Em programação, `=` é uma **ordem**: calcule o que está à direita e guarde no nome da esquerda.

```python
pontos = 4
pontos = pontos + 3
print(pontos)   # 7
```

A segunda linha parece absurda como equação, mas como ordem ela faz todo o sentido. O Python faz assim:

1. Lê o lado direito: `pontos + 3`.
2. Troca `pontos` pelo valor que ele tem **agora**, que é 4. Então calcula `4 + 3`, que dá `7`.
3. Guarda `7` no nome `pontos`. O 4 antigo se perde.

> **Regra prática:** leia o `=` como "recebe". `pontos = pontos + 3` quer dizer "pontos recebe o valor atual de pontos mais 3".

## 3. Cada valor tem um tipo

O tipo diz que espécie de valor é aquele e o que dá para fazer com ele. Os quatro que você vai usar todo dia são estes:

| Tipo | O que guarda | Exemplo |
|---|---|---|
| `int` | número inteiro | `17` |
| `float` | número com casas decimais | `1.62` |
| `str` | texto, sempre entre aspas | `"Ana"` |
| `bool` | verdadeiro ou falso | `True` |

As aspas fazem toda a diferença: `7` é um número, e `"7"` é um texto que por acaso tem o caractere 7.

## 4. O tipo muda o que o operador faz

O mesmo sinal faz coisas diferentes conforme o tipo dos valores:

```python
5 + 2        # 7, soma de números
"5" + "2"    # "52", texto colado com texto
```

Com números, `+` soma. Com textos, `+` **concatena**, que quer dizer colar um texto no outro. É por isso que `"5" + "2"` dá `"52"`, e o resultado continua sendo texto.

Multiplicar texto também existe e engana: `"21" * 2` dá `"2121"`, o texto repetido duas vezes.

## 5. Divisão sempre devolve float

```python
10 / 2    # 5.0
7 / 2     # 3.5
10 // 2   # 5
7 // 2    # 3
```

O operador `/` **sempre** devolve `float` no Python 3, mesmo quando a conta é exata. É por isso que `10 / 2` dá `5.0`, e não `5`. Quando você quer só a parte inteira, use `//`.

## 6. Converter de propósito

Tudo o que vem de fora do programa, como o que a pessoa digita ou o que vem de um arquivo, chega como **texto**. Antes de fazer conta, é preciso converter:

```python
texto = "21"
numero = int(texto)   # 21, agora é int
numero * 2            # 42
str(42)               # "42", de volta para texto
```

`int()` transforma em inteiro, `float()` em decimal e `str()` em texto. Converter é sempre o primeiro passo antes de calcular com o que veio de fora.

## 7. Trocar dois valores

Às vezes você precisa que `a` fique com o valor de `b`, e `b` com o de `a`. Se fizer uma coisa de cada vez, perde um dos valores:

```python
a = 1
b = 2
a = b     # agora a = 2, e o 1 sumiu
b = a     # b = 2 também
```

O Python resolve isso em uma linha só, porque calcula **todo o lado direito antes** de guardar:

```python
a, b = b, a   # a = 2, b = 1
```

## 8. Como responder os exercícios

Os exercícios desta trilha pedem uma **função**: um bloco de código com nome, que recebe valores e devolve um resultado. Você vai aprender funções a fundo mais à frente. Por enquanto, basta saber o formato:

```python
def dobro(numero):
    return numero * 2
```

- `def` abre a função, e `dobro` é o nome dela.
- `numero` é o valor que ela recebe.
- `return` devolve o resultado para quem chamou.

Quando o exercício pede "escreva `media(nota1, nota2)`", você escreve uma função com esse nome e esses dois valores de entrada, e devolve a conta com `return`.

## Resumo

- Variável é um nome para um valor, e `=` quer dizer "recebe".
- O lado direito do `=` é calculado primeiro, com os valores atuais.
- O tipo decide o que o operador faz: `+` soma números e cola textos.
- `/` sempre devolve `float`, e `//` devolve só a parte inteira.
- O que vem de fora chega como texto: converta com `int()` antes de calcular.
- `a, b = b, a` troca dois valores sem perder nenhum.
"""

LICAO_TEXTO = """Quase todo dado que um programa recebe é texto: nomes, e-mails, mensagens. Nesta lição você aprende a ler, limpar e montar texto com segurança.

## 1. Texto é uma sequência

Uma string é uma sequência de caracteres. Por isso ela responde a `len()`, a índice e a fatia:

```python
nome = "CodeQuest"
nome[0]      # "C", o primeiro caractere
nome[-1]     # "t", o último
nome[0:4]    # "Code"
len(nome)    # 9
```

- O índice começa em **zero**: `nome[0]` é o primeiro caractere.
- O índice negativo conta de trás para frente: `nome[-1]` é o último.
- A fatia `[inicio:fim]` inclui o início e **exclui** o fim. É por isso que `nome[0:4]` tem exatamente 4 caracteres.

## 2. Strings não mudam

```python
nome = "ana"
nome.upper()   # devolve "ANA"
print(nome)    # ana
```

`upper()` **não altera** `nome`. Ele devolve uma string nova, e como ninguém guardou essa string nova, ela se perde. Strings são **imutáveis**: nenhum método muda a string original.

Para ficar com o resultado, atribua de volta:

```python
nome = nome.upper()
print(nome)    # ANA
```

> **Regra prática:** método de string sempre devolve uma string nova. Se você não guardou o retorno, nada mudou.

## 3. Limpar o que veio de fora

Texto digitado por pessoas chega com sujeira: espaço sobrando, letra maiúscula onde não devia. Três métodos resolvem quase tudo:

```python
email = "  Ana@Email.COM "
email.strip()            # "Ana@Email.COM", sem espaço nas pontas
email.lower()            # "  ana@email.com ", tudo minúsculo
email.strip().lower()    # "ana@email.com"
```

- `strip()` remove espaço, tabulação e quebra de linha **das pontas**. O meio fica intacto.
- `lower()` passa tudo para minúsculas, e `upper()` para maiúsculas.
- Os métodos podem ser **encadeados**: cada um recebe o resultado do anterior.

## 4. Quebrar e juntar

`split()` quebra um texto em uma lista de pedaços. `join()` faz o caminho inverso.

```python
"ana paula souza".split()          # ["ana", "paula", "souza"]
"   pedro   henrique ".split()     # ["pedro", "henrique"]
"-".join(["a", "b", "c"])          # "a-b-c"
```

- `split()` sem argumento quebra em **qualquer quantidade** de espaços e ignora os das pontas.
- No `join()`, o separador vem **antes** do ponto: `".".join(lista)` junta os itens com ponto entre eles.

Juntando tudo, dá para pegar a primeira letra de cada palavra:

```python
palavras = "ana paula".split()       # ["ana", "paula"]
primeiras = [p[0] for p in palavras] # ["a", "p"]
```

O `[p[0] for p in palavras]` monta uma lista nova com o primeiro caractere de cada palavra. Depois é só passar para maiúsculas e juntar com o separador que o exercício pedir.

## 5. Formatar com f-string

Para montar uma frase com valores dentro, use **f-string**: um `f` antes das aspas e as variáveis entre chaves.

```python
nome = "Ana"
nota = 8.456
f"{nome} tirou {nota}"        # "Ana tirou 8.456"
f"{nome} tirou {nota:.2f}"    # "Ana tirou 8.46"
f"{10:.2f}"                   # "10.00"
```

O que vem depois dos dois-pontos é o **formato**. `.2f` quer dizer "número com duas casas decimais", arredondando se for preciso, e completando com zero se faltar.

> **Regra prática:** prefira f-string a concatenar com `+`. Concatenar obriga a converter cada número com `str()` na mão, e quebra na primeira vez que você esquece.

## Resumo

- String é sequência: índice começa em 0, `-1` é o último e a fatia exclui o fim.
- Strings são imutáveis: guarde o retorno do método, `nome = nome.upper()`.
- `strip()` limpa as pontas, `lower()` e `upper()` mudam a caixa, e dá para encadear.
- `split()` quebra em lista, e `separador.join(lista)` junta de volta.
- f-string monta texto com valores, e `:.2f` formata com duas casas.
"""

LICAO_MODELAGEM = """Um banco de dados guarda fatos depois que o programa fecha. Nesta lição você aprende a desenhar tabelas que só aceitam dado válido, porque consertar dado ruim depois custa muito mais caro.

## 1. A tabela guarda um tipo de coisa

Uma tabela guarda fatos sobre **uma coisa só**. `aluno` guarda alunos, e `matricula` guarda matrículas. Cada **linha** é um aluno, e cada **coluna** é uma informação sobre ele.

```sql
CREATE TABLE aluno (
    id         INTEGER PRIMARY KEY,
    nome       TEXT    NOT NULL,
    email      TEXT    NOT NULL UNIQUE,
    nascimento DATE
);
```

O `CREATE TABLE` declara o nome da tabela e, entre parênteses, cada coluna com o seu **tipo** e as suas **regras**, separadas por vírgula.

Cada coluna tem um tipo, e o tipo é a primeira regra de qualidade. Guardar data em `TEXT` funciona até o dia de ordenar por data e descobrir que `"10/02"` vem antes de `"9/02"`.

## 2. Chave primária

A **chave primária** (`PRIMARY KEY`) identifica cada linha. Ela garante duas coisas:

- **nunca se repete**: não existem duas linhas com o mesmo `id`;
- **nunca é nula**: toda linha tem o seu `id`.

Ela existe para o banco encontrar e referenciar a linha.

## 3. Chave natural ou artificial

Usar um dado do mundo real, como o CPF, como chave primária parece econômico, mas cobra caro:

- Outras tabelas apontam para a chave. Se o CPF foi digitado errado e precisa mudar, a mudança tem de se espalhar por todas elas.
- Nem todo aluno tem CPF na hora do cadastro, como um estrangeiro ou um menor de idade, e chave primária não aceita nulo.

A **chave artificial**, um `id` sequencial, não significa nada, e é justamente por isso que nunca precisa mudar. O CPF continua na tabela, só que como coluna `UNIQUE`.

## 4. NOT NULL é uma decisão

`NULL` não é zero nem texto vazio: é "não sabemos". Por isso, `NULL = NULL` não dá verdadeiro, dá **desconhecido**.

`NOT NULL` obriga a coluna a ter valor. Deixe aceitar nulo só o que pode genuinamente não existir: um aluno sem data de nascimento é plausível, mas um aluno sem nome não é.

## 5. UNIQUE impede repetição

```sql
email TEXT NOT NULL UNIQUE
```

`UNIQUE` faz o banco recusar um segundo aluno com o mesmo e-mail. Repare que são regras diferentes: `NOT NULL` impede a **ausência** de valor, e `UNIQUE` impede a **repetição**. Para um e-mail obrigatório e sem duplicidade, você usa as duas.

## 6. CHECK recusa valor fora da regra

```sql
nota NUMERIC CHECK (nota BETWEEN 0 AND 10)
```

O `CHECK` declara uma condição que todo valor precisa cumprir. Com essa linha, o banco recusa uma nota 11 ou -1 antes de ela entrar na tabela. `BETWEEN 0 AND 10` inclui as duas pontas: 0 e 10 são aceitos.

## 7. A regra mora no banco

Se o formulário do site já impede nota acima de 10, por que repetir a regra no banco? Porque o formulário é **um** caminho até a tabela, e não o único. Um script de importação, alguém corrigindo pelo console, uma rotina agendada e o bug de uma versão futura escrevem direto na tabela.

> **Regra prática:** a aplicação valida um caminho, e o banco vale para todos. Regra que só existe no código um dia é burlada por quem não passou pelo código.

## 8. Chave estrangeira liga tabelas

Uma matrícula pertence a um aluno. Em vez de copiar o nome do aluno para a tabela `matricula`, você guarda o `id` dele:

```sql
CREATE TABLE matricula (
    id       INTEGER PRIMARY KEY,
    aluno_id INTEGER NOT NULL REFERENCES aluno (id),
    curso    TEXT    NOT NULL
);
```

`aluno_id` é uma **chave estrangeira**: guarda o valor da chave primária de outra tabela. O `REFERENCES` faz o banco conferir a referência e recusar uma matrícula de um aluno que não existe.

## Resumo

- Uma tabela guarda um tipo de coisa: linha é o registro, coluna é a informação.
- A chave primária identifica a linha, nunca se repete e nunca é nula.
- Prefira chave artificial, e deixe o CPF como `UNIQUE`.
- `NOT NULL` impede ausência, `UNIQUE` impede repetição, e `CHECK` impede valor fora da regra.
- Declare as regras no banco: elas valem para todos os caminhos até a tabela.
- A chave estrangeira liga tabelas e garante que a referência existe.
"""

LICOES: list[LicaoSeed] = [
    {
        "trilha": "logica-de-programacao",
        "aula": "variaveis-e-tipos",
        "conteudo": LICAO_VARIAVEIS,
        "fases": [
            "media-de-duas-notas",
            "trocar-valores",
            "tipo-do-resultado",
            "converter-entrada",
        ],
        "remover": [
            "valor-da-variavel-escolha",
            "texto-ou-numero-escolha",
            "variavel-flashcard",
        ],
        "questoes": [
            {
                "enunciado": "Se `pontos = 4` e depois `pontos = pontos + 3`, qual é o valor final de `pontos`?",
                "opcoes": ["3", "4", "7", "43"],
                "correta": "C",
            },
            {
                "enunciado": 'Em Python, qual é o resultado de `"5" + "2"`?',
                "opcoes": ["7", '"52"', "Erro de sintaxe", '"7"'],
                "correta": "B",
            },
            {
                "enunciado": "Qual é o tipo do resultado de `10 / 2`?",
                "opcoes": ["int", "str", "bool", "float"],
                "correta": "D",
            },
            {
                "enunciado": 'O que `int("7") + 3` devolve?',
                "opcoes": ["10", '"73"', '"10"', "Erro de tipo"],
                "correta": "A",
            },
            {
                "enunciado": "Depois de `a = 1`, `b = 2` e `a, b = b, a`, quanto valem `a` e `b`?",
                "opcoes": [
                    "a = 1 e b = 2",
                    "a = 2 e b = 1",
                    "a = 2 e b = 2",
                    "a = 1 e b = 1",
                ],
                "correta": "B",
            },
        ],
        "flashcards": [
            {
                "pergunta": "O que é uma variável, e o que acontece quando atribuímos um novo valor a ela?",
                "resposta": "Uma variável é um nome associado a um valor. Uma nova atribuição faz esse nome passar a apontar para o novo valor, e o antigo se perde.",
                "dica": "Pensa numa etiqueta colada num valor. Dá para descolar e colar em outro?",
            },
            {
                "pergunta": "Como ler o sinal `=` em `pontos = pontos + 3`?",
                "resposta": 'Como "recebe". O lado direito é calculado primeiro com o valor atual de pontos, e o resultado é guardado no nome da esquerda.',
                "dica": "Não é uma equação. Qual lado o Python resolve primeiro?",
            },
            {
                "pergunta": "Qual é a diferença entre `/` e `//`?",
                "resposta": "`/` sempre devolve float, mesmo em conta exata: 10 / 2 é 5.0. `//` devolve só a parte inteira: 7 // 2 é 3.",
                "dica": "Um deles nunca devolve casa decimal. Lembra quanto dá 7 // 2?",
            },
            {
                "pergunta": "Por que converter o que vem de fora do programa antes de calcular?",
                "resposta": 'Porque chega como texto. "21" * 2 dá "2121". Com int("21") * 2, dá 42.',
                "dica": "O que a pessoa digita chega com aspas ou sem aspas?",
            },
            {
                "pergunta": "Como trocar os valores de duas variáveis em Python?",
                "resposta": "Com a, b = b, a. O lado direito inteiro é calculado antes de guardar, então nenhum valor se perde.",
                "dica": "O Python calcula o lado direito inteiro antes de guardar. Dá para fazer em uma linha só.",
            },
        ],
        "correcao": {
            "media-de-duas-notas": {
                "funcao": "media",
                "codigo_inicial": "def media(nota1, nota2):\n    ...\n",
                "casos": [
                    _caso([8, 6], 7.0, True),
                    _caso([10, 10], 10.0, True),
                    _caso([7, 8], 7.5, False),
                    _caso([0, 5], 2.5, False),
                ],
            },
            "trocar-valores": {
                "funcao": "trocar",
                "codigo_inicial": "def trocar(a, b):\n    ...\n",
                "casos": [
                    _caso([1, 2], [2, 1], True),
                    _caso(["a", "b"], ["b", "a"], True),
                    _caso([0, -3], [-3, 0], False),
                    _caso([5, 5], [5, 5], False),
                ],
            },
            "converter-entrada": {
                "funcao": "dobro_do_texto",
                "codigo_inicial": "def dobro_do_texto(texto):\n    ...\n",
                "casos": [
                    _caso(["21"], 42, True),
                    _caso(["0"], 0, True),
                    _caso(["-4"], -8, False),
                    _caso(["100"], 200, False),
                ],
            },
        },
        "aprender": {
            "media-de-duas-notas": {
                "contexto": "A **média aritmética** soma os valores e divide pela quantidade deles. A ordem das contas importa: em Python, `/` acontece antes de `+`, então a soma precisa ir entre parênteses.",
                "exemplo": "certo = (2 + 4) / 2    # 3.0\nerrado = 2 + 4 / 2     # 4.0, dividiu só o 4",
            },
            "trocar-valores": {
                "contexto": "Uma função pode devolver **mais de um valor de uma vez**: basta separar com vírgula depois do `return`. Quem chama recebe os valores juntos, na ordem em que você escreveu.",
                "exemplo": "def dobro_e_triplo(numero):\n    return numero * 2, numero * 3\n\nprint(dobro_e_triplo(5))   # (10, 15)",
            },
            "tipo-do-resultado": {
                "contexto": "Todo valor tem um **tipo**, e a função `type()` mostra qual é. O resultado de uma conta também tem tipo, e ele depende do operador que você usou.",
                "exemplo": "print(type(3))      # <class 'int'>\nprint(type(3.0))    # <class 'float'>\nprint(type(\"3\"))    # <class 'str'>",
            },
            "converter-entrada": {
                "contexto": "O que vem de fora do programa chega como **texto**. Com texto, `+` cola e `*` repete. Para fazer conta de verdade, converta antes com `int()`.",
                "exemplo": 'idade = "17"\nprint(idade + "1")      # 171\nprint(int(idade) + 1)   # 18',
            },
        },
    },
    {
        "trilha": "python",
        "aula": "texto-e-formatacao",
        "conteudo": LICAO_TEXTO,
        "fases": [
            "iniciais-do-nome",
            "limpar-entrada",
            "string-nao-muda",
            "boletim-formatado",
        ],
        "remover": ["string-imutavel-escolha"],
        "questoes": [
            {
                "enunciado": 'Se `nome = "ana"` e chamamos `nome.upper()` sem guardar o retorno, qual é o valor de `nome`?',
                "opcoes": ['"ANA"', '"ana"', '"Ana"', "Erro de execução"],
                "correta": "B",
            },
            {
                "enunciado": 'Qual é o resultado de `"CodeQuest"[0:4]`?',
                "opcoes": ['"CodeQ"', '"odeQ"', '"Code"', '"Ques"'],
                "correta": "C",
            },
            {
                "enunciado": 'O que `"  Oi, tudo bem?  ".strip()` devolve?',
                "opcoes": [
                    '"Oi,tudobem?"',
                    '"Oi, tudo bem?"',
                    '"  Oi, tudo bem?"',
                    '"oi, tudo bem?"',
                ],
                "correta": "B",
            },
            {
                "enunciado": 'Qual é o resultado de `".".join(["A", "P", "S"])`?',
                "opcoes": ['"A.P.S"', '"APS"', '".A.P.S."', '["A.P.S"]'],
                "correta": "A",
            },
            {
                "enunciado": 'Com `nota = 7.1`, o que `f"{nota:.2f}"` devolve?',
                "opcoes": ['"7.1"', '"7"', '"7.01"', '"7.10"'],
                "correta": "D",
            },
        ],
        "flashcards": [
            {
                "pergunta": "Por que `nome.upper()` sozinho não muda a variável `nome`?",
                "resposta": "Strings são imutáveis: o método devolve uma string nova. Para guardar, atribua de volta: nome = nome.upper().",
                "dica": "Strings são imutáveis. Para onde foi o texto novo que o método devolveu?",
            },
            {
                "pergunta": "O que `strip()` remove?",
                "resposta": "Espaço, tabulação e quebra de linha das pontas do texto. O meio fica intacto.",
                "dica": "Pensa nas pontas do texto. O meio fica do jeito que está.",
            },
            {
                "pergunta": "Qual é a diferença entre `split()` e `join()`?",
                "resposta": "split() quebra um texto em lista. separador.join(lista) junta a lista em um texto, com o separador entre os itens.",
                "dica": "Um transforma texto em lista. O outro faz o caminho de volta.",
            },
            {
                "pergunta": "O que quer dizer `:.2f` dentro de uma f-string?",
                "resposta": 'Número com duas casas decimais: arredonda se sobrar e completa com zero se faltar. f"{10:.2f}" é "10.00".',
                "dica": "O número depois do ponto é a quantidade de casas decimais.",
            },
        ],
        "correcao": {},
        "aprender": {
            "iniciais-do-nome": {
                "contexto": "`split()` quebra o texto em uma lista de palavras, `palavra[0]` pega a primeira letra e `upper()` passa para maiúscula. Para juntar uma lista com um separador, use `separador.join(lista)`.",
                "exemplo": 'palavras = "bom dia".split()     # [\'bom\', \'dia\']\nprint(palavras[1][0])             # d\nprint("-".join(["x", "y"]))       # x-y',
            },
            "limpar-entrada": {
                "contexto": "Texto digitado chega com sujeira. `strip()` tira os espaços das pontas e `lower()` passa tudo para minúsculas. Dá para encadear: cada método recebe o resultado do anterior.",
                "exemplo": 'cidade = "  SÃO PAULO "\nprint(cidade.strip())           # SÃO PAULO\nprint(cidade.strip().title())   # São Paulo',
            },
            "string-nao-muda": {
                "contexto": "Strings são **imutáveis**: nenhum método altera o texto original. O método devolve um texto novo, e você precisa guardar esse retorno numa variável.",
                "exemplo": 'cidade = "rio"\ncidade.title()\nprint(cidade)            # rio\ncidade = cidade.title()\nprint(cidade)            # Rio',
            },
            "boletim-formatado": {
                "contexto": "A **f-string** coloca valores dentro do texto: um `f` antes das aspas e a variável entre chaves. Depois dos dois-pontos vem o formato, e `.2f` quer dizer duas casas decimais.",
                "exemplo": 'produto = "Pão"\npreco = 3.5\nprint(f"{produto}: R$ {preco:.2f}")   # Pão: R$ 3.50',
            },
        },
    },
    {
        "trilha": "banco-de-dados",
        "aula": "modelagem-e-tabelas",
        "conteudo": LICAO_MODELAGEM,
        "fases": [
            "criar-tabela-aluno",
            "chave-natural-ou-artificial",
            "restringir-nota",
            "validacao-no-banco",
        ],
        "remover": [
            "chave-primaria-escolha",
            "email-unico-escolha",
            "chave-estrangeira-flashcard",
        ],
        "questoes": [
            {
                "enunciado": "Qual propriedade uma chave primária precisa garantir em uma tabela?",
                "opcoes": [
                    "Pode se repetir",
                    "Identifica cada linha sem aceitar nulo",
                    "Sempre contém texto",
                    "É opcional em cada linha",
                ],
                "correta": "B",
            },
            {
                "enunciado": "Qual restrição SQL impede dois alunos de terem o mesmo e-mail cadastrado?",
                "opcoes": ["NOT NULL", "DEFAULT", "UNIQUE", "ORDER BY"],
                "correta": "C",
            },
            {
                "enunciado": "Qual é o resultado de comparar `NULL = NULL`?",
                "opcoes": ["Verdadeiro", "Falso", "Zero", "Desconhecido"],
                "correta": "D",
            },
            {
                "enunciado": "Com `nota NUMERIC CHECK (nota BETWEEN 0 AND 10)`, qual valor o banco recusa?",
                "opcoes": ["0", "10", "11", "7.5"],
                "correta": "C",
            },
            {
                "enunciado": "O que o `REFERENCES aluno (id)` garante na coluna `aluno_id` de `matricula`?",
                "opcoes": [
                    "Que o aluno referenciado existe",
                    "Que o aluno tem e-mail",
                    "Que a matrícula é única",
                    "Que o id é texto",
                ],
                "correta": "A",
            },
        ],
        "flashcards": [
            {
                "pergunta": "Como uma chave estrangeira liga duas tabelas?",
                "resposta": "Ela guarda o valor da chave primária de outra tabela, criando a relação entre as linhas e permitindo ao banco verificar se a referência existe.",
                "dica": "Em vez de copiar o aluno inteiro, a matrícula guarda o quê dele?",
            },
            {
                "pergunta": "Por que preferir chave artificial ao CPF como chave primária?",
                "resposta": "O CPF pode precisar mudar e nem todo aluno tem CPF no cadastro. O id artificial não significa nada, então nunca muda. O CPF fica como UNIQUE.",
                "dica": "O que acontece se o CPF foi digitado errado? E se o aluno ainda não tem um?",
            },
            {
                "pergunta": "Qual é a diferença entre NOT NULL e UNIQUE?",
                "resposta": "NOT NULL impede a ausência de valor. UNIQUE impede a repetição. Um e-mail obrigatório e sem duplicidade usa as duas.",
                "dica": "Um impede o vazio. O outro impede o repetido.",
            },
            {
                "pergunta": "Se a aplicação já valida, por que declarar a regra no banco?",
                "resposta": "Porque a aplicação é só um dos caminhos até a tabela. Scripts, console e rotinas escrevem direto, e a restrição do banco vale para todos.",
                "dica": "O formulário é o único caminho até a tabela?",
            },
        ],
        "correcao": {},
        "aprender": {
            "criar-tabela-aluno": {
                "contexto": "O `CREATE TABLE` declara a tabela e, entre parênteses, cada coluna com o **tipo** e as **regras**: `PRIMARY KEY` identifica a linha, `NOT NULL` obriga o valor e `UNIQUE` impede repetição.",
                "exemplo": "CREATE TABLE curso (\n    id    INTEGER PRIMARY KEY,\n    nome  TEXT    NOT NULL UNIQUE,\n    vagas INTEGER\n);",
            },
            "chave-natural-ou-artificial": {
                "contexto": "**Chave natural** é um dado do mundo real, como CPF ou e-mail. **Chave artificial** é um `id` que não significa nada. A chave primária é referenciada por outras tabelas, então ela não deveria precisar mudar nunca.",
                "exemplo": "CREATE TABLE cliente (\n    id    INTEGER PRIMARY KEY,   -- artificial\n    email TEXT    UNIQUE         -- natural, pode mudar\n);",
            },
            "restringir-nota": {
                "contexto": "O `CHECK` declara uma condição que todo valor da coluna precisa cumprir. Se a linha não cumprir, o banco recusa antes de gravar.",
                "exemplo": "idade INTEGER CHECK (idade >= 0)\nestoque INTEGER CHECK (estoque BETWEEN 0 AND 999)",
            },
            "validacao-no-banco": {
                "contexto": "Uma restrição declarada no banco vale para **qualquer** programa que escreva na tabela, e não só para a tela que você construiu.",
                "exemplo": "-- este script não passa pelo formulário do site\nINSERT INTO aluno (nome, nota) VALUES ('Ana', 11);\n-- com o CHECK na coluna, o banco recusa a linha",
            },
        },
    },
]
