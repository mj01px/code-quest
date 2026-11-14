# Rastreabilidade de Requisitos do CodeQuest

Mapa de cada requisito funcional (RF) e não funcional (RNF) para o ponto do código
que o implementa, com caminho e número de linha conferidos lendo o arquivo.

- **Base da verificação:** branch `ArthurMain`, commit `23ea838` (11 de novembro de 2026), com as correções dos RNFs pendentes aplicadas por cima.
- **Caminhos:** os do backend são relativos a `backend/`; os do frontend, a `frontend/`; os de `deploy/` e `.github/`, à raiz do repositório.
- **Linha (`:Lnn`):** aponta a declaração da classe, função, componente ou configuração. Para views do DRF, é a linha do `class`; para componentes React, a do `export function`.
- **Principal e secundário:** quando o requisito tem regra de negócio no servidor, o backend é o principal e o frontend é a tela que o consome. Requisito só de servidor traz `Frontend: Não se aplica`.
- **Fontes dos enunciados:** RF01 a RF35 e RNF01 a RNF33 em `Docs/Requisitos/requisitos-funcionais.md` e `Docs/Requisitos/requisitos-nao-funcionais.md`. RF36 (Consultar ranking) e RF37 (Perfil público) estão só na monografia; os nomes usados aqui seguem a monografia e o código.
- **Atenção:** os dois documentos de requisitos foram escritos sobre o commit `1d82ca0` (25/10/2026) e ainda marcam como `Parcial`, `Planejado` ou `Em desenvolvimento` itens que hoje estão no código (RF16, RF27 com backend, RF30, RF33, RF34, RF35). Este arquivo reflete o código atual.

## Requisitos funcionais (37)

