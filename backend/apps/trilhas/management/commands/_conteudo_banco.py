"""Conteúdo da trilha de Banco de Dados.

O SQL é o mesmo em qualquer banco relacional, e os exemplos seguem o padrão,
sem recurso exclusivo de um fornecedor. O fio da trilha é o de sempre: primeiro
guardar direito, depois perguntar, depois perguntar rápido.
"""

from apps.trilhas.models import Dificuldade, Tipo

from ._tipos_seed import AulaSeed

CONTEUDO_MODELAGEM = """## A tabela é uma afirmação

Uma tabela guarda fatos sobre uma coisa só. `aluno` guarda fatos sobre alunos;
`matricula` guarda fatos sobre matrículas. Misturar os dois numa tabela só é o
começo de quase todo problema de banco.

```sql
CREATE TABLE aluno (
    id        INTEGER PRIMARY KEY,
    nome      TEXT    NOT NULL,
    email     TEXT    NOT NULL UNIQUE,
    nascimento DATE,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

Cada coluna tem um tipo, e o tipo é a primeira regra de qualidade do dado.
Guardar data em `TEXT` funciona até o dia de ordenar por data e descobrir que
`"10/02"` vem antes de `"9/02"`.

## Chave primária

A chave primária identifica a linha e nunca se repete. Ela existe para o banco
encontrar e referenciar a linha, não para ser bonita na tela.

Chave natural (o CPF, o e-mail) parece econômica e cobra caro: o dia em que o
valor mudar, todas as tabelas que apontam para ele precisam mudar junto. Chave
artificial (um `id` sequencial ou UUID) não tem significado, e é justamente
por isso que ela nunca precisa mudar.

## NOT NULL é decisão, não detalhe

`NULL` não é zero nem string vazia: é "não sabemos". Toda coluna que aceita
nulo obriga quem consulta a decidir o que fazer com a ausência, e obriga a
lembrar que `NULL = NULL` não é verdadeiro, é desconhecido.

Deixe aceitar nulo só o que pode genuinamente não existir. Um aluno sem data de
nascimento é plausível; um aluno sem nome, não.

## Restrições valem mais que validação na aplicação

```sql
email TEXT NOT NULL UNIQUE
nota  NUMERIC NOT NULL CHECK (nota BETWEEN 0 AND 10)
```

A aplicação valida um caminho; o banco vale para todos. O script de importação,
o colega mexendo no console, a rotina de madrugada, todos passam pela
restrição. Regra que só existe no código é regra que um dia vai ser burlada por
quem não passou pelo código.
"""

CONTEUDO_CONSULTA = """## Perguntar

```sql
SELECT nome, email
FROM aluno
WHERE nascimento >= '2005-01-01'
ORDER BY nome
LIMIT 20;
```

Lê-se de dentro para fora: de onde (`FROM`), filtrando o quê (`WHERE`),
mostrando quais colunas (`SELECT`), em que ordem (`ORDER BY`), quantas linhas
(`LIMIT`).

## Não use SELECT *

`SELECT *` traz colunas que ninguém pediu, e quebra em silêncio no dia em que
alguém acrescentar ou reordenar uma coluna. Nomear as colunas documenta o que a
consulta realmente usa e permite ao banco responder sem tocar na tabela quando
tudo que ela precisa está no índice.

## Comparar com NULL

```sql
WHERE apelido = NULL      -- nunca é verdadeiro
WHERE apelido IS NULL     -- certo
```

`NULL` não é igual a nada, nem a outro `NULL`. Por isso existe `IS NULL` e
`IS NOT NULL`. Esse é o motivo de `WHERE turma <> 'A'` não trazer as linhas com
turma nula: elas não são nem iguais nem diferentes, são desconhecidas.

## LIKE e faixas

```sql
WHERE nome LIKE 'Ana%'              -- começa com Ana
WHERE nota BETWEEN 7 AND 10         -- inclui as duas pontas
WHERE turma IN ('A', 'B')           -- pertence à lista
```

`LIKE '%ana%'`, com curinga na frente, obriga o banco a ler tudo: nenhum índice
comum ajuda quando o começo do valor é desconhecido.

## DISTINCT

`SELECT DISTINCT turma FROM aluno` devolve cada turma uma vez. Quando aparece
`DISTINCT` numa consulta com junção, quase sempre o problema é a junção
duplicando linhas, e esconder isso com `DISTINCT` trata o sintoma.
"""

