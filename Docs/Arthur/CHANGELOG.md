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
- **2FA não troca de método só com a sessão**
  (`backend/apps/contas/views.py`, `MfaIniciarView`): com 2FA ativo, iniciar
  outro método desligava o atual sem código. Agora é recusado
  (`mfa_ja_ativo`); trocar de método passa por desativar, que exige código.

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