[RF01] - Cadastrar conta - Backend: `apps/contas/views.py:L72` - Frontend: `src/components/auth/FormularioCadastro.tsx:L50`
[RF02] - Verificar e-mail da conta - Backend: `apps/contas/views.py:L100` - Frontend: `src/components/auth/PainelVerificarEmail.tsx:L48`
[RF03] - Autenticar usuário - Backend: `apps/contas/views.py:L154` - Frontend: `src/components/auth/FormularioLogin.tsx:L33`
[RF04] - Autenticar com segundo fator (2FA) - Backend: `apps/contas/views.py:L452` - Frontend: `src/components/auth/FormularioLogin.tsx:L106`
[RF05] - Ativar e desativar o 2FA - Backend: `apps/contas/views.py:L489` - Frontend: `src/components/configuracoes/SecaoSeguranca.tsx:L35`
[RF06] - Renovar e encerrar sessão - Backend: `apps/contas/views.py:L186` - Frontend: `src/lib/api.ts:L248`
[RF07] - Recuperar senha - Backend: `apps/contas/views.py:L313` - Frontend: `src/components/auth/FormularioSenhaEsquecida.tsx:L17`
[RF08] - Consultar e editar perfil - Backend: `apps/contas/views.py:L232` - Frontend: `src/components/configuracoes/PainelConfiguracoes.tsx:L21`
[RF09] - Trocar e-mail da conta - Backend: `apps/contas/views.py:L250` - Frontend: `src/components/configuracoes/PainelConfiguracoes.tsx:L133`
[RF10] - Gerenciar níveis de acesso - Backend: `apps/contas/views_rbac.py:L71` - Frontend: `src/components/admin/GestaoNiveis.tsx:L25`
[RF11] - Atribuir nível de acesso a usuário - Backend: `apps/contas/views_rbac.py:L247` - Frontend: `src/components/admin/ModalAtribuirNivel.tsx:L35`
[RF12] - Consultar catálogo de trilhas - Backend: `apps/trilhas/views.py:L42` - Frontend: `src/components/trilhas/PainelDeTrilhas.tsx:L101`
[RF13] - Consultar trilha e mapa de fases - Backend: `apps/trilhas/views.py:L76` - Frontend: `src/components/trilhas/MapaDeFases.tsx:L12`
[RF14] - Consultar exercício - Backend: `apps/trilhas/views.py:L100` - Frontend: `src/app/(foco)/trilhas/[trilhaSlug]/exercicios/[exercicioSlug]/page.tsx:L78`
[RF15] - Controlar fluxo editorial do conteúdo - Backend: `apps/autoria/views.py:L133` - Frontend: `src/components/autoria/PainelAutoria.tsx:L59`
[RF16] - Consultar solução de referência - Backend: `apps/autoria/views.py:L87` - Frontend: `src/components/exercicio/PetDoExercicio.tsx:L30`
[RF17] - Iniciar trilha - Backend: `apps/progressao/views.py:L137` - Frontend: `src/components/trilhas/BotaoIniciarTrilha.tsx:L23`
[RF18] - Concluir exercício e creditar XP - Backend: `apps/progressao/services.py:L545` - Frontend: `src/components/exercicio/PainelDeCodigo.tsx:L157`
[RF19] - Consultar progresso do aluno - Backend: `apps/progressao/views.py:L70` - Frontend: `src/components/progresso/ProvedorProgresso.tsx:L82`
[RF20] - Executar código contra casos visíveis - Backend: `apps/correcao/views.py:L82` - Frontend: `src/components/exercicio/PainelDeCodigo.tsx:L133`
[RF21] - Enviar código para correção automática - Backend: `apps/correcao/services.py:L505` - Frontend: `src/components/exercicio/ResultadoDosCasos.tsx:L51`
[RF22] - Escolher criatura inicial - Backend: `apps/gamificacao/views.py:L60` - Frontend: `src/components/criaturas/SeletorCriatura.tsx:L10`
[RF23] - Adquirir nova criatura - Backend: `apps/gamificacao/views.py:L99` - Frontend: `src/components/criatura/PainelCriatura.tsx:L51`
[RF24] - Definir criatura ativa - Backend: `apps/gamificacao/views.py:L122` - Frontend: `src/components/criaturas/SeletorAtiva.tsx:L96`
[RF25] - Evoluir criatura - Backend: `apps/gamificacao/views.py:L152` - Frontend: `src/components/gamificacao/TelaDeEvolucao.tsx:L148`
[RF26] - Consultar criaturas e bônus de XP - Backend: `apps/gamificacao/views.py:L198` - Frontend: `src/components/gamificacao/SeloBonusXp.tsx:L14`
[RF27] - Apresentar desafios do dia - Backend: `apps/trilhas/views.py:L136` - Frontend: `src/components/desafios/PainelDeDesafios.tsx:L20`
[RF28] - Consultar histórico da própria atividade - Backend: `apps/auditoria/views.py:L111` - Frontend: `src/components/configuracoes/SecaoAtividade.tsx:L25`
[RF29] - Exportar dados pessoais - Backend: `apps/contas/views.py:L368` - Frontend: `src/components/configuracoes/SecaoMeusDados.tsx:L6`
[RF30] - Renovar consentimento dos documentos legais - Backend: `apps/contas/views.py:L394` - Frontend: `src/components/legal/AvisoConsentimento.tsx:L15`
[RF31] - Excluir conta por anonimização - Backend: `apps/contas/views.py:L415` - Frontend: `src/components/configuracoes/SecaoZonaRisco.tsx:L6`
[RF32] - Registrar eventos na trilha de auditoria - Backend: `apps/auditoria/services.py:L58` - Frontend: Não se aplica (registro só no servidor)
[RF33] - Consultar trilha de auditoria - Backend: `apps/auditoria/views.py:L55` - Frontend: `src/components/admin/GestaoAuditoria.tsx:L32`
[RF34] - Suspender e reativar conta - Backend: `apps/contas/views_rbac.py:L295` - Frontend: `src/components/admin/ModalAtribuirNivel.tsx:L125`
[RF35] - Gerenciar clãs - Backend: `apps/clas/views.py:L70` - Frontend: `src/components/clas/PainelDeClas.tsx:L26`
[RF36] - Consultar ranking - Backend: `apps/ranking/views.py:L16` - Frontend: `src/components/ranking/PainelDeRanking.tsx:L54`
[RF37] - Consultar perfil público - Backend: `apps/ranking/views.py:L34` - Frontend: `src/components/perfil/PainelDePerfil.tsx:L25`

### Pontos secundários dos RFs

Quando a regra mora fora da view, este é o segundo ponto a abrir.

