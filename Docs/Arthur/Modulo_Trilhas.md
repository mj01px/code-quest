# Módulo de Trilhas

O catálogo de conteúdo do CodeQuest: trilhas, aulas e exercícios. A primeira
trilha, "Lógica de Programação", já vem preenchida com 6 módulos e 26 fases,
e o progresso do aluno vem do servidor.

## Objetivo

Oferecer a leitura pública do catálogo (a listagem de trilhas, o detalhe de
cada trilha com suas fases e o detalhe de cada exercício) sobre um modelo de
dados capaz de comportar o fluxo editorial que o RBAC do projeto já previa.

## Modelo de dados

São três níveis, `Trilha → Aula → Exercicio`:

| Model | Campos principais |
|---|---|
| `Trilha` | `nome`, `slug` (único), `descricao`, `ordem`, `status` |
| `Aula` | `trilha` (FK), `titulo`, `slug` (único **por trilha**), `conteudo`, `ordem`, `pre_requisito` (self-FK opcional), `status` |
| `Exercicio` | `aula` (FK), `titulo`, `slug` (único **por aula**), `enunciado`, `tipo`, `dificuldade`, `ordem`, `solucao_autor`, `status` |

Algumas decisões merecem registro:

- **Trilha não tem campo de criatura.** O mascote é do usuário
  (`gamificacao.UserCreature`): é escolhido no cadastro e evolui com o nível.
  Prender o mascote à trilha tiraria o sentido do pet a cada trilha nova.
- **`status` representa o fluxo editorial**
  `RASCUNHO → REVISAO → APROVADO → PUBLICADO`, espelho dos codenames que já
  existiam em `apps/contas/rbac.py` (`trilhas.create`, `submit_review`,
  `review`, `publish`). A API só mostra `PUBLICADO`. `APROVADO` ainda não é
  público, porque publicar é um ato separado.
- **`pre_requisito` passa por validação em `clean()`**: tem de pertencer à
  mesma trilha e não pode ser a própria aula. Com `on_delete=SET_NULL`,
  apagar uma fase não derruba a seguinte.
- **`solucao_autor` nunca é serializado.** Nenhum serializer declara o campo,
  e um teste percorre o módulo inteiro para impedir que algum serializer
  futuro o inclua. O autor vai acessá-lo por uma rota própria, protegida por
  `trilhas.view_solution`, em outra entrega.

## API

A leitura é pública, com `AllowAny` explícito, já que o projeto exige
autenticação por padrão. As três rotas são somente-leitura, e qualquer outro
método recebe 405.

| Método | Rota | Resposta |
|---|---|---|
| GET | `/api/v1/trilhas/` | Trilhas publicadas, ordenadas, com `total_aulas` e `total_exercicios` (via `annotate`, contando só conteúdo publicado) |
| GET | `/api/v1/trilhas/<slug>/` | Trilha com aulas aninhadas e os exercícios de cada aula |
| GET | `/api/v1/exercicios/<trilha_slug>/<exercicio_slug>/` | Exercício com o contexto da aula e da trilha |

Rascunho não vaza em nível nenhum. Aula não publicada dentro de trilha
publicada fica de fora, e com exercícios acontece o mesmo.

### Fluxo editorial

As transições moram em `apps/autoria` (`services.transicionar`), fora do
namespace público. Todas são `POST` sem corpo, exigem login e a permissão
RBAC da ação, e usam o balde de throttle `editorial`. `<tipo>` é `trilhas`,
`aulas` ou `exercicios`; `<pk>` é o id do conteúdo.

| Rota `POST /api/v1/autoria/<tipo>/<pk>/...` | Permissão | Transição |
|---|---|---|
| `submeter/` | `trilhas.submit_review` | `RASCUNHO` para `REVISAO` |
| `aprovar/` | `trilhas.review` | `REVISAO` para `APROVADO` |
| `devolver/` | `trilhas.review` | `REVISAO` para `RASCUNHO` |
| `publicar/` | `trilhas.publish` | `APROVADO` para `PUBLICADO` |

