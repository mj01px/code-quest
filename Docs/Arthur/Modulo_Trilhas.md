# Módulo de Trilhas

O catálogo de conteúdo do CodeQuest: trilhas, aulas e exercícios. A primeira
trilha, "Lógica de Programação", já vem preenchida com 6 módulos e 26 fases,
e o aluno conta com progresso local.

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
- **`NUM_PROXIES = 0`.** Sem esse ajuste, o DRF identifica o cliente pelo
  header `X-Forwarded-For`, que é enviado pelo próprio cliente; bastaria
  trocar o header a cada requisição para zerar a cota. Com zero, vale o
  `REMOTE_ADDR`. Se algum dia um proxy reverso entrar na frente, esse número
  tem de passar a ser a quantidade de proxies.
- **O contador fica no cache.** O `LocMemCache` é por processo. Com vários
  workers, o limite real se multiplicaria, então produção precisa de Redis.
- **Honeypot pronto, mas ainda sem uso.** O módulo não tem endpoint de
  escrita. Em `apps/core/honeypot.py` está o `HoneypotSerializerMixin`, que
  declara o campo isca `website` (write-only) e recusa o envio quando ele
  chega preenchido. O erro é genérico e não cita o campo, para não revelar a
  isca ao bot. Um teste já cobre o mixin com um serializer de mentira, e o
  primeiro endpoint de escrita só vai precisar herdá-lo.

No `next build`, cada exercício ganha uma página pré-renderizada, e cada uma
consulta a API. Conforme o catálogo cresce, o build pode esbarrar nos
`60/min`; é por isso que a taxa vem de `THROTTLE_CATALOGO`.

CORS não foi configurado, e isso é proposital. Todo `fetch` do frontend roda
em Server Component ou em `generateStaticParams`, nunca no navegador.

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

A saída é decidir no roteador, e não no render. `generateStaticParams()`
lista os slugs publicados, e `dynamicParams = false` faz o Next recusar
qualquer outro antes de renderizar.

Há uma consequência, aceita de caso pensado: **uma trilha publicada depois
do build só aparece no build seguinte** (ou após uma revalidação sob
demanda). Publicar é um ato editorial raro e deliberado, então o custo é
baixo perto de ter o 404 correto. Se isso incomodar, o caminho é disparar
revalidação on-demand no momento da publicação.

Pelo mesmo motivo, as rotas de detalhe **não têm `loading.tsx`**: o Suspense
dele libera o shell cedo demais. A listagem tem, porque lá não existe 404.

### Progresso do aluno

Ainda não há autenticação, portanto não há a quem vincular progresso no
servidor. No MVP ele fica no navegador, em `localStorage`, sob a chave
`codequest:progresso` e no formato `{ "trilha-slug": ["fase-slug", ...] }`.

A leitura usa `useSyncExternalStore`, assim como a sidebar. O ponto que
importa é o instantâneo ficar em cache no módulo. Lido a cada render, o
storage devolveria um objeto novo toda vez; como o React compara por
identidade, o resultado seria um laço infinito. Quando outra aba grava, um
evento `storage` invalida o cache.

O conteúdo do storage é tratado como entrada não confiável, porque o usuário
pode editá-lo. Chave que não aponte para uma lista de strings é descartada, e
JSON corrompido faz o progresso começar vazio, em vez de quebrar a página.

São três consumidores, todos derivados do mesmo instantâneo:

| Onde | O que mostra |
|---|---|
| Card da trilha | Percentual real, e a situação `Iniciar`, `Em andamento` ou `Concluída` |
| Cartão de destaque | "Continuar de onde parou", o módulo e a fase onde parou, e o botão apontando direto para ela |
| Página da fase | Botão que alterna entre "Marcar como concluído" e "Concluído" |

A retomada leva à **primeira** fase não concluída na ordem da trilha, e não à
que vem depois da última marcada. Quem pula uma fase volta para o buraco que
deixou.

O percentual tem teto de 100, de propósito. Uma fase despublicada continua
marcada no navegador de quem já a fez; sem o teto, a barra passaria do fim.

O servidor não fica sabendo de nada disso. A API segue somente-leitura e
ignora que o progresso existe. O preço é que limpar os dados do site zera
tudo, e o progresso não vai junto quando alguém troca de navegador ou de
máquina.

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

Em toda rota, `frontend/next.config.ts` envia uma `Content-Security-Policy`
via `headers()`. Quem exige exceção é o Monaco da página do exercício. Em
runtime, o `@monaco-editor/loader` busca `loader.js` e o CSS em
`cdn.jsdelivr.net`, a fonte dos ícones chega como `data:` dentro do CSS e o
worker nasce de um `blob:`. Daí vêm `cdn.jsdelivr.net` em `script-src` e
`style-src`, `data:` em `font-src` e `blob:` em `worker-src`. Todo o resto
fica em `'self'`: a API passa pelo rewrite de `/api/*`, e os sprites seguem
`SPRITE_BASE_URL` (`/criaturas/`). Caso os sprites mudem de origem, a nova
origem precisa entrar em `img-src`.

`script-src` leva `'unsafe-inline'` porque o Next injeta script inline e as
páginas estáticas não têm nonce. A política barra script de outra origem, mas
não script inline injetado. Para tirar isso é preciso nonce no `proxy.ts`, e
o nonce obriga render dinâmico em toda página, abrindo mão do HTML estático
de hoje. Quando chegar esse momento, vale fixar a CDN no caminho do
`monaco-editor`, já que o jsdelivr serve qualquer pacote do npm.
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

- Progresso no servidor. O que existe é local e anônimo, preso ao navegador,
  e sem autenticação não há a quem associá-lo.
- XP e streak, que aparecem nos modelos de tela mas seguem sem
  implementação. Em vez de número inventado, a sidebar mostra o perfil
  neutro.
- Terminal integrado e submissão de exercício.
- Endpoint de autor para `solucao_autor` (o codename `trilhas.view_solution`
  já existe no RBAC, à espera).
- Telas de "Desafio do dia", "Conquistas" e "Configurações", que aparecem no
  menu como itens explicitamente inativos, e não como links quebrados.