| RF | Ponto secundário |
|---|---|
| RF01 | `apps/contas/validators.py:L104` (`PasswordComplexityValidator`) |
| RF02 | `apps/contas/views.py:L122` (`ReenviarVerificacaoView`) |
| RF03 | `apps/contas/serializers.py:L228` (`LoginSerializer`) |
| RF05 | `apps/contas/views.py:L518` (`MfaConfirmarView`), `apps/contas/views.py:L577` (`MfaDesativarView`) |
| RF06 | `apps/contas/views.py:L212` (`SairView`) |
| RF07 | `apps/contas/views.py:L333` (`RedefinirSenhaView`) |
| RF09 | `apps/contas/views.py:L274` (`ConfirmarTrocaEmailView`) |
| RF11 | `apps/contas/views_rbac.py:L159` (`UsuarioListView`) |
| RF15 | `apps/autoria/views.py:L176` (`PublicarView`), `src/components/autoria/EditorDeConteudo.tsx:L79` |
| RF17 | `apps/progressao/services.py:L258` (`iniciar_trilha`) |
| RF18 | `apps/progressao/views.py:L183` (`ConcluirExercicioView`) |
| RF21 | `apps/progressao/views.py:L250` (chamada de `corrigir_envio` dentro da conclusão) |
| RF22 | `apps/gamificacao/services.py:L39` (`select_starter_creature`) |
| RF23 | `apps/gamificacao/services.py:L77` (`adquirir_criatura`) |
| RF24 | `apps/gamificacao/services.py:L118` (`definir_criatura_ativa`) |
| RF25 | `apps/progressao/services.py:L219` (`evoluir_criatura`) |
| RF26 | `apps/gamificacao/views.py:L45` (`CatalogoCriaturasView`) |
| RF28 | `apps/auditoria/models.py:L82` (`ACOES_DO_TITULAR`) |
| RF29 | `apps/contas/lgpd.py:L12` (`exportar_dados`) |
| RF30 | `apps/contas/views.py:L382` (`ConsentimentosView`) |
| RF31 | `apps/contas/views.py:L432` (`ConfirmarExclusaoView`), `apps/contas/lgpd.py:L108` (`anonimizar_conta`) |
| RF32 | `apps/auditoria/models.py:L113` (`RegistroDeAuditoria`), `apps/auditoria/models.py:L9` (`AcaoAuditoria`) |
| RF34 | `src/components/admin/ModalAtribuirNivel.tsx:L309` (botão SUSPENDER/REATIVAR) |

## Requisitos não funcionais (33)