A resposta é `{ "id", "status_editorial" }`. Anônimo recebe 401, sem a
permissão 403 (antes de qualquer consulta, então pk inexistente também dá
403), e estado de origem errado devolve 400 no envelope padrão, com
`details[0].code == "transicao_invalida"`. A linha fica travada com
`select_for_update` entre a leitura e a gravação, e a gravação usa
`save(update_fields=...)` (`status` mais o carimbo `auto_now` do model).
Cada transição bem-sucedida, e só ela, entra em `apps/auditoria` na mesma
transação, com as ações `CONTEUDO_SUBMETIDO`, `CONTEUDO_APROVADO`,
`CONTEUDO_DEVOLVIDO` e `CONTEUDO_PUBLICADO`, o autor da ação, o alvo e os
estados de origem e destino. A auditoria nunca quebra o fluxo: se a gravação
do registro falhar, o erro é logado e a transição continua confirmada, sem
rastro. Publicar trilha com aula (ou aula com exercício) fora de `APROVADO`
ou `PUBLICADO` devolve 400 com `details[0].code == "conteudo_incompleto"`.
Ainda não há dono no conteúdo.

> **O slug do exercício é único por trilha, e não por aula.** Como a terceira
> rota não menciona a aula, unicidade por aula deixaria a URL ambígua. Por
> isso `Exercicio` tem uma FK `trilha` não editável, sincronizada com a aula
> no `save()`, e a `UniqueConstraint` recai sobre `(trilha, slug)`. Repetir um
> slug na mesma trilha levanta `IntegrityError`, e há um teste que prova isso.

## Segurança dos endpoints públicos

Como o catálogo é `AllowAny`, o abuso possível é de volume, não de vazamento.

- **Limite por IP.** As três views declaram `throttle_scope = "catalogo"`, e
  o `ScopedRateThrottle` do DRF aplica `THROTTLE_CATALOGO` (por padrão,
  `60/min`). O escopo é opt-in: view que não o declara segue sem limite, e o
  comportamento dos outros módulos não mudou.
- **`NUM_PROXIES = 1`.** O Next fica na frente do Django (rewrite de `/api`),
  então o `REMOTE_ADDR` que o Django recebe é o do servidor Next, e o IP do
  aluno chega como último item do header `X-Forwarded-For`. Com zero, todos
  os alunos dividiriam a mesma cota. Em produção, o Nginx sobrescreve o
  `X-Forwarded-For` com o endereço real da conexão, para que o cliente não
  consiga forjar o próprio IP e zerar a cota.
- **O contador fica no cache.** Foi implementado usando o DatabaseCache do
  PostgreSQL, garantindo persistência e compartilhamento entre workers sem
  novas dependências de infraestrutura. Com vários workers, o limite vale como
  declarado.

O `next build` ainda chama o `generateStaticParams` das rotas de trilha e de
exercício, que consulta o catálogo na API, mas não pré-renderiza mais as
páginas: desde a CSP com nonce (RNF11), toda página é renderizada por request.
A taxa continua vindo de `THROTTLE_CATALOGO`, para ser ajustada sem mexer no
código.

O CORS está configurado no Django (`CORS_ALLOWED_ORIGINS`, por padrão
`localhost:3000` e `127.0.0.1:3000`, com `CORS_ALLOW_CREDENTIALS`), mas o
catálogo não depende dele. No navegador, o `lib/api.ts` chama `/api/v1` na
mesma origem, e o Next repassa ao Django pelo rewrite de `/api/*`; no servidor
(Server Components e `generateStaticParams`), o `fetch` vai direto a
`API_ORIGIN`, onde o CORS não se aplica.

## Frontend

| Rota | Conteúdo |
|---|---|
| `/trilhas` | Cards de trilha com nome, descrição e contagens |
| `/trilhas/[trilhaSlug]` | Cabeçalho, números da trilha e "Mapa de fases" |
| `/trilhas/[trilhaSlug]/exercicios/[exercicioSlug]` | Enunciado, dificuldade e tipo |

### O 404 de verdade

Quando um `notFound()` é disparado durante o render de uma rota dinâmica, a
resposta **não** sai como 404. O Next já começou a transmitir com 200, e o
status não tem como voltar. Foi o que se viu na prática: a página de erro
certa chegava com o status errado.

