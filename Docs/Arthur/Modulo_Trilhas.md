# Módulo de Trilhas

Catálogo de conteúdo do CodeQuest: trilhas, aulas e exercícios, com a primeira
trilha ("Lógica de Programação") preenchida com 6 módulos e 26 fases, mais o
progresso local do aluno.

## Objetivo

Entregar a leitura pública do catálogo, listagem de trilhas, detalhe da trilha
com suas fases e o detalhe de cada exercício, sobre um modelo de dados que
comporta o fluxo editorial já previsto no RBAC do projeto.

## Modelo de dados

Três níveis, `Trilha → Aula → Exercicio`:

| Model | Campos principais |
|---|---|
| `Trilha` | `nome`, `slug` (único), `descricao`, `ordem`, `status` |
| `Aula` | `trilha` (FK), `titulo`, `slug` (único **por trilha**), `conteudo`, `ordem`, `pre_requisito` (self-FK opcional), `status` |
| `Exercicio` | `aula` (FK), `titulo`, `slug` (único **por aula**), `enunciado`, `tipo`, `dificuldade`, `ordem`, `solucao_autor`, `status` |

Decisões que valem registrar:

- **Trilha não tem campo de criatura.** O mascote pertence ao usuário
  (`gamificacao.UserCreature`), é escolhido no cadastro e evolui com o nível.
  Amarrar mascote à trilha descaracterizaria o pet a cada trilha nova.
- **`status` é o fluxo editorial** `RASCUNHO → REVISAO → APROVADO → PUBLICADO`,
  espelhando os codenames que já existiam em `apps/contas/rbac.py`
  (`trilhas.create`, `submit_review`, `review`, `publish`). Só `PUBLICADO`
  aparece na API: `APROVADO` ainda não é público, a publicação é um ato à
  parte.
- **`pre_requisito` é validado em `clean()`**: precisa ser da mesma trilha e não
  pode ser a própria aula. `on_delete=SET_NULL` para que apagar uma fase não
  derrube a seguinte.
- **`solucao_autor` nunca é serializado.** Nenhum serializer o declara, e um
  teste varre o módulo inteiro para garantir que nenhum serializer futuro o
  inclua. O acesso do autor virá por rota própria, protegida por
  `trilhas.view_solution`, em outra entrega.

## API

Leitura pública (`AllowAny` explícito, porque o projeto exige autenticação por
padrão). Todas somente-leitura: os demais métodos devolvem 405.

| Método | Rota | Resposta |
|---|---|---|
| GET | `/api/v1/trilhas/` | Trilhas publicadas, ordenadas, com `total_aulas` e `total_exercicios` (via `annotate`, contando só conteúdo publicado) |
| GET | `/api/v1/trilhas/<slug>/` | Trilha com aulas aninhadas e os exercícios de cada aula |
| GET | `/api/v1/exercicios/<trilha_slug>/<exercicio_slug>/` | Exercício com o contexto da aula e da trilha |

Rascunho não vaza em nenhum nível: uma aula não publicada dentro de uma trilha
publicada não aparece, e o mesmo vale para exercícios.

> **O slug do exercício é único por trilha, não por aula.** A terceira rota não
> cita a aula, então unicidade por aula deixaria a URL ambígua. `Exercicio` tem
> uma FK `trilha` não editável, sincronizada com a aula no `save()`, e a
> `UniqueConstraint` cai sobre `(trilha, slug)`. Repetir um slug na mesma trilha
> levanta `IntegrityError`, e um teste prova isso.

## Segurança dos endpoints públicos

O catálogo é `AllowAny`, então o abuso possível é volume, não vazamento.

- **Limite por IP.** As três views declaram `throttle_scope = "catalogo"` e o
  `ScopedRateThrottle` do DRF aplica `THROTTLE_CATALOGO` (padrão `60/min`).
  O escopo é opt-in: view que não o declara continua sem limite, então nada
  mudou de comportamento nos outros módulos.