[RNF01] - Armazenamento e política de senha - Backend: `config/settings.py:L118` - Frontend: Não se aplica
[RNF02] - Sessão em cookies protegidos - Backend: `apps/contas/cookies.py:L18` - Frontend: `src/lib/api.ts:L169`
[RNF03] - Proteção contra CSRF e origens não autorizadas - Backend: `config/settings.py:L244` - Frontend: `src/lib/api.ts:L163`
[RNF04] - Bloqueio por tentativas de login - Backend: `apps/contas/models.py:L267` - Frontend: Não se aplica
[RNF05] - Limitação de taxa de requisições - Backend: `config/settings.py:L133` (`CACHES` com o DatabaseCache do Django: os contadores ficam no PostgreSQL e valem para todos os workers) - Frontend: Não se aplica
[RNF06] - Proteção dos segredos do segundo fator - Backend: `apps/contas/mfa.py:L45` - Frontend: Não se aplica
[RNF07] - Autorização por permissão em cada rota - Backend: `config/settings.py:L176` - Frontend: `src/components/layout/PortaDeAcesso.tsx:L7`
[RNF08] - Não exposição de gabaritos e casos ocultos - Backend: `apps/autoria/views.py:L85` - Frontend: Não se aplica
[RNF09] - Respostas que não revelam contas existentes - Backend: `apps/contas/views.py:L313` - Frontend: Não se aplica
[RNF10] - Isolamento da execução de código do aluno - Backend: `apps/correcao/judge0.py:L19` - Frontend: Não se aplica
[RNF11] - Política de segurança de conteúdo no navegador - Backend: Não se aplica - Frontend: `src/proxy.ts:L16` (`cspCom`: nonce novo por request, `script-src` sem `'unsafe-inline'`)
[RNF12] - Trilha de auditoria imutável - Backend: `apps/auditoria/models.py:L237` - Frontend: Não se aplica
[RNF13] - Retenção e descarte da auditoria - Implementado (configuração pronta): o agendamento está versionado e é instalado na VPS - Backend: `apps/auditoria/management/commands/limpar_auditoria.py:L20` - Frontend: Não se aplica
[RNF14] - Anonimização na exclusão de conta - Backend: `apps/contas/lgpd.py:L108` - Frontend: Não se aplica
[RNF15] - Consentimento versionado e idade mínima - Backend: `apps/contas/documentos.py:L23` - Frontend: `src/components/legal/AvisoConsentimento.tsx:L15`
[RNF16] - Reaproveitamento de correções idênticas - Backend: `apps/correcao/services.py:L30` - Frontend: Não se aplica
[RNF17] - Cotas e disjuntor da correção automática - Backend: `apps/correcao/services.py:L154` - Frontend: Não se aplica
[RNF18] - Consultas ao banco com número constante - Backend: `apps/trilhas/views.py:L84` - Frontend: Não se aplica
[RNF19] - Integridade da progressão e da posse de criaturas - Backend: `apps/progressao/services.py:L557` - Frontend: Não se aplica
[RNF20] - Suíte de testes automatizados - Backend: `pyproject.toml:L15` - Frontend: `jest.config.ts:L7`
[RNF21] - Evolução versionada do banco de dados - Backend: `apps/*/migrations/` (63 migrações; o requisito é atendido pelo diretório, sem uma linha única que o represente) - Frontend: Não se aplica
[RNF22] - Degradação controlada sem o Judge0 - Backend: `apps/correcao/judge0.py:L120` - Frontend: `src/components/ui/ServicoIndisponivel.tsx:L7`
[RNF23] - Configuração por variáveis de ambiente - Backend: `config/settings.py:L21` - Frontend: `next.config.ts:L3`
[RNF24] - Versões de dependências e de runtime fixadas - Backend: `requirements.txt:L1` - Frontend: `package.json:L5` (`engines.node`)
[RNF25] - Implantação em servidor próprio (VPS) - Implementado (configuração pronta): os arquivos estão versionados em `deploy/`, ainda sem execução numa VPS - Backend: `deploy/codequest-api.service:L1` - Frontend: `deploy/codequest-web.service:L1`
[RNF26] - Análise estática e tipagem - PARCIAL: o frontend roda TypeScript `strict` e ESLint, e o mypy `strict` do backend cobre 8 das 11 apps (`trilhas`, `autoria`, `correcao`, `conquistas`, `ranking`, `auditoria`, `gamificacao`, `core`); `contas`, `progressao` e `clas` seguem fora, com 574 erros que são quase todos anotação faltando (`pyproject.toml:L47`) - Backend: `pyproject.toml:L44` - Frontend: `tsconfig.json`
[RNF27] - Integração contínua - Implementado (configuração pronta): o workflow está versionado e roda no próximo push ao GitHub - Backend: `.github/workflows/ci.yml:L15` (job `backend`) - Frontend: `.github/workflows/ci.yml:L43` (job `frontend`)
[RNF28] - Documentação da API e padrão de erro - Backend: `apps/core/exceptions.py:L52` - Frontend: Não se aplica
[RNF29] - Identidade visual e tema escuro - Backend: Não se aplica - Frontend: `src/app/globals.css:L3`
[RNF30] - Acessibilidade - Implementado (verificação manual WCAG 2.1 AA na seção própria abaixo; sem teste automatizado de acessibilidade) - Backend: Não se aplica - Frontend: `src/components/ui/useModal.ts:L13`
[RNF31] - Idioma e fuso horário brasileiros - Backend: `config/settings.py:L345` - Frontend: `src/app/layout.tsx:L22`
[RNF32] - Navegadores suportados - Backend: Não se aplica - Frontend: `package.json:L8` (`browserslist`: Chrome e Edge 111, Firefox 111, Safari 16.4)
[RNF33] - Plataforma tecnológica - Backend: `requirements.txt:L1` - Frontend: `package.json:L27`

### Pontos secundários dos RNFs

