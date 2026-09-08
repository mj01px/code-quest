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
