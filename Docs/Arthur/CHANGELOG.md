# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [Não publicado]

### Adicionado

- **Módulo de Trilhas** (`backend/apps/trilhas/`): models `Trilha`, `Aula` e
  `Exercicio`, com slug composto único, fluxo editorial em quatro estados e
  pré-requisito entre aulas validado na mesma trilha.
- **API pública de leitura**: `GET /api/trilhas/`, `GET /api/trilhas/<slug>/` e
  `GET /api/exercicios/<trilha_slug>/<exercicio_slug>/`. Serializers com
  allowlist explícita de campos; `solucao_autor` não é exposto em nenhuma delas.
- **Comando `seed_trilhas`**: idempotente, cria as cinco trilhas previstas e
  publica "Lógica de Programação" com 6 módulos e 26 fases, de variáveis a
  depuração. A chave do `update_or_create` é `(trilha, slug)` nos dois níveis,
  então rodar de novo reaproveita as linhas em vez de duplicá-las.
- **Telas de trilhas** (Next.js): listagem, detalhe da trilha com mapa de fases
  e detalhe do exercício, com estados de carregamento, erro e 404.
- **Progresso do aluno, local e anônimo** (`frontend/src/lib/progresso.ts`):
  o botão "Marcar como concluído" na fase grava em `localStorage`, e a
  listagem lê dali o percentual de cada trilha, a situação do card e o
  "Continuar de onde parou" do destaque, que aponta para a primeira fase não
  concluída. Nada disso chega ao servidor: a API segue somente-leitura.
- **Testes**: 84 no backend (`apps/trilhas/tests/`, separados por camada) e 98
  no frontend (Jest + React Testing Library).

### Alterado

- `config/settings.py` registra `apps.trilhas` e acrescenta o
  `ScopedRateThrottle` com a taxa `catalogo` às classes que a base já usava;
  `config/urls.py` inclui as rotas dentro do prefixo `/api/v1/` da base.
- `pyproject.toml`: `testpaths` passa a incluir `apps/`, para que o teste de cada
  app viva dentro do app. Adicionadas configurações de cobertura e de mypy.
- `tests/test_admin_disabled.py` passa a cobrir o app `trilhas`: nenhum model do
  projeto é registrado no admin do Django, para que toda ação administrativa
  continue passando pelas regras de negócio e pela trilha de auditoria.
- `frontend/src/app/globals.css`: a paleta da base é a que vale. Os tokens das
  telas de trilhas foram remapeados para os dela (`acento` → `brand`,
  `painel` → `panel`, `borda` → `edge`, `texto` → `ink-soft`, e assim por
  diante); o arquivo só ganhou `--color-success`, as utilidades `rotulo`,
  `titulo`, `marca` e `halo-brand`, e as regras de exibição da sidebar.
- `frontend/src/lib/api.ts` e `types.ts`: os tipos e as três funções do
  catálogo entram ao lado do que a base já tinha para auth e criaturas. O
  cliente é um só: `ErroApi` ganhou `naoEncontrado`, e `requisicao` ganhou
  `revalidacao`/`etiquetas` para o cache do Next nas rotas estáticas.
- `frontend/package.json`: entram Jest, Testing Library e os scripts `test` e
  `test:cov`. O script `dev` da base fica como estava; `scripts/dev.mjs` é um
  wrapper fino que limpa variáveis de ambiente antes de chamar o `next dev`.
  Sem ele o Next escreve arquivos de instrução na raiz do frontend a cada
  inicialização, e eles voltam mesmo depois de apagados.
- `frontend/scripts/dev.mjs` ganhou um comentário de cabeçalho explicando o
  motivo do wrapper, e `Docs/Arthur/Modulo_Trilhas.md` ganhou a seção
  "Ambiente de desenvolvimento": ambos deixam explícito que a limpeza é
  higiene do ambiente, não ocultação de uso de IA no projeto.
- **Lint e tipos zerados**: ruff 12 → 0 (constantes `PODE_*` saíram do meio
  dos imports em `gamificacao/views.py` e `progressao/views.py`, e imports
  reordenados), mypy 10 → 0 com anotações em `correcao/analise_ast.py`, sem
  `ignore_errors` novo, e ESLint de 1 erro e 3 avisos para 0, sem
  `eslint-disable`. Em `SecaoAtividade.tsx`, o `carregando` passa a ser
  derivado da página que já respondeu, em vez de `setState` dentro do efeito.