CONTEUDO_AGREGACAO = """## Resumir

```sql
SELECT turma, COUNT(*) AS total, AVG(nota) AS media
FROM matricula
GROUP BY turma
HAVING COUNT(*) > 5
ORDER BY media DESC;
```

`GROUP BY` junta as linhas em grupos, e a função de agregação resume cada
grupo. Toda coluna do `SELECT` que não está dentro de uma agregação precisa
estar no `GROUP BY`: sem isso, o banco não saberia qual valor do grupo mostrar.

## WHERE e HAVING não são a mesma coisa

`WHERE` filtra linhas **antes** de agrupar. `HAVING` filtra grupos **depois**.

```sql
WHERE nota >= 7       -- só as matrículas aprovadas entram na conta
HAVING COUNT(*) > 5   -- só as turmas com mais de 5 aparecem
```

Trocar um pelo outro dá resultado errado com cara de certo: filtrar no `HAVING`
o que era para filtrar no `WHERE` faz a média ser calculada sobre linhas que
deveriam ter ficado de fora.

## COUNT(*) e COUNT(coluna)

`COUNT(*)` conta linhas. `COUNT(apelido)` conta linhas em que `apelido` não é
nulo. A diferença entre os dois números é exatamente quantos nulos existem
naquela coluna.

## Agregação ignora nulo

`AVG(nota)` soma as notas existentes e divide pela quantidade de notas
existentes, não pelo total de linhas. Se metade das notas for nula, a média sai
das que existem. Quando o nulo deveria valer zero, é preciso dizer:
`AVG(COALESCE(nota, 0))`.
"""

CONTEUDO_JUNCOES = """## Chave estrangeira

```sql
CREATE TABLE matricula (
    id        INTEGER PRIMARY KEY,
    aluno_id  INTEGER NOT NULL REFERENCES aluno(id),
    turma_id  INTEGER NOT NULL REFERENCES turma(id),
    nota      NUMERIC CHECK (nota BETWEEN 0 AND 10),
    UNIQUE (aluno_id, turma_id)
);
```

A chave estrangeira faz o banco recusar uma matrícula de aluno que não existe.
Sem ela, o registro órfão entra, ninguém percebe, e um dia a consulta some com
a linha sem explicar por quê.

O `UNIQUE (aluno_id, turma_id)` diz que o mesmo aluno não se matricula duas
vezes na mesma turma. Essa é a regra de negócio morando onde ela vale para
todo mundo.

## INNER JOIN

```sql
SELECT a.nome, t.codigo, m.nota
FROM matricula m
JOIN aluno a ON a.id = m.aluno_id
JOIN turma t ON t.id = m.turma_id;
```

`JOIN` casa linhas das duas tabelas pela condição do `ON`. O `INNER JOIN`, que
é o padrão, devolve só os pares que casaram: aluno sem matrícula não aparece.

## LEFT JOIN

```sql
SELECT a.nome, COUNT(m.id) AS matriculas
FROM aluno a
LEFT JOIN matricula m ON m.aluno_id = a.id
GROUP BY a.nome;
```

`LEFT JOIN` mantém todas as linhas da tabela da esquerda, preenchendo com
`NULL` o que não casou. É assim que o aluno sem matrícula aparece com zero.

Cuidado: `COUNT(*)` aqui contaria 1 para quem não tem matrícula, porque a linha
existe com nulos. `COUNT(m.id)` conta só o que casou de verdade.

## A condição no lugar errado

Filtrar a tabela da direita no `WHERE` de um `LEFT JOIN` desfaz o `LEFT`: a
linha com `NULL` não passa no filtro e some. Quando o filtro é sobre a tabela
da direita, ele vai no `ON`, não no `WHERE`.

## Duplicação

Se uma junção começa a devolver mais linhas do que a tabela principal tem, é
porque o outro lado tem mais de uma linha correspondente. `DISTINCT` esconde;
agregar ou corrigir a condição resolve.
"""