A saída adotada foi decidir no roteador, e não no render: `generateStaticParams()`
lista os slugs publicados, e `dynamicParams = false` fazia o Next recusar
qualquer outro antes de renderizar. Isso valia enquanto as páginas eram
pré-renderizadas no build. Com a CSP com nonce (RNF11), toda página passou a
ser renderizada por request, e o roteador deixou de barrar o slug: a página
consulta a API e o `notFound()` volta a acontecer durante o render.

O resultado, medido depois da mudança:

- **Exercício inexistente** (`/trilhas/{trilha}/exercicios/{slug}`): responde
  404, porque o grupo `(foco)` não tem `loading.tsx` e nada é transmitido
  antes do `notFound()`.
- **Trilha inexistente** (`/trilhas/{slug}`): mostra a página de "não
  encontrado", mas com status 200. O `loading.tsx` da listagem, em
  `(app)/trilhas/`, também envolve a rota de detalhe, e o Suspense dele libera
  o shell antes do `notFound()`.

Em troca, uma trilha publicada depois do build aparece sem novo build, porque
a página consulta a API a cada visita. Para devolver o 404 real à trilha, um
caminho possível é tirar a rota de detalhe do alcance do `loading.tsx` da
listagem.

### Progresso do aluno

O progresso mora no servidor, vinculado ao usuário logado. O
`ProvedorProgresso` busca `GET /api/v1/eu/exercicios-concluidos/` e
`lib/progresso.ts` só agrega o resultado, sem `localStorage`. A chave de cada
fase junta o slug da trilha e o do exercício (`trilha/exercicio`), porque o
slug do exercício só é único dentro da trilha.

A resposta da API é tratada como fronteira, e não como fonte confiável de
tipo: linha sem `trilha_slug` ou `exercicio_slug` válidos é descartada, e
corpo que não seja uma lista faz o progresso começar vazio, em vez de quebrar a
página.

São três consumidores, todos derivados da mesma lista:

| Onde | O que mostra |
|---|---|
| Card da trilha | Percentual real, e a situação `Iniciar`, `Em andamento` ou `Concluída` |
| Cartão de destaque | "Continuar de onde parou", o módulo e a fase onde parou, e o botão apontando direto para ela |
| Página da fase | Botão que alterna entre "Marcar como concluído" e "Concluído" |

A retomada leva à **primeira** fase não concluída na ordem da trilha, e não à
que vem depois da última marcada. Quem pula uma fase volta para o buraco que
deixou.

O percentual tem teto de 100, de propósito. Uma fase despublicada continua
marcada para quem já a fez; sem o teto, a barra passaria do fim.

As rotas de trilhas e exercícios seguem somente-leitura. Quem grava a
conclusão é o app `progressao`, por `POST /api/v1/exercicios/<trilha_slug>/<exercicio_slug>/concluir/`,
e o XP é decidido no servidor. Como o progresso é da conta, ele acompanha o
aluno entre navegadores e máquinas.

`Em andamento` não cabe na coluna estreita do card. Na tela, o percentual
cumpre esse papel, com `aria-hidden`, enquanto a palavra completa vai em
`sr-only`: assim o leitor de tela anuncia a situação, e não só o número.

### Sidebar recolhível

O estado é controlado pelo atributo `data-sidebar` no `<html>`, não pelo
React. Antes da primeira pintura, um script inline no layout lê o
`localStorage`, e o CSS esconde a sidebar a partir do atributo. Se isso
ficasse só em estado React, a sidebar recolhida piscaria aberta a cada
carregamento.

Há dois botões: o de recolher, dentro da sidebar, e o de abrir, na barra
superior que só aparece com ela recolhida. Ambos leem o mesmo atributo por
`useSyncExternalStore`, então nunca discordam. Ao recolher, o foco passa para
o botão que assume o lugar; do contrário, o teclado voltaria ao topo do
documento.

### CSP e o editor de código

Em toda rota de página, `frontend/src/proxy.ts` monta a
`Content-Security-Policy` com um nonce novo por request e a envia na resposta
e na própria request, de onde o Next lê o nonce para aplicá-lo aos seus
scripts. Para isso, o layout raiz força o render por request (`connection()`):
uma página estática sairia sem nonce. Quem exige exceção é o Monaco da página
do exercício. Em
runtime, o `@monaco-editor/loader` busca `loader.js` e o CSS em
`cdn.jsdelivr.net`, a fonte dos ícones chega como `data:` dentro do CSS e o
worker nasce de um `blob:`. Daí vêm o caminho
`https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/` em `script-src` e
`style-src` (só a versão que o carregador pede, não o jsdelivr inteiro),
`data:` em `font-src` e `blob:` em `worker-src`. Todo o resto
fica em `'self'`: a API passa pelo rewrite de `/api/*`, e os sprites seguem
`SPRITE_BASE_URL` (`/criaturas/`). Caso os sprites mudem de origem, a nova
origem precisa entrar em `img-src`.