| RNF | Ponto secundário |
|---|---|
| RNF01 | `config/settings.py:L322` (`AUTH_PASSWORD_VALIDATORS`), `apps/contas/validators.py:L104` (`PasswordComplexityValidator`), `apps/contas/validators.py:L28` (`SENHA_MAX_LENGTH`) |
| RNF02 | `apps/contas/autenticacao.py:L10` (`CookieJWTAuthentication`), `config/settings.py:L212` (`SIMPLE_JWT`) |
| RNF03 | `config/settings.py:L66` (`MIDDLEWARE`), `config/settings.py:L254` (`CORS_ALLOWED_ORIGINS`), `apps/contas/views.py:L144` (`CsrfView`) |
| RNF04 | `apps/contas/models.py:L264` (`esta_bloqueado`), `apps/contas/serializers.py:L228` (`LoginSerializer`) |
| RNF05 | `config/settings.py:L185` (`DEFAULT_THROTTLE_RATES`), `apps/core/migrations/0001_tabela_de_cache.py:L11` (cria a tabela do cache no `migrate`) |
| RNF06 | `apps/contas/mfa.py:L49` (`_confere`, comparação em tempo constante), `apps/contas/models.py:L538` (`CodigoRecuperacaoMFA`) |
| RNF07 | `apps/core/permissions.py:L18` (`HasPerm`), `apps/contas/models.py:L212` (`has_perm`), `apps/contas/tests/test_admin_disabled.py` |
| RNF08 | `apps/trilhas/serializers.py:L116` (`ExercicioDetalheSerializer`, sem `solucao_autor`), `apps/correcao/serializers.py:L67` (`ResultadoDoCasoSerializer`) |
| RNF09 | `apps/contas/views.py:L72` (`RegistrarView`), `apps/contas/views.py:L122` (`ReenviarVerificacaoView`) |
| RNF10 | `apps/correcao/services.py:L29` (`LIMITE_DE_CARACTERES`), `apps/correcao/analise_ast.py:L30` (`requisitos_invalidos`) |
| RNF11 | `src/proxy.ts:L37` (`proxy`, CSP na request e na resposta), `src/app/layout.tsx:L19` (`connection()`, render por request), `src/__tests__/proxy.test.ts` |
| RNF12 | `apps/auditoria/models.py:L113` (`RegistroDeAuditoria`) |
| RNF13 | `deploy/crontab:L8` (purga diária), `config/settings.py:L305` (`AUDITORIA_RETENCAO_DIAS`) |
| RNF14 | `apps/contas/models.py:L292` (`User.anonimizar`) |
| RNF15 | `apps/contas/models.py:L402` (`AceiteDeTermos`), `apps/contas/validators.py:L13` (`IDADE_MINIMA_ANOS`) |
| RNF16 | `apps/correcao/services.py:L203` (`_hash`) |
| RNF17 | `apps/correcao/services.py:L31` (`DISJUNTOR`), `apps/correcao/views.py:L35` (`Judge0PorMinuto`), `config/settings.py:L163` (`JUDGE0_LIMITE_DIARIO`) |
| RNF18 | `apps/trilhas/views.py:L53` (`annotate`) |
| RNF19 | `apps/progressao/services.py:L545` (`creditar_exercicio`), `apps/gamificacao/models/ownership.py:L58` (`UniqueConstraint`) |
| RNF22 | `apps/correcao/excecoes.py:L7` (`CorretorIndisponivel`) |
| RNF24 | `.nvmrc` (Node 24), `package.json:L27` (dependências com versão exata), `package-lock.json` |
| RNF25 | `deploy/nginx.conf`, `deploy/gunicorn.conf.py:L6` (`bind` no loopback), `deploy/crontab`, `requirements.txt` (`gunicorn`), `README.md` (seção `~/deploy`) |
| RNF27 | `.github/workflows/ci.yml:L28` (Postgres como serviço), passos de ruff, mypy, pytest, lint, tsc, jest e build |
| RNF28 | `config/urls.py:L22` (rota do schema OpenAPI), `config/urls.py:L24` (Swagger em `api/docs/`) |
| RNF29 | `src/app/globals.css:L13` (`--color-brand`), `src/app/layout.tsx:L23` (fontes próprias) |
| RNF30 | `src/app/(app)/error.tsx:L7` (erro dentro do layout, com a navegação), `src/app/globals.css:L194` (`:focus-visible`), `src/app/globals.css:L200` (`prefers-reduced-motion`) |
| RNF31 | `config/settings.py:L347` (`TIME_ZONE`) |
| RNF33 | `package.json:L28` (`react`) |

## Resumo

| Tipo | Implementado | Parcial | Não implementado | Total |
|---|---|---|---|---|
| RF | 37 | 0 | 0 | 37 |
| RNF | 32 | 1 | 0 | 33 |