- **`NUM_PROXIES = 0`.** Sem esse ajuste o DRF identifica o cliente pelo header
  `X-Forwarded-For`, que o próprio cliente envia: trocar o header a cada
  requisição zeraria a cota. Zero força `REMOTE_ADDR`. Se um dia entrar um
  proxy reverso na frente, esse número precisa virar a quantidade de proxies.
- **O contador vive no cache.** `LocMemCache` é por processo, então com vários
  workers o limite real seria multiplicado. Produção precisa de Redis.
- **Honeypot pronto, ainda não usado.** Não existe endpoint de escrita no
  módulo. `apps/core/honeypot.py` traz `HoneypotSerializerMixin`, que declara o
  campo isca `website` (write-only) e recusa o envio se ele vier preenchido. O
  erro é genérico e não cita o campo, para não entregar a isca ao bot. Já está
  coberto por teste, com um serializer de mentira; o primeiro endpoint de
  escrita só precisa herdar o mixin.

O `next build` pré-renderiza uma página por exercício, e cada uma consulta a
API. Com o catálogo maior o build pode encostar em `60/min`, e por isso a taxa
é lida de `THROTTLE_CATALOGO`.

Não há CORS configurado, de propósito: todo `fetch` do frontend acontece em
Server Component ou em `generateStaticParams`, nunca no navegador.

## Frontend

| Rota | Conteúdo |
|---|---|
| `/trilhas` | Cards de trilha com nome, descrição e contagens |
| `/trilhas/[trilhaSlug]` | Cabeçalho, números da trilha e "Mapa de fases" |
| `/trilhas/[trilhaSlug]/exercicios/[exercicioSlug]` | Enunciado, dificuldade e tipo |

### O 404 de verdade

Um `notFound()` disparado durante o render de uma rota dinâmica **não** devolve
404: o Next já começou a transmitir a resposta com 200 e o status não volta
atrás. Verificado na prática, a página de erro certa vinha com o status errado.

A solução é decidir no roteador, não no render: `generateStaticParams()` lista
os slugs publicados e `dynamicParams = false` faz o Next recusar o resto antes
de qualquer render.

Consequência aceita: **uma trilha publicada depois do build só aparece no
próximo build** (ou numa revalidação sob demanda). Como publicar é um ato
editorial raro e deliberado, o custo é baixo perto de ter 404 correto. Se isso
incomodar, o caminho é disparar revalidação on-demand no momento da publicação.

Pelo mesmo motivo, as rotas de detalhe **não têm `loading.tsx`**: o Suspense
dele libera o shell antes da hora. A listagem tem, porque lá não há 404.

### Progresso do aluno

Não existe autenticação ainda, então não existe a quem associar progresso no
servidor. O MVP guarda no navegador, em `localStorage`, sob a chave
`codequest:progresso`, no formato `{ "trilha-slug": ["fase-slug", ...] }`.

A leitura passa por `useSyncExternalStore`, como a sidebar. O detalhe que
importa: o instantâneo fica em cache no módulo. Ler o storage a cada render
devolveria um objeto novo toda vez, e o React compara por identidade, o que
entraria em laço infinito. Um evento `storage` invalida o cache quando outra
aba grava.

O que o storage devolve é tratado como entrada não confiável, porque o usuário
pode editá-lo: chave que não aponta para lista de strings é descartada, e JSON
corrompido começa vazio em vez de quebrar a página.

Três consumidores, todos derivados do mesmo instantâneo:

| Onde | O que mostra |
|---|---|
| Card da trilha | Percentual real, e a situação `Iniciar`, `Em andamento` ou `Concluída` |
| Cartão de destaque | "Continuar de onde parou", o módulo e a fase onde parou, e o botão apontando direto para ela |
| Página da fase | Botão que alterna entre "Marcar como concluído" e "Concluído" |

A retomada é a **primeira** fase não concluída na ordem da trilha, não a
seguinte à última marcada: quem pula uma fase volta para o buraco que deixou.

O percentual tem teto de 100 de propósito. Uma fase despublicada continua
marcada no navegador de quem já a fez, e sem o teto a barra passaria do fim.

Nada disso chega ao servidor: a API continua somente-leitura e não sabe que o
progresso existe. Em compensação, limpar os dados do site zera tudo, e o
progresso não acompanha quem trocar de navegador ou de máquina.