- **Docstrings do nível de acesso**: `NivelDeAcesso`, o `help_text` de
  `User.nivel_de_acesso` (migration `contas/0014`, só texto), o docstring de
  `AcaoAuditoria` e o comentário de `PainelAdmin.tsx` diziam que o admin é o
  `role` e pode tudo. Hoje quem manda é o nível, admin inclusive.

### Segurança

- **Painel de RBAC auditado** (`backend/apps/contas/views_rbac.py`): criar,
  editar e remover nível de acesso, e atribuir nível a um usuário, passam a
  gravar `NIVEL_CRIADO`, `NIVEL_EDITADO`, `NIVEL_REMOVIDO` e `NIVEL_ATRIBUIDO`
  (migration `auditoria/0005`), com ator, alvo e valores antigo e novo. Cada
  ação roda em `transaction.atomic()` junto com o seu registro. Um PATCH que
  não muda nada não grava `NIVEL_EDITADO`.
- **`registrar()` isolado num savepoint** (`backend/apps/auditoria/services.py`):
  o `save()` do Django marca para rollback o `atomic()` de quem chamou em
  qualquer exceção. Sem o savepoint, uma falha ao gravar a auditoria desfazia a
  ação em silêncio, com resposta 200. Vale para todos os chamadores.
- **Anonimização LGPD exige o registro** (`backend/apps/contas/lgpd.py`): o
  `CONTA_ANONIMIZADA` é prova obrigatória e passa a ser gravado direto, fora do
  `registrar()`. Se o registro falhar, a anonimização inteira volta atrás.
- **Troca de e-mail com senha atual** (vetor A1 do handoff): antes, uma sessão
  roubada trocava o e-mail sem senha e, com o 2FA por e-mail, tomava a conta.
  Agora `POST /auth/eu/email/` exige `senha_atual` (as tentativas erradas
  contam no bloqueio do login) e grava o pedido em `User.email_pendente`
  (migration `contas/0013`). A troca tem duas etapas no mesmo
  `/auth/eu/email/confirmar/`: o 1º link vai ao endereço ATUAL, que autoriza;
  o 2º vai ao NOVO, que prova a posse, e só ele efetiva a troca. Cada link vale
  30 minutos (`TROCA_EMAIL_MAX_AGE`, antes 24 horas), uma vez só. Um pedido
  novo ou uma redefinição de senha invalidam o pendente. Login, 2FA e
  redefinição de senha seguem no endereço atual até a efetivação. A tela de
  Configurações pede a senha atual e a página do link só confirma no clique.
  A autorização pelo endereço atual grava `TROCA_EMAIL_AUTORIZADA`, com o IP
  de quem aprovou (migration `auditoria/0006`).
- **Cota do Judge0 em três camadas** (A2 e A3 do handoff): antes, um único
  usuário esgotava a cota diária do RapidAPI em pouco mais de um minuto e a
  correção parava para todos até a meia-noite.
  - Por usuário: rajada de 5 por minuto (escopo `judge0`) e teto de chamadas
    pagas no dia (`JUDGE0_LIMITE_POR_USUARIO`, padrão 10, resposta 429 com
    `limite_do_usuario`), os dois divididos entre o `executar/` e o envio de
    código do `concluir/`. **Muda o comportamento visível:** o botão Enviar
    passa a seguir também o limite do Executar, e o de 5 por minuto é o que
    prende (o `conclusao`, de 30, continua valendo para todo `concluir/`).
    Concluir exercício sem correção automática fica só no escopo
    `conclusao`, e o `codigo/` (leitura da especificação) não entra no balde.
    O teto do dia conta no banco e só chamadas pagas: acerto de cache e
    código barrado antes do Judge0 não gastam. O escopo `execucao` e a
    variável `THROTTLE_EXECUCAO` saíram.
  - O cache de submissão idêntica, que já existia em `Submissao`, passa a
    valer 10 minutos contados da chamada paga, ignora espaço no fim de linha e
    linhas em branco nas bordas, e inclui a visibilidade dos casos na chave.
  - O limite diário vira disjuntor: para em 90% de `JUDGE0_LIMITE_DIARIO` e
    responde **503** com `limite_diario` no envelope de erro (antes, 400 em
    100%). Continua contando no banco e zerando à meia-noite. O padrão de
    `JUDGE0_LIMITE_DIARIO` cai de 300 para 50, a cota do plano: com 300, onde
    a variável faltasse, o disjuntor nunca abriria antes do próprio RapidAPI.
  - A tentativa é gravada antes da chamada paga: chamada que falha (timeout,
    5xx) também conta na cota, e chamadas simultâneas passam a se enxergar.