- RNF parcial: RNF26 (mypy `strict` fora de `contas`, `progressao` e `clas`).
- RNF13, RNF25 e RNF27 contam como implementados com a configuração pronta: os arquivos estão no repositório e passam a valer quando instalados na VPS e enviados ao GitHub.
- RNF08 conta como implementado, com a ressalva 1 abaixo.

## Ressalvas encontradas na conferência

Registradas para decisão da equipe.

1. **RNF08 (gabarito do quiz no payload).** `apps/trilhas/serializers.py:L19` (`QuestaoSerializer`) devolve `resposta_correta` ao navegador. O comentário `ponytail` acima dele justifica isso porque "o quiz corrige no navegador e não dá XP", mas hoje o quiz é corrigido no servidor (`apps/progressao/views.py:L347`, `ConcluirQuizView`, e `apps/progressao/services.py:L363`, `concluir_quiz`) e grava `acertos`. Com o gabarito no payload, o aluno pode tirar nota máxima lendo a resposta da rede. Não dá XP, mas a nota gravada perde valor.
2. **RF15 RN02 (divergência ainda presente).** `apps/autoria/views.py:L176` (`PublicarView`) aceita `trilhas.submit_review` como alternativa a `trilhas.publish`, então o autor publica o próprio conteúdo aprovado sem a permissão de publicar. É escolha documentada no comentário da linha 174, mas contradiz a regra de negócio escrita.
3. **Componentes órfãos no frontend (resolvido em 2026-11-14).** `BotaoSolucao`, `BotaoConclusao`, `BotaoProximoExercicio`, `GraficoAtividade` e `ADefinir` não eram importados por nenhuma tela e foram removidos. A solução de referência (RF16) é exibida por `PetDoExercicio.tsx` e a conclusão (RF18) por `PainelDeCodigo.tsx` e `useRespostaEscrita.ts`.
4. **Segredo TOTP em texto puro.** `apps/contas/models.py` (`ConfiguracaoMFA.totp_secret`, logo abaixo da `L490`) guarda o segredo base32 sem cifra. O RNF06 promete hash só para os códigos por e-mail e de recuperação, o que é cumprido; o segredo TOTP precisa ser legível para validar o código, mas um vazamento do banco o revela.
5. **Documentos de requisitos desatualizados.** `Docs/Requisitos/requisitos-funcionais.md` não traz RF36 e RF37 e ainda marca RF16, RF30 e RF33 como parciais, RF34 como planejado e RF35 como em desenvolvimento. O `README.md` cita 1140 testes no backend e 435 no frontend, números anteriores aos atuais.
6. **Perfil "público" exige sessão.** `apps/ranking/views.py:L37` usa `IsAuthenticated`: o perfil só é visível a quem está logado. Coerente com a tela (aberta a partir do ranking e dos clãs), mas o nome "público" pode confundir a banca.
7. **Acoplamento entre apps do backend.** Há importações nos dois sentidos entre apps (por exemplo, `progressao` importa de `conquistas` e `conquistas` importa de `progressao`; `contas` e `progressao` também se importam). Funciona, porque várias importações ficam dentro de funções, mas enfraquece a fronteira dos módulos descrita na monografia.

8. **Custo do nonce da CSP (RNF11).** O Next só aplica o nonce em HTML gerado na hora, então o layout raiz força render por request (`src/app/layout.tsx:L19`) e nenhuma página é mais pré-gerada no build. Duas consequências: o catálogo é buscado na API a cada visita (o `revalidate` das páginas continua cacheando os `fetch`), e um slug de trilha inexistente (`/trilhas/nao-existe`) mostra a tela de 404 com status HTTP 200, porque o `loading.tsx` de `(app)/trilhas` já iniciou o streaming. O `style-src` mantém `'unsafe-inline'`, pois o Monaco e o Next injetam estilos sem nonce; o RNF11 trata de script.

## Verificação de acessibilidade (RNF30)

Conferência manual contra os critérios WCAG 2.1 nível AA que o código permite verificar.