CONTEUDO_ESCRITA = """## Escrever

```sql
INSERT INTO aluno (nome, email) VALUES ('Ana', 'ana@escola.br');

UPDATE aluno SET email = 'ana@nova.br' WHERE id = 1;

DELETE FROM aluno WHERE id = 1;
```

## O WHERE que faltou

`UPDATE` e `DELETE` sem `WHERE` valem para a tabela inteira. Não há confirmação
e não há desfazer. É o acidente mais comum e mais caro do SQL.

O hábito que evita: escrever primeiro como `SELECT`, conferir quais linhas
voltam, e só então trocar o começo por `UPDATE` ou `DELETE`.

## Transação

```sql
BEGIN;
UPDATE conta SET saldo = saldo - 100 WHERE id = 1;
UPDATE conta SET saldo = saldo + 100 WHERE id = 2;
COMMIT;
```

As duas linhas acontecem juntas ou não acontecem. Sem a transação, uma falha no
meio deixa o dinheiro fora de qualquer conta, e nenhum relatório consegue
explicar o sumiço depois.

`ROLLBACK` desfaz tudo desde o `BEGIN`.

## ON DELETE

Apagar um aluno que tem matrícula precisa de uma decisão, declarada na chave
estrangeira:

- `ON DELETE RESTRICT` recusa o apagamento enquanto houver filho. É o padrão
  seguro.
- `ON DELETE CASCADE` apaga os filhos junto. Cômodo e perigoso: uma linha
  apagada por engano leva o histórico inteiro.
- `ON DELETE SET NULL` mantém o filho e esquece o pai.

## Apagar de verdade ou marcar?

Em dado que alguém pode querer de volta, o comum é não apagar: uma coluna
`excluido_em` marca a linha como fora de uso e todas as consultas passam a
filtrar por ela. O custo é lembrar do filtro em todo lugar, e esse custo é
real.
"""

CONTEUDO_INDICES = """## Por que a consulta é lenta

Sem índice, responder `WHERE email = 'ana@escola.br'` obriga o banco a ler
todas as linhas da tabela e comparar uma a uma. Com dez linhas isso é
instantâneo; com um milhão, não.

Um índice é uma estrutura ordenada à parte que leva direto às linhas que
interessam, do mesmo jeito que o índice de um livro evita folhear tudo.

```sql
CREATE INDEX idx_matricula_aluno ON matricula (aluno_id);
```

## O que merece índice

- Colunas de chave estrangeira. Sem elas, toda junção varre a tabela.
- Colunas usadas com frequência em `WHERE` e em `ORDER BY`.
- Chave primária e `UNIQUE` já vêm indexados; não crie de novo.

## O que índice custa

Índice não é grátis. Cada `INSERT`, `UPDATE` e `DELETE` precisa atualizar
também os índices da tabela, e cada índice ocupa espaço. Indexar tudo deixa a
leitura marginalmente melhor e a escrita claramente pior.

## Índice composto e a ordem das colunas

```sql
CREATE INDEX idx_matricula_turma_nota ON matricula (turma_id, nota);
```

Esse índice serve para filtrar por `turma_id`, e para filtrar por `turma_id` e
`nota` juntos. Não serve para filtrar só por `nota`: é a mesma razão pela qual
a lista telefônica ordenada por sobrenome e depois nome não ajuda quem só sabe
o nome.

## Deixe o índice trabalhar

```sql
WHERE YEAR(criado_em) = 2026            -- o índice não é usado
WHERE criado_em >= '2026-01-01'
  AND criado_em <  '2027-01-01'         -- o índice é usado
```

Aplicar função na coluna esconde o valor indexado, e o banco volta a varrer a
tabela. A regra é manter a coluna sozinha de um lado da comparação.

## Medir, não adivinhar

```sql
EXPLAIN SELECT ... ;
```

`EXPLAIN` mostra o plano que o banco escolheu: se ele vai varrer a tabela ou
usar índice, e em que ordem vai juntar. Otimizar sem ler o plano é chutar, e
o chute costuma cair no índice que não era o gargalo.
"""