`script-src` não aceita `'unsafe-inline'`: só roda o script que traz o nonce
da resposta, e um script inline injetado é barrado. `style-src` mantém
`'unsafe-inline'`, porque o Monaco e o Next injetam estilos sem nonce.
`'unsafe-eval'` entra apenas no `next dev`.

## Como rodar

Backend:

```bash
cd backend && python -m venv .venv && .venv/Scripts/pip install -r requirements.txt
```

```bash
cd backend && cp .env.example .env && .venv/Scripts/python manage.py migrate && .venv/Scripts/python manage.py seed_trilhas
```

```bash
cd backend && .venv/Scripts/python manage.py runserver
```

O `seed_trilhas` é idempotente (`update_or_create` com chave
`(trilha, slug)`, tanto para aula quanto para exercício), então pode rodar
quantas vezes for preciso. Ele cria as cinco trilhas previstas, mas só
"Lógica de Programação" sai publicada, com 6 módulos e 26 fases. As outras
quatro ficam em rascunho.

Os módulos, encadeados por pré-requisito nesta ordem, são: Variáveis e tipos,
Condicionais, Repetição, Listas e coleções, Funções, e Depuração e boas
práticas.

Frontend (com o backend no ar):

```bash
cd frontend && npm install && npm run dev
```

Para apontar para outra API, use a variável `NEXT_PUBLIC_API_URL` (padrão
`http://localhost:8000/api/v1`). Se um build grande esbarrar no limite do
catálogo, afrouxe-o com `THROTTLE_CATALOGO` no `.env` do backend (padrão
`60/min`).

## Ambiente de desenvolvimento

Em vez de chamar o `next dev` direto, o `npm run dev` do frontend passa por
`frontend/scripts/dev.mjs`. Para quem desenvolve, nada muda: o comando é o
mesmo, sem flag nem passo extra. O wrapper existe para impedir que o Next
regenere `AGENTS.md` e `CLAUDE.md` na raiz do frontend a cada inicialização,
arquivos de instrução de ferramenta que não fazem parte do projeto. É uma
decisão de higiene do ambiente, não de ocultar uso de IA: o uso de IA no
desenvolvimento do CodeQuest é reconhecido e documentado neste diretório
quando aplicável. O comentário de cabeçalho do próprio script explica o
mecanismo por trás.

## Validação

```bash
cd backend && .venv/Scripts/python -m pytest --cov && .venv/Scripts/python -m ruff check . && .venv/Scripts/python -m mypy
```

```bash
cd frontend && npm test && npx tsc --noEmit && npm run build
```

No backend, os testes do app ficam em `backend/apps/trilhas/tests/`,
divididos por camada (`test_models`, `test_serializers`, `test_views`,
`test_seed`, `test_throttling`). No frontend, ficam em `__tests__/`, ao lado
do que testam.

O `npm run dev` não chama o `next dev` direto: passa antes por
`frontend/scripts/dev.mjs`. O comentário de cabeçalho do arquivo explica o
porquê. Na inicialização, o Next inspeciona o ambiente e, dependendo do que
encontra, escreve arquivos de instrução na raiz do frontend, que reaparecem a
cada `next dev` mesmo depois de apagados. O wrapper limpa essas variáveis e só
então repassa o processo. A alternativa seria editar `node_modules`, e essa
edição sumiria no próximo `npm install`.

## O que ficou de fora

- Rotas e telas para criar e editar trilhas, aulas e exercícios. O conteúdo
  entra pela carga `seed_trilhas`.
- Botão de publicar na tela `/autoria`. A rota `publicar/` existe e exige
  `trilhas.publish`, mas a tela só envia para revisão, aprova e devolve.
- Dono no conteúdo (autor vinculado) e o parecer do revisor registrado na
  devolução.