| Critério | Como é atendido | Onde |
|---|---|---|
| 1.1.1 Conteúdo não textual | As 32 imagens (`<img>` e `<Image>`) têm `alt` | `src/components/` |
| 1.3.1 Informações e relações | Marcos `header`, `aside`, `nav` e `main`; rótulos com `htmlFor` e `aria-describedby` | `src/components/layout/LayoutDoApp.tsx:L18`, `src/components/layout/BarraLateral.tsx:L238` |
| 2.1.1 Teclado e 2.1.2 Sem bloqueio do teclado | Modais prendem o Tab dentro do painel e fecham com Esc | `src/components/ui/useModal.ts:L13` |
| 2.2.2 e 2.3.3 Movimento | Animações e transições zeradas com `prefers-reduced-motion` | `src/app/globals.css:L200` |
| 2.4.1 Ignorar blocos | Marcos de página (`main`, `nav` rotulado); não há link "pular para o conteúdo" | `src/components/layout/LayoutDoApp.tsx:L18` |
| 2.4.3 Ordem do foco | O modal recebe o foco ao abrir e o devolve a quem o abriu ao fechar | `src/components/ui/useModal.ts:L13` |
| 2.4.7 Foco visível | Contorno de 2px em todo `:focus-visible` | `src/app/globals.css:L194` |
| 3.1.1 Idioma da página | `lang="pt-BR"` no `<html>` | `src/app/layout.tsx:L22` |
| 3.3.1 Identificação do erro | O campo padrão dos formulários marca `aria-invalid` e liga a mensagem por `aria-describedby`; erros de envio usam `role="alert"` | `src/components/ui/PixelField.tsx:L82` |
| 4.1.3 Mensagens de status | Regiões `aria-live` em carregamentos e avisos | `src/app/(app)/trilhas/loading.tsx:L4` |

Não verificado nesta conferência: contraste de cor (1.4.3) medido com ferramenta, uso real com leitor de tela e ampliação a 200% (1.4.4).

## Classificação arquitetural (texto para a monografia)

O CodeQuest adota uma arquitetura cliente-servidor em duas aplicações: uma API REST em Django 6 com Django REST Framework e uma interface web em Next.js 16 (App Router) com React 19, que se comunicam por HTTP e JSON (o Next encaminha `/api/*` ao Django, `frontend/next.config.ts:L17`).

O backend é um monólito modular. Há um único projeto Django, executado num único processo WSGI (`backend/config/wsgi.py`) e ligado a um único banco PostgreSQL (`backend/config/settings.py:L103`), mas o código é dividido em onze apps de domínio (`contas`, `trilhas`, `autoria`, `progressao`, `gamificacao`, `conquistas`, `ranking`, `clas`, `correcao`, `auditoria` e o núcleo `core`), cada uma com seus próprios modelos, migrações, serializers, serviços, rotas e testes. As rotas de todas as apps são agregadas sob o prefixo `/api/v1/` (`backend/config/urls.py:L6`). Os módulos colaboram por chamadas diretas às camadas de serviço uns dos outros, e não por mensagens, o que caracteriza modularidade de código dentro de uma implantação única, e não microsserviços.

O padrão MVT (Model-View-Template) do Django foi adaptado ao papel de API. A camada Model permanece igual: classes do ORM em `models.py`, com as regras de integridade no banco. A camada View é formada por views baseadas em classe do DRF (`APIView` e views genéricas), que validam permissão, delegam a regra de negócio a funções de serviço e devolvem uma resposta HTTP. A camada Template, que no Django tradicional gera HTML, foi substituída pelos serializers do DRF, que convertem os objetos em JSON com lista explícita de campos. A renderização da interface saiu do Django e passou ao Next.js. O motor de templates do Django continua em uso apenas para o corpo HTML dos e-mails transacionais (`backend/apps/contas/templates/contas/` e `backend/apps/contas/email_utils.py:L44`). O admin do Django está montado (`backend/config/urls.py:L20`), mas nenhum modelo é registrado nele, para que toda ação administrativa passe pelas regras de negócio da API.

O frontend também se organiza como um monólito modular: uma única aplicação Next.js, com um único build, cujos componentes são agrupados por domínio em `frontend/src/components/` (autenticação, trilhas, exercício, autoria, criaturas, clãs, ranking, perfil, administração, entre outros) e cujo acesso à API é centralizado em um único cliente (`frontend/src/lib/api.ts`). O App Router separa as responsabilidades entre Server Components e Client Components: as páginas em `frontend/src/app/` são componentes de servidor, responsáveis por rota, metadados e busca inicial de dados, enquanto a interatividade (formulários, editor de código, animações) fica em componentes de cliente marcados com `"use client"`.