AULAS_BANCO: list[AulaSeed] = [
    {
        "slug": "modelagem-e-tabelas",
        "titulo": "Modelagem e tabelas",
        "ordem": 1,
        "pre_requisito": None,
        "conteudo": CONTEUDO_MODELAGEM,
        "exercicios": [
            {
                "slug": "criar-tabela-aluno",
                "titulo": "Criar a tabela de alunos",
                "ordem": 1,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INICIANTE,
                "enunciado": (
                    "Escreva o `CREATE TABLE` de `aluno` com: `id` como chave "
                    "primária, `nome` de texto obrigatório, `email` de texto "
                    "obrigatório e único, e `nascimento` como data opcional."
                ),
                "solucao_autor": (
                    "CREATE TABLE aluno (\n"
                    "    id INTEGER PRIMARY KEY,\n"
                    "    nome TEXT NOT NULL,\n"
                    "    email TEXT NOT NULL UNIQUE,\n"
                    "    nascimento DATE\n"
                    ");"
                ),
            },
            {
                "slug": "chave-natural-ou-artificial",
                "titulo": "CPF como chave primária?",
                "ordem": 2,
                "tipo": Tipo.TEORICO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "Um colega quer usar o CPF como chave primária da tabela de "
                    "alunos, já que ele é único. Dê dois motivos para não fazer "
                    "isso."
                ),
                "solucao_autor": (
                    "Primeiro, chave primária é referenciada por outras tabelas: "
                    "se o valor precisar mudar, por digitação errada ou correção "
                    "cadastral, a mudança tem de se propagar por todas elas. Uma "
                    "chave artificial nunca precisa mudar, porque não significa "
                    "nada. Segundo, nem todo aluno tem CPF no momento do "
                    "cadastro (estrangeiro, menor de idade), e chave primária não "
                    "aceita nulo. O CPF continua sendo coluna `UNIQUE`, que é "
                    "onde a unicidade dele pertence."
                ),
            },
            {
                "slug": "restringir-nota",
                "titulo": "Nota entre 0 e 10",
                "ordem": 3,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INICIANTE,
                "enunciado": (
                    "Escreva a definição da coluna `nota` para que o banco "
                    "recuse qualquer valor fora do intervalo de 0 a 10."
                ),
                "solucao_autor": "nota NUMERIC CHECK (nota BETWEEN 0 AND 10)",
            },
            {
                "slug": "validacao-no-banco",
                "titulo": "A aplicação já valida",
                "ordem": 4,
                "tipo": Tipo.TEORICO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "Se o formulário do site já impede nota acima de 10, por que "
                    "ainda vale a pena declarar o `CHECK` no banco?"
                ),
                "solucao_autor": (
                    "Porque o formulário é um dos caminhos até a tabela, não o "
                    "único. Script de importação, correção manual pelo console, "
                    "rotina agendada, outra aplicação e o próprio bug de uma "
                    "versão futura escrevem direto. A restrição no banco vale "
                    "para todos eles e não depende de ninguém lembrar dela. Fora "
                    "que uma regra declarada no esquema documenta o dado para "
                    "quem chegar depois."
                ),
            },
        ],
    },
    {
        "slug": "consultas-e-filtros",
        "titulo": "Consultas e filtros",
        "ordem": 2,
        "pre_requisito": "modelagem-e-tabelas",
        "conteudo": CONTEUDO_CONSULTA,
        "exercicios": [
            {
                "slug": "selecionar-colunas",
                "titulo": "Só o que interessa",
                "ordem": 1,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INICIANTE,
                "enunciado": (
                    "Escreva a consulta que devolva o nome e o e-mail dos alunos, "
                    "em ordem alfabética de nome."
                ),
                "solucao_autor": "SELECT nome, email\nFROM aluno\nORDER BY nome;",
            },
            {
                "slug": "filtrar-por-faixa",
                "titulo": "Filtrar por faixa",
                "ordem": 2,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INICIANTE,
                "enunciado": (
                    "Escreva a consulta que devolva as matrículas com nota entre "
                    "7 e 10, incluindo as duas pontas, da maior nota para a menor."
                ),
                "solucao_autor": (
                    "SELECT *\n"
                    "FROM matricula\n"
                    "WHERE nota BETWEEN 7 AND 10\n"
                    "ORDER BY nota DESC;"
                ),
            },
            {
                "slug": "comparar-com-nulo",
                "titulo": "A consulta que não devolve nada",
                "ordem": 3,
                "tipo": Tipo.TEORICO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "`SELECT * FROM aluno WHERE apelido = NULL` devolve zero "
                    "linhas mesmo com vários alunos sem apelido. Explique e "
                    "corrija."
                ),
                "solucao_autor": (
                    "`NULL` significa desconhecido, e comparar com desconhecido "
                    "não dá verdadeiro nem falso: dá desconhecido, e o `WHERE` só "
                    "aceita linhas em que a condição é verdadeira. Nem mesmo "
                    "`NULL = NULL` é verdadeiro. A forma correta é "
                    "`WHERE apelido IS NULL`."
                ),
            },
            {
                "slug": "filtro-exclui-nulos",
                "titulo": "O diferente que escondeu linhas",
                "ordem": 4,
                "tipo": Tipo.TEORICO,
                "dificuldade": Dificuldade.AVANCADO,
                "enunciado": (
                    "`WHERE turma <> 'A'` deveria trazer todos os alunos que não "
                    "são da turma A, mas os alunos sem turma definida não "
                    "aparecem. Por quê, e como incluir esses alunos?"
                ),
                "solucao_autor": (
                    "Porque turma nula não é igual nem diferente de 'A': a "
                    "comparação devolve desconhecido e a linha não passa no "
                    "filtro. Para incluir, é preciso dizer explicitamente: "
                    "`WHERE turma <> 'A' OR turma IS NULL`."
                ),
            },
        ],
    },
    {
        "slug": "agregacao-e-agrupamento",
        "titulo": "Agregação e agrupamento",
        "ordem": 3,
        "pre_requisito": "consultas-e-filtros",
        "conteudo": CONTEUDO_AGREGACAO,
        "exercicios": [
            {
                "slug": "media-por-turma",
                "titulo": "Média por turma",
                "ordem": 1,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INICIANTE,
                "enunciado": (
                    "Escreva a consulta que devolva, para cada turma, o total de "
                    "matrículas e a média das notas."
                ),
                "solucao_autor": (
                    "SELECT turma_id, COUNT(*) AS total, AVG(nota) AS media\n"
                    "FROM matricula\n"
                    "GROUP BY turma_id;"
                ),
            },
            {
                "slug": "where-ou-having",
                "titulo": "WHERE ou HAVING?",
                "ordem": 2,
                "tipo": Tipo.TEORICO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "Você quer a média das notas de aprovação (7 ou mais) por "
                    "turma, mostrando só as turmas com mais de 5 aprovados. "
                    "Qual filtro vai no `WHERE` e qual vai no `HAVING`? Por quê?"
                ),
                "solucao_autor": (
                    "`nota >= 7` vai no `WHERE`, porque é um filtro de linha e "
                    "precisa acontecer antes da agregação: as reprovações não "
                    "podem entrar no cálculo da média. `COUNT(*) > 5` vai no "
                    "`HAVING`, porque só existe depois que os grupos foram "
                    "formados. Colocar a nota no `HAVING` faria a média ser "
                    "calculada sobre todas as matrículas e só depois descartar "
                    "grupos, dando um número errado com aparência de certo."
                ),
            },
            {
                "slug": "turmas-com-minimo",
                "titulo": "Turmas com mais de cinco aprovados",
                "ordem": 3,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "Escreva a consulta descrita no exercício anterior: média das "
                    "notas de aprovação por turma, apenas para turmas com mais de "
                    "5 aprovados, da maior média para a menor."
                ),
                "solucao_autor": (
                    "SELECT turma_id, AVG(nota) AS media\n"
                    "FROM matricula\n"
                    "WHERE nota >= 7\n"
                    "GROUP BY turma_id\n"
                    "HAVING COUNT(*) > 5\n"
                    "ORDER BY media DESC;"
                ),
            },
            {
                "slug": "count-estrela-ou-coluna",
                "titulo": "COUNT(*) e COUNT(coluna)",
                "ordem": 4,
                "tipo": Tipo.TEORICO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "Numa tabela com 100 matrículas, `COUNT(*)` devolve 100 e "
                    "`COUNT(nota)` devolve 87. O que isso diz sobre os dados?"
                ),
                "solucao_autor": (
                    "Que 13 matrículas têm `nota` nula. `COUNT(*)` conta linhas; "
                    "`COUNT(coluna)` conta valores não nulos daquela coluna. A "
                    "diferença entre os dois é exatamente a quantidade de nulos, "
                    "e é também o motivo de `AVG(nota)` estar dividindo por 87, "
                    "não por 100."
                ),
            },
            {
                "slug": "media-com-nulo",
                "titulo": "A média que subiu sozinha",
                "ordem": 5,
                "tipo": Tipo.TEORICO,
                "dificuldade": Dificuldade.AVANCADO,
                "enunciado": (
                    "Numa turma de 10 alunos, 4 ainda não têm nota lançada e os "
                    "6 restantes tiraram 8. `AVG(nota)` devolve 8. O coordenador "
                    "esperava 4,8. Quem está certo, e como escrever a consulta "
                    "que devolve o que ele quer?"
                ),
                "solucao_autor": (
                    "O `AVG` está certo para a pergunta que ele responde: a média "
                    "das notas que existem. Nulo não é zero, é ausência, e "
                    "agregações ignoram nulo. O coordenador está pensando em "
                    "outra pergunta, em que quem não tem nota vale zero. Para "
                    "essa, é preciso dizer: `AVG(COALESCE(nota, 0))`. Vale "
                    "conferir antes se tratar pendente como zero é mesmo o que "
                    "se quer, porque isso mistura 'não entregou' com 'entregou e "
                    "zerou'."
                ),
            },
        ],
    },
    {
        "slug": "relacionamentos-e-juncoes",
        "titulo": "Relacionamentos e junções",
        "ordem": 4,
        "pre_requisito": "agregacao-e-agrupamento",
        "conteudo": CONTEUDO_JUNCOES,
        "exercicios": [
            {
                "slug": "criar-matricula",
                "titulo": "A tabela do meio",
                "ordem": 1,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "Escreva o `CREATE TABLE` de `matricula`, ligando `aluno` e "
                    "`turma`, com nota opcional e a garantia de que o mesmo aluno "
                    "não se matricula duas vezes na mesma turma."
                ),
                "solucao_autor": (
                    "CREATE TABLE matricula (\n"
                    "    id INTEGER PRIMARY KEY,\n"
                    "    aluno_id INTEGER NOT NULL REFERENCES aluno(id),\n"
                    "    turma_id INTEGER NOT NULL REFERENCES turma(id),\n"
                    "    nota NUMERIC CHECK (nota BETWEEN 0 AND 10),\n"
                    "    UNIQUE (aluno_id, turma_id)\n"
                    ");"
                ),
            },
            {
                "slug": "juntar-tres-tabelas",
                "titulo": "Nome, turma e nota",
                "ordem": 2,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "Escreva a consulta que devolva o nome do aluno, o código da "
                    "turma e a nota, para todas as matrículas."
                ),
                "solucao_autor": (
                    "SELECT a.nome, t.codigo, m.nota\n"
                    "FROM matricula m\n"
                    "JOIN aluno a ON a.id = m.aluno_id\n"
                    "JOIN turma t ON t.id = m.turma_id;"
                ),
            },
            {
                "slug": "alunos-sem-matricula",
                "titulo": "Quem não se matriculou",
                "ordem": 3,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "Escreva a consulta que devolva o nome de todos os alunos e "
                    "quantas matrículas cada um tem, incluindo os que têm zero."
                ),
                "solucao_autor": (
                    "SELECT a.nome, COUNT(m.id) AS matriculas\n"
                    "FROM aluno a\n"
                    "LEFT JOIN matricula m ON m.aluno_id = a.id\n"
                    "GROUP BY a.nome;"
                ),
            },
            {
                "slug": "left-join-com-where",
                "titulo": "O LEFT JOIN que virou INNER",
                "ordem": 4,
                "tipo": Tipo.TEORICO,
                "dificuldade": Dificuldade.AVANCADO,
                "enunciado": (
                    "A consulta abaixo deveria listar todos os alunos, com as "
                    "matrículas de 2026 quando houver. Mas os alunos sem "
                    "matrícula sumiram. Explique e corrija.\n\n"
                    "```sql\n"
                    "SELECT a.nome, m.nota\n"
                    "FROM aluno a\n"
                    "LEFT JOIN matricula m ON m.aluno_id = a.id\n"
                    "WHERE m.ano = 2026;\n"
                    "```"
                ),
                "solucao_autor": (
                    "O `LEFT JOIN` preenche com `NULL` as linhas dos alunos sem "
                    "matrícula, e em seguida o `WHERE m.ano = 2026` testa esse "
                    "`NULL`, que não é verdadeiro, então a linha é descartada. Na "
                    "prática o filtro converteu o `LEFT JOIN` em `INNER JOIN`. "
                    "Quando a condição é sobre a tabela da direita, ela pertence "
                    "ao `ON`:\n\n"
                    "```sql\n"
                    "LEFT JOIN matricula m ON m.aluno_id = a.id AND m.ano = 2026\n"
                    "```"
                ),
            },
            {
                "slug": "count-em-left-join",
                "titulo": "O aluno que tinha uma matrícula fantasma",
                "ordem": 5,
                "tipo": Tipo.TEORICO,
                "dificuldade": Dificuldade.AVANCADO,
                "enunciado": (
                    "Numa contagem por aluno com `LEFT JOIN`, quem não tem "
                    "matrícula nenhuma aparece com 1 em vez de 0. Qual é a causa?"
                ),
                "solucao_autor": (
                    "A consulta usou `COUNT(*)`, que conta linhas, e o `LEFT "
                    "JOIN` produz uma linha para esse aluno, com as colunas da "
                    "matrícula nulas. A linha existe, então conta 1. `COUNT` "
                    "sobre uma coluna da tabela da direita, como `COUNT(m.id)`, "
                    "ignora os nulos e devolve o 0 correto."
                ),
            },
        ],
    },
    {
        "slug": "escrita-e-integridade",
        "titulo": "Escrita e integridade",
        "ordem": 5,
        "pre_requisito": "relacionamentos-e-juncoes",
        "conteudo": CONTEUDO_ESCRITA,
        "exercicios": [
            {
                "slug": "inserir-aluno",
                "titulo": "Inserir um aluno",
                "ordem": 1,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INICIANTE,
                "enunciado": (
                    "Escreva o `INSERT` que cadastre a aluna Ana com o e-mail "
                    "`ana@escola.br`, nomeando as colunas."
                ),
                "solucao_autor": (
                    "INSERT INTO aluno (nome, email)\nVALUES ('Ana', 'ana@escola.br');"
                ),
            },
            {
                "slug": "update-sem-where",
                "titulo": "O UPDATE que passou por cima de tudo",
                "ordem": 2,
                "tipo": Tipo.TEORICO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "Alguém rodou `UPDATE matricula SET nota = 10;` em produção. "
                    "O que aconteceu, e que hábito evita isso?"
                ),
                "solucao_autor": (
                    "Sem `WHERE`, o comando valeu para todas as linhas da tabela: "
                    "todas as matrículas ficaram com nota 10, sem aviso e sem "
                    "desfazer fora de um backup. O hábito que evita é escrever "
                    "primeiro como `SELECT` com o mesmo `WHERE`, conferir quais "
                    "linhas voltam, e só então trocar o início pelo `UPDATE`. Em "
                    "produção, rodar dentro de `BEGIN` e só dar `COMMIT` depois "
                    "de conferir o número de linhas afetadas."
                ),
            },
            {
                "slug": "transferencia-em-transacao",
                "titulo": "Tudo ou nada",
                "ordem": 3,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "Escreva a transferência de 100 da conta 1 para a conta 2, de "
                    "forma que uma falha no meio não deixe o dinheiro sumido."
                ),
                "solucao_autor": (
                    "BEGIN;\n"
                    "UPDATE conta SET saldo = saldo - 100 WHERE id = 1;\n"
                    "UPDATE conta SET saldo = saldo + 100 WHERE id = 2;\n"
                    "COMMIT;"
                ),
            },
            {
                "slug": "on-delete-cascade",
                "titulo": "CASCADE ou RESTRICT?",
                "ordem": 4,
                "tipo": Tipo.TEORICO,
                "dificuldade": Dificuldade.AVANCADO,
                "enunciado": (
                    "Na chave estrangeira de `matricula` para `aluno`, quando "
                    "`ON DELETE CASCADE` é uma boa escolha e quando ele é "
                    "perigoso?"
                ),
                "solucao_autor": (
                    "`CASCADE` serve quando o filho não tem sentido sem o pai e "
                    "não é histórico que alguém vá auditar, como itens de um "
                    "carrinho abandonado. É perigoso em registro que vale como "
                    "histórico: apagar um aluno por engano levaria junto todas as "
                    "matrículas e notas dele, em silêncio e em cadeia. Para esse "
                    "caso, `RESTRICT` é melhor, porque transforma o engano num "
                    "erro visível e obriga uma decisão consciente. Quando o "
                    "histórico precisa sobreviver ao cadastro, o caminho é não "
                    "apagar o aluno, e sim marcá-lo como excluído."
                ),
            },
        ],
    },
    {
        "slug": "indices-e-desempenho",
        "titulo": "Índices e desempenho",
        "ordem": 6,
        "pre_requisito": "escrita-e-integridade",
        "conteudo": CONTEUDO_INDICES,
        "exercicios": [
            {
                "slug": "indexar-chave-estrangeira",
                "titulo": "O índice que faltava",
                "ordem": 1,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.INICIANTE,
                "enunciado": (
                    "A junção entre `matricula` e `aluno` está lenta. Escreva o "
                    "índice que resolve."
                ),
                "solucao_autor": (
                    "CREATE INDEX idx_matricula_aluno ON matricula (aluno_id);"
                ),
            },
            {
                "slug": "indexar-tudo",
                "titulo": "Por que não indexar tudo?",
                "ordem": 2,
                "tipo": Tipo.TEORICO,
                "dificuldade": Dificuldade.INTERMEDIARIO,
                "enunciado": (
                    "Se índice acelera a leitura, por que não criar um em cada "
                    "coluna da tabela?"
                ),
                "solucao_autor": (
                    "Porque índice precisa ser mantido. Cada `INSERT`, `UPDATE` e "
                    "`DELETE` atualiza também todos os índices da tabela, então a "
                    "escrita fica mais lenta na proporção da quantidade deles. "
                    "Índices também ocupam espaço em disco e em memória, "
                    "disputando cache com os dados. Índice em coluna pouco "
                    "seletiva, como um booleano, quase nunca é usado pelo "
                    "planejador e só cobra o custo. Indexa-se o que as consultas "
                    "reais filtram e ordenam, verificando com `EXPLAIN`."
                ),
            },
            {
                "slug": "ordem-do-indice-composto",
                "titulo": "A ordem das colunas importa",
                "ordem": 3,
                "tipo": Tipo.TEORICO,
                "dificuldade": Dificuldade.AVANCADO,
                "enunciado": (
                    "Existe o índice `(turma_id, nota)`. Quais destas consultas "
                    "conseguem usá-lo, e por quê?\n\n"
                    "1. `WHERE turma_id = 3`\n"
                    "2. `WHERE turma_id = 3 AND nota >= 7`\n"
                    "3. `WHERE nota >= 7`"
                ),
                "solucao_autor": (
                    "As duas primeiras usam. O índice está ordenado primeiro por "
                    "`turma_id` e, dentro de cada turma, por `nota`, então "
                    "procurar por `turma_id` sozinho ou pelos dois na ordem cai "
                    "direto no trecho certo. A terceira não usa: sem saber a "
                    "turma, as notas estão espalhadas por todo o índice, e não há "
                    "trecho contíguo para percorrer. É o mesmo motivo pelo qual "
                    "uma lista ordenada por sobrenome e depois nome não ajuda "
                    "quem só sabe o nome. Para essa consulta seria preciso outro "
                    "índice, começando por `nota`."
                ),
            },
            {
                "slug": "funcao-na-coluna",
                "titulo": "A função que desligou o índice",
                "ordem": 4,
                "tipo": Tipo.CODIGO,
                "dificuldade": Dificuldade.AVANCADO,
                "enunciado": (
                    "Existe índice em `criado_em`, mas a consulta abaixo continua "
                    "varrendo a tabela. Reescreva para que o índice seja "
                    "usado.\n\n"
                    "```sql\n"
                    "SELECT * FROM matricula WHERE YEAR(criado_em) = 2026;\n"
                    "```"
                ),
                "solucao_autor": (
                    "SELECT *\n"
                    "FROM matricula\n"
                    "WHERE criado_em >= '2026-01-01'\n"
                    "  AND criado_em < '2027-01-01';\n\n"
                    "O índice guarda o valor de `criado_em`, não o de "
                    "`YEAR(criado_em)`. Aplicar função na coluna esconde o valor "
                    "indexado e obriga o banco a calcular linha a linha. "
                    "Reescrever como faixa deixa a coluna sozinha de um lado da "
                    "comparação, e o índice volta a servir."
                ),
            },
        ],
    },
]