- **2FA não troca de método só com a sessão**
  (`backend/apps/contas/views.py`, `MfaIniciarView`): com 2FA ativo, iniciar
  outro método desligava o atual sem código. Agora é recusado
  (`mfa_ja_ativo`); trocar de método passa por desativar, que exige código.
- **Submeter código exige `submissoes.create`** (`backend/apps/correcao/views.py`
  e `backend/apps/progressao/views.py`): antes, `codigo/` e `executar/` pediam
  só login. Agora os dois exigem a permissão, e o envio de código do
  `concluir/` também, checado antes da rajada do Judge0: o 403 não gasta o
  balde de ninguém. Quem tem `exercicios.complete` sem `submissoes.create`
  conclui exercício teórico, mas não chega ao Judge0. Os níveis de sistema
  (Aluno, Autor, Admin) já concedem a permissão, então a mudança só aparece em
  nível personalizado. A tela do exercício separa o 403 ("seu nível de acesso
  não inclui resolver exercícios com código") do 404 e da falha de rede, que
  antes caíam todos na mesma nota de "próxima entrega".
- **CSP no frontend** (`frontend/next.config.ts`, via `headers()`, sem
  dependência nova): `default-src 'self'`, com `cdn.jsdelivr.net` só em
  `script-src` e `style-src` (o Monaco vem de lá em runtime), `worker-src
  'self' blob:` (o worker do editor nasce de um blob), `font-src 'self' data:`
  (a fonte dos ícones vem embutida no CSS), `object-src 'none'`, `base-uri`,
  `form-action` e `frame-ancestors 'none'`. Verificado em `next build` +
  `next start`: o editor carrega sem nenhuma violação, e script, `fetch` e
  imagem de outro domínio são barrados. `'unsafe-eval'` entra só no
  `next dev`. **Limite conhecido:** `script-src` leva `'unsafe-inline'`,
  porque o Next injeta script inline e as páginas estáticas não têm nonce.
  A CSP barra script de outra origem, mas não script inline injetado. Tirar
  exige nonce no `proxy.ts` e render dinâmico.

### Notas

- As rotas de detalhe usam `generateStaticParams` com `dynamicParams = false`.
  É o que faz um slug inválido devolver **404 de verdade**: um `notFound()`
  disparado durante o render de rota dinâmica chega depois de a resposta já ter
  saído com 200. Em troca, uma trilha publicada depois do build só aparece no
  próximo build ou após revalidação sob demanda.
- O progresso é do navegador, não do aluno: sem autenticação não há a quem
  associá-lo no servidor. Limpar os dados do site zera tudo, e o progresso não
  acompanha quem trocar de máquina. Quando a gamificação entrar, o
  `localStorage` vira a origem da primeira sincronização.
- XP e streak continuam só nos modelos de tela. A sidebar mostra o perfil
  neutro de propósito: preencher com número inventado seria pior que a
  ausência.
- **Pendente: o dia do RapidAPI não é o dia do CodeQuest.** O disjuntor conta
  a partir da meia-noite de `America/Sao_Paulo`, mas a documentação do
  RapidAPI diz que a cota diária recomeça no horário da assinatura, 24 horas
  depois. Com as janelas desalinhadas, dois dias do CodeQuest podem somar mais
  que a cota numa janela do RapidAPI. O horário da assinatura está no
  Transaction History da conta; sem ele, nada foi mudado.
- `data_nascimento` segue obrigatório no cadastro de propósito: é o que
  sustenta a idade mínima de 16 anos. O modelo já aceita nulo, o
  `createsuperuser` não pede o campo, nenhum seed cria usuário e não há suíte
  E2E no repositório, então não havia o que ajustar.