Na coluna estreita do card, `Em andamento` não cabe. O percentual faz o papel
dela na tela, com `aria-hidden`, e a palavra inteira vai em `sr-only`, para o
leitor de tela ouvir a situação e não só o número.

### Sidebar recolhível

Quem manda no estado é o atributo `data-sidebar` no `<html>`, não o React. Um
script inline no layout lê o `localStorage` antes da primeira pintura, e o CSS
esconde a sidebar a partir do atributo. Guardar isso só em estado React faria a
sidebar recolhida piscar aberta em cada carregamento.

Os dois botões (recolher, dentro da sidebar; abrir, na barra superior que só
aparece com ela recolhida) leem o mesmo atributo por `useSyncExternalStore`,
então nunca discordam. Ao recolher, o foco vai para o botão que assume o lugar,
senão o teclado voltaria ao topo do documento.

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

O `seed_trilhas` é idempotente (`update_or_create`, chaveado por
`(trilha, slug)` tanto para aula quanto para exercício): pode rodar quantas
vezes precisar. Ele cria as cinco trilhas previstas, e só "Lógica de
Programação" sai publicada, com 6 módulos e 26 fases; as outras quatro ficam em
rascunho.

Os módulos são Variáveis e tipos, Condicionais, Repetição, Listas e coleções,
Funções e Depuração e boas práticas, encadeados por pré-requisito nessa ordem.

Frontend (com o backend no ar):

```bash
cd frontend && npm install && npm run dev
```

Aponte para outra API com a variável `NEXT_PUBLIC_API_URL`
(padrão `http://localhost:8000/api/v1`).
Afrouxe o limite do catálogo com `THROTTLE_CATALOGO` no `.env` do backend
(padrão `60/min`) se um build grande esbarrar nele.

## Ambiente de desenvolvimento

O `npm run dev` do frontend passa por `frontend/scripts/dev.mjs` em vez de
chamar o `next dev` direto. É transparente para quem desenvolve: o comando
continua o mesmo, sem flag nem passo extra. O que o wrapper faz é impedir que
o Next regenere `AGENTS.md` e `CLAUDE.md` na raiz do frontend a cada
inicialização, arquivos de instrução de ferramenta que não fazem parte do
projeto. É uma decisão de higiene do ambiente, não de ocultar uso de IA: o
uso de IA no desenvolvimento do CodeQuest é reconhecido e documentado neste
diretório quando aplicável. O mecanismo por trás está explicado no
comentário de cabeçalho do próprio script.

## Validação

```bash
cd backend && .venv/Scripts/python -m pytest --cov && .venv/Scripts/python -m ruff check . && .venv/Scripts/python -m mypy
```

```bash
cd frontend && npm test && npx tsc --noEmit && npm run build
```

Os testes do app ficam em `backend/apps/trilhas/tests/`, separados por camada
(`test_models`, `test_serializers`, `test_views`, `test_seed`,
`test_throttling`). No frontend ficam em `__tests__/` ao lado do que testam.

O `npm run dev` passa por `frontend/scripts/dev.mjs`, e não direto pelo
`next dev`. O motivo está no comentário de cabeçalho do arquivo: o Next inspeciona
o ambiente na inicialização e, conforme o que encontra, escreve arquivos de
instrução na raiz do frontend, que voltam a cada `next dev` mesmo depois de
apagados. O wrapper limpa essas variáveis antes de repassar o processo. A
alternativa seria editar `node_modules`, que some no próximo `npm install`.

## O que ficou de fora

- Progresso no servidor: o que existe é local e anônimo, preso ao navegador.
  Sem autenticação não há a quem associá-lo.
- XP e streak: aparecem nos modelos de tela e continuam sem implementação. A
  sidebar mostra o perfil neutro em vez de número inventado.
- Terminal integrado e submissão de exercício.
- Endpoint de autor para `solucao_autor` (o codename `trilhas.view_solution` já
  existe no RBAC, esperando).
- Telas de "Desafio do dia", "Conquistas" e "Configurações": aparecem no menu
  como itens explicitamente inativos, não como links quebrados.
