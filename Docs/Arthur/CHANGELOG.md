# Changelog

Segue o formato do [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [Não publicado]

### Adicionado

- **Módulo de Trilhas** (`backend/apps/trilhas/`): três models, `Trilha`,
  `Aula` e `Exercicio`. Eles têm slug composto único e fluxo editorial em
  quatro estados, e o pré-requisito entre aulas é validado dentro da mesma
  trilha.
- **API pública de leitura**: três rotas, `GET /api/trilhas/`,
  `GET /api/trilhas/<slug>/` e
  `GET /api/exercicios/<trilha_slug>/<exercicio_slug>/`. Os serializers
  declaram uma allowlist explícita de campos, e nenhuma das rotas expõe
  `solucao_autor`.
- **Comando `seed_trilhas`**: cria as cinco trilhas previstas e publica
  "Lógica de Programação", com 6 módulos e 26 fases que vão de variáveis a
  depuração. É idempotente. Nos dois níveis o `update_or_create` usa
  `(trilha, slug)` como chave, por isso uma segunda execução reaproveita as
  linhas em vez de duplicá-las.
- **Telas de trilhas** (Next.js): listagem, detalhe da trilha com o mapa de
  fases e detalhe do exercício. Todas tratam carregamento, erro e 404.
- **Progresso do aluno, local e anônimo** (`frontend/src/lib/progresso.ts`):
  na fase, o botão "Marcar como concluído" grava em `localStorage`. Dali a
  listagem tira o percentual de cada trilha, a situação do card e o
  "Continuar de onde parou" do destaque, que leva à primeira fase ainda não
  concluída. O servidor não recebe nada disso, e a API continua
  somente-leitura.
- **Testes**: 84 no backend, em `apps/trilhas/tests/` e separados por camada,
  e 98 no frontend, com Jest + React Testing Library.
- **Documentação para a orientação** (`Docs/Termos_de_Aceite/` e
  `Docs/Integracao_API/`). De um lado, os Termos de Uso e a Política de
  Privacidade v1.1, extraídos das páginas `/termos` e `/privacidade` sem
  nenhuma alteração no texto. Do outro, o guia de integração com a API:
  cookies, CSRF, fluxos de conta, envelope de erro, limites e as 55 operações
  de `/api/v1/`, todas conferidas contra o schema do drf-spectacular.

### Alterado

- `config/settings.py` passa a registrar `apps.trilhas` e soma o
  `ScopedRateThrottle`, com a taxa `catalogo`, às classes que a base já usava.
  As rotas entram em `config/urls.py`, dentro do prefixo `/api/v1/` da base.
- `pyproject.toml`: `apps/` entra em `testpaths`, para que os testes de cada
  app morem dentro dele. O arquivo também ganhou configurações de cobertura e
  de mypy.
- `tests/test_admin_disabled.py` agora cobre também o app `trilhas`. Nenhum
  model do projeto fica registrado no admin do Django; assim, toda ação
  administrativa continua passando pelas regras de negócio e pela trilha de
  auditoria.
- `frontend/src/app/globals.css`: vale a paleta da base. Os tokens das telas
  de trilhas foram remapeados para ela (`acento` → `brand`, `painel` →
  `panel`, `borda` → `edge`, `texto` → `ink-soft` e assim por diante). O
  arquivo só recebeu `--color-success`, as utilidades `rotulo`, `titulo`,
  `marca` e `halo-brand` e as regras de exibição da sidebar.
- `frontend/src/lib/api.ts` e `types.ts`: os tipos e as três funções do
  catálogo ficam ao lado do que a base já tinha para auth e criaturas.
  Continua havendo um cliente só. `ErroApi` ganhou `naoEncontrado`, e
  `requisicao` ganhou `revalidacao`/`etiquetas`, usados pelo cache do Next nas
  rotas estáticas.
- `frontend/package.json`: chegam Jest, Testing Library e os scripts `test` e
  `test:cov`. O script `dev` da base não mudou. `scripts/dev.mjs` é um wrapper
  fino, que limpa variáveis de ambiente e só então chama o `next dev`. Sem
  ele, o Next escreve arquivos de instrução na raiz do frontend toda vez que
  inicia, e esses arquivos reaparecem mesmo depois de apagados.
- `frontend/scripts/dev.mjs` recebeu um comentário de cabeçalho com o motivo
  do wrapper, e `Docs/Arthur/Modulo_Trilhas.md` ganhou a seção "Ambiente de
  desenvolvimento". Os dois deixam explícito que a limpeza é higiene do
  ambiente, não ocultação de uso de IA no projeto.
- **Lint e tipos zerados**: o ruff foi de 12 para 0 (as constantes `PODE_*`
  saíram do meio dos imports em `gamificacao/views.py` e
  `progressao/views.py`, e os imports foram reordenados). O mypy foi de 10
  para 0 com anotações em `correcao/analise_ast.py`, sem nenhum
  `ignore_errors` novo. No ESLint, 1 erro e 3 avisos viraram 0, sem
  `eslint-disable`. Em `SecaoAtividade.tsx`, `carregando` agora é derivado da
  página que já respondeu, em vez de sair de um `setState` dentro do efeito.
- **Docstrings do nível de acesso**: quatro textos afirmavam que o admin é o
  `role` e pode tudo. Eram `NivelDeAcesso`, o `help_text` de
  `User.nivel_de_acesso` (migration `contas/0014`, só texto), o docstring de
  `AcaoAuditoria` e o comentário de `PainelAdmin.tsx`. Hoje quem decide é o
  nível, inclusive para o admin.

### Segurança

- **Painel de RBAC auditado** (`backend/apps/contas/views_rbac.py`): quatro
  ações passam a deixar registro. Criar, editar e remover nível de acesso,
  além de atribuir nível a um usuário, gravam `NIVEL_CRIADO`,
  `NIVEL_EDITADO`, `NIVEL_REMOVIDO` e `NIVEL_ATRIBUIDO` (migration
  `auditoria/0005`) com ator, alvo e os valores antigo e novo. Cada ação roda
  junto com o seu registro em `transaction.atomic()`. PATCH que não altera
  nada não grava `NIVEL_EDITADO`.
- **`registrar()` isolado num savepoint**
  (`backend/apps/auditoria/services.py`): diante de qualquer exceção, o
  `save()` do Django marca para rollback o `atomic()` de quem chamou. Sem o
  savepoint, bastava uma falha ao gravar a auditoria para a ação ser desfeita
  em silêncio, com resposta 200. A correção vale para todos os chamadores.
- **Anonimização LGPD exige o registro** (`backend/apps/contas/lgpd.py`):
  como o `CONTA_ANONIMIZADA` é prova obrigatória, ele agora é gravado direto,
  sem passar pelo `registrar()`. Se o registro falhar, a anonimização inteira
  é revertida.
- **Troca de e-mail com senha atual** (vetor A1 do handoff). Antes, com uma
  sessão roubada dava para trocar o e-mail sem senha e, com o 2FA por e-mail,
  tomar a conta. Agora `POST /auth/eu/email/` exige `senha_atual`, e as
  tentativas erradas contam para o bloqueio do login. O pedido fica guardado
  em `User.email_pendente` (migration `contas/0013`). São duas etapas, ambas
  no mesmo `/auth/eu/email/confirmar/`: o 1º link vai para o endereço ATUAL e
  autoriza; o 2º vai para o NOVO, prova a posse e é o único que efetiva a
  troca. Cada link dura 30 minutos (`TROCA_EMAIL_MAX_AGE`, que antes era de 24
  horas) e só funciona uma vez. Um pedido novo, ou uma redefinição de senha,
  invalida o que estava pendente. Até a efetivação, login, 2FA e redefinição
  de senha continuam no endereço atual. A tela de Configurações pede a senha
  atual, e a página do link só confirma quando a pessoa clica. Quando o
  endereço atual autoriza, fica gravado `TROCA_EMAIL_AUTORIZADA`, com o IP de
  quem aprovou (migration `auditoria/0006`).
- **Cota do Judge0 em três camadas** (A2 e A3 do handoff). Antes, um único
  usuário conseguia esgotar a cota diária do RapidAPI em pouco mais de um
  minuto, e a correção ficava parada para todo mundo até a meia-noite.
  - Por usuário, há dois limites: uma rajada de 5 por minuto (escopo
    `judge0`) e um teto diário de chamadas pagas
    (`JUDGE0_LIMITE_POR_USUARIO`, padrão 10, que responde 429 com
    `limite_do_usuario`). Ambos são divididos entre o `executar/` e o envio de
    código do `concluir/`. **Isso muda o comportamento visível:** o botão
    Enviar também passa a obedecer ao limite do Executar, e quem de fato
    segura é o de 5 por minuto (o `conclusao`, de 30, segue valendo para
    qualquer `concluir/`). Concluir exercício sem correção automática fica só
    no escopo `conclusao`, e o `codigo/`, que apenas lê a especificação, não
    entra no balde. O teto do dia é contado no banco e considera somente
    chamadas pagas: acerto de cache e código barrado antes do Judge0 não
    gastam nada. Saíram o escopo `execucao` e a variável `THROTTLE_EXECUCAO`.
  - O cache de submissão idêntica já existia em `Submissao`. Agora ele vale
    por 10 minutos a partir da chamada paga, ignora espaço no fim de linha e
    linhas em branco nas bordas, e leva a visibilidade dos casos na chave.
  - O limite diário virou disjuntor. Ele abre em 90% de
    `JUDGE0_LIMITE_DIARIO` e responde **503** com `limite_diario` no envelope
    de erro; antes, a resposta era 400 ao chegar a 100%. A contagem segue no
    banco, zerando à meia-noite. O padrão de `JUDGE0_LIMITE_DIARIO` caiu de
    300 para 50, que é a cota do plano. Com 300, onde a variável faltasse, o
    disjuntor nunca abriria antes do próprio RapidAPI.
  - A tentativa passa a ser gravada antes da chamada paga. Assim, chamada que
    falha (timeout, 5xx) também consome cota, e chamadas simultâneas enxergam
    umas às outras.
- **2FA não troca de método só com a sessão**
  (`backend/apps/contas/views.py`, `MfaIniciarView`). Com o 2FA ativo,
  iniciar outro método desligava o atual sem pedir código. Agora a operação é
  recusada (`mfa_ja_ativo`): para trocar de método é preciso desativar antes,
  e desativar exige código.
- **Submeter código exige `submissoes.create`**
  (`backend/apps/correcao/views.py` e `backend/apps/progressao/views.py`).
  Até então, `codigo/` e `executar/` pediam só login. Agora os dois exigem a
  permissão, assim como o envio de código do `concluir/`, e a checagem vem
  antes da rajada do Judge0, de modo que o 403 não gasta o balde de ninguém.
  Quem tem `exercicios.complete` mas não `submissoes.create` conclui
  exercício teórico, só que não chega ao Judge0. Os níveis de sistema (Aluno,
  Autor, Admin) já concedem a permissão; na prática, a mudança só aparece em
  nível personalizado. Na tela do exercício, o 403 ("seu nível de acesso não
  inclui resolver exercícios com código") agora aparece separado do 404 e da
  falha de rede, que antes caíam todos na mesma nota de "próxima entrega".
- **CSP no frontend** (`frontend/next.config.ts`, via `headers()`, sem
  dependência nova). A política parte de `default-src 'self'` e libera
  `cdn.jsdelivr.net` apenas em `script-src` e `style-src`, porque o Monaco é
  carregado de lá em runtime. Completam o conjunto `worker-src 'self' blob:`
  (o worker do editor nasce de um blob), `font-src 'self' data:` (a fonte dos
  ícones vem embutida no CSS), `object-src 'none'`, `base-uri`,
  `form-action` e `frame-ancestors 'none'`. Verificado com `next build` +
  `next start`: o editor carrega sem nenhuma violação, e script, `fetch` e
  imagem de outro domínio são barrados. `'unsafe-eval'` só entra no
  `next dev`. **Limite conhecido:** `script-src` leva `'unsafe-inline'`,
  já que o Next injeta script inline e as páginas estáticas não têm nonce.
  Ou seja, a CSP barra script de outra origem, mas não script inline
  injetado. Tirar isso exige nonce no `proxy.ts` e render dinâmico.

### Notas

- As rotas de detalhe usam `generateStaticParams` com
  `dynamicParams = false`, e é isso que faz um slug inválido devolver **404
  de verdade**. Um `notFound()` disparado no render de rota dinâmica chega
  tarde, quando a resposta já saiu com 200. Em troca, uma trilha publicada
  depois do build só aparece no build seguinte ou após uma revalidação sob
  demanda.
- O progresso pertence ao navegador, não ao aluno. Sem autenticação, não há a
  quem associá-lo no servidor. Limpar os dados do site apaga tudo, e quem
  troca de máquina não leva o progresso junto. Quando a gamificação entrar, o
  `localStorage` vira a origem da primeira sincronização.
- XP e streak ainda existem só nos modelos de tela. A sidebar mostra o perfil
  neutro de propósito, porque preenchê-la com número inventado seria pior que
  a ausência.
- **Pendente: o dia do RapidAPI não coincide com o dia do CodeQuest.** O
  disjuntor conta a partir da meia-noite de `America/Sao_Paulo`. Já pela
  documentação do RapidAPI, a cota diária recomeça no horário da assinatura,
  24 horas depois. Com as janelas desalinhadas, dois dias do CodeQuest podem,
  somados, passar da cota dentro de uma única janela do RapidAPI. O horário
  da assinatura aparece no Transaction History da conta, e sem ele nada foi
  mudado.
- `data_nascimento` continua obrigatório no cadastro, e isso é intencional: é
  o campo que sustenta a idade mínima de 16 anos. Não havia o que ajustar,
  porque o modelo já aceita nulo, o `createsuperuser` não pede o campo,
  nenhum seed cria usuário e o repositório não tem suíte E2E.
