# Cheat Sheet da Banca (CodeQuest)

Consulta rápida para a apresentação: a banca pergunta, você abre o arquivo na linha indicada.

- **Base:** branch `ArthurMain`, commit `0d0207b` (14 de novembro de 2026). Toda linha abaixo foi conferida abrindo o arquivo nesse commit. Se o código mudar, as linhas deslocam: reconfira antes de apresentar.
- **Caminhos:** do backend, relativos a `backend/`; do frontend, relativos a `frontend/`; `deploy/`, `.github/` e `docker-compose.yml`, à raiz.
- **Mapas completos:** `Docs/Rastreabilidade_Requisitos.md` (RFs e RNFs) e `Docs/Rastreabilidade_Regras_Negocio.md` (93 regras de negócio).
- **Código ao vivo na tela:** abra o arquivo e use "ir para linha" (Ctrl+G no VS Code).

## 1. Perguntas prováveis e onde achar

### Segurança

| Pergunta provável | Onde achar | Resposta em uma frase |
|---|---|---|
| Onde garantem que o aluno não ganha XP duas vezes? | `apps/progressao/models.py:L124` (restrição única no banco) e `apps/progressao/services.py:L577` (trata o conflito) | O banco recusa o segundo evento de XP do mesmo exercício; o serviço responde `ja_concluido` com XP zero. É a RF18-RN02. |
| E se o aluno clicar duas vezes ao mesmo tempo? | `apps/progressao/services.py:L557` (`select_for_update`) e `apps/progressao/services.py:L600` (soma com `F()`) | A linha do progresso é travada e a soma é feita no banco, então nenhum incremento se perde (RNF19). |
| Onde está a regra de CSP? | `src/proxy.ts:L16` (`cspCom`) e `src/proxy.ts:L37` (`proxy`) | Nonce novo por requisição, `script-src` sem `unsafe-inline`, `object-src 'none'` e `frame-ancestors 'none'` (RNF11). |
| Por que o site não é pré-gerado? | `src/app/layout.tsx:L19` (`await connection()`) | O nonce só vale em HTML gerado na hora; é o custo conhecido da CSP (ressalva 8 da rastreabilidade). |
| Onde ficam os tokens de login? | `apps/contas/cookies.py:L18` (grava), `apps/contas/cookies.py:L23` (acesso HttpOnly), `apps/contas/cookies.py:L44` (renovação HttpOnly, só na rota `/api/v1/auth/`) | O JavaScript nunca vê o token. O cookie `cq_sessao` (L33) é só um sinalizador sem credencial (RNF02). |
| Como se protegem de CSRF? | `apps/contas/autenticacao.py:L25` (`_exigir_csrf`), `apps/contas/views.py:L144` (`CsrfView`), `config/settings.py:L252` (origens confiáveis), `src/lib/api.ts:L163` (cliente busca o token) | Toda requisição autenticada por cookie passa pela checagem de CSRF do Django (RNF03). |
| Como evitam força bruta no login? | `apps/contas/models.py:L267` (`registrar_falha_de_login`), `config/settings.py:L294` (5 tentativas) e `config/settings.py:L295` (15 minutos) | Cinco falhas bloqueiam a conta por 15 minutos e a mensagem é igual para conta inexistente, bloqueada ou senha errada (RNF04, RNF09). |
| Como funciona o limite de requisições? | `config/settings.py:L133` (`CACHES`) e `config/settings.py:L189` (taxas) | Os contadores ficam no PostgreSQL (`DatabaseCache`), então valem para todos os workers e sobrevivem a reinício (RNF05). |
| Como as senhas são guardadas? | `config/settings.py:L118` (Argon2 primeiro), `apps/contas/validators.py:L105` (política) e `config/settings.py:L330` | Hash Argon2 e política própria de complexidade; a senha tem teto de 128 caracteres (`apps/contas/validators.py:L28`) (RNF01). |
| O 2FA pode ser reaproveitado (replay)? | `apps/contas/mfa.py:L74` (`_consumir_totp`) e `apps/contas/mfa.py:L176` (código de recuperação) | O passo do TOTP só avança com `UPDATE` condicional e o código de recuperação só vale uma vez (RF04-RN03). |
| Como funciona a autorização por permissão? | `apps/contas/rbac.py:L13` (catálogo), `apps/core/permissions.py:L18` (`HasPerm`), `apps/contas/models.py:L212` (`has_perm`), `config/settings.py:L180` (padrão `IsAuthenticated`) | Toda rota exige login por padrão e as permissões vêm do nível de acesso, sem atalho por papel (RNF07). |
| O que a interface faz sobre permissão? | `src/components/layout/PortaDeAcesso.tsx:L7` | Esconde a tela; quem decide de verdade é o servidor (a interface não é a trava). |
| O aluno consegue ver a resposta do exercício? | `apps/trilhas/serializers.py:L143` (lista fechada, sem `solucao_autor`), `apps/correcao/services.py:L333` (caso oculto) e `apps/autoria/views.py:L85` (rota de autoria, `no-store`) | A solução de referência só sai pela rota de autoria, com permissão, limite de 30 por minuto e sem cache (RNF08). Exceção conhecida: o quiz devolve `resposta_correta` (`apps/trilhas/serializers.py:L19`, ressalva 1). |
| Como o código do aluno é executado com segurança? | `apps/correcao/judge0.py:L19` (limites), `apps/correcao/analise_ast.py:L134` (análise antes de executar), `apps/correcao/services.py:L31` (10.000 caracteres) | Roda num Judge0 externo, sem rede, 2 s de CPU, 5 s de relógio e 128.000 KB de memória; código proibido nem chega a ele (RNF10). |
| Como controlam o custo do Judge0? | `apps/correcao/services.py:L154` (cota), `apps/correcao/services.py:L164` (por usuário), `apps/correcao/services.py:L169` (disjuntor), `config/settings.py:L167` e `config/settings.py:L169` (valores), `config/settings.py:L201` (5 por minuto) | 10 chamadas pagas por usuário por dia, 50 por dia no total com disjuntor em 90%, e resultado idêntico em 10 minutos vem do cache (RNF16, RNF17). |
| E se o Judge0 cair? | `apps/correcao/excecoes.py:L7` (`CorretorIndisponivel`), `apps/correcao/views.py:L103` e `src/components/ui/ServicoIndisponivel.tsx:L7` | A API responde 503 padronizado e a tela mostra aviso; o resto da plataforma segue (RNF22). |
| Onde está a regra dos quatro olhos? | `apps/autoria/services.py:L464` e `apps/autoria/services.py:L465` | Quem criou o conteúdo não o aprova, nem o administrador. É a transição `aprovar` em `transicionar` (`apps/autoria/services.py:L434`). |
| Como o fluxo editorial é controlado? | `apps/autoria/services.py:L31` (`TRANSICOES`), `apps/autoria/services.py:L434` (`transicionar`) e `apps/autoria/views.py:L133` | Rascunho, revisão, aprovado, publicado; cada passo exige permissão, trava a linha e vai para a auditoria (RF15). |
| O autor pode publicar o que escreveu? | `apps/autoria/views.py:L176` e `apps/autoria/views.py:L180` | Só depois de aprovado por outra pessoa. A permissão aceita `trilhas.submit_review` além de `trilhas.publish`; é escolha documentada (ressalva 2). |

### LGPD, auditoria e dados

| Pergunta provável | Onde achar | Resposta em uma frase |
|---|---|---|
| Como a exclusão de conta respeita a LGPD? | `apps/contas/lgpd.py:L108` (`anonimizar_conta`) e `apps/contas/models.py:L292` (`anonimizar`) | Embaralha e-mail e nickname, inutiliza a senha, apaga IP e e-mail da auditoria e mantém só agregados e a prova de aceite (RF31, RNF14). |
| E se a gravação da prova falhar? | `apps/contas/lgpd.py:L129` (transação) e `apps/contas/lgpd.py:L143` (gravação direta) | Nada é anonimizado: a transação desfaz tudo (RF31-RN05). |
| Onde o titular exporta os dados? | `apps/contas/lgpd.py:L12` (`exportar_dados`) e `apps/contas/views.py:L368` | JSON só com os dados do próprio titular, sem senha, tokens ou segredos do 2FA (RF29). |
| Como o consentimento é versionado? | `apps/contas/documentos.py:L23` (versões vigentes) e `apps/contas/models.py:L402` (`AceiteDeTermos`) | Cada aceite guarda documento e versão; versão antiga é recusada no cadastro (RNF15). |
| A auditoria é imutável? | `apps/auditoria/models.py:L237` (`save` recusa alteração) e `apps/auditoria/services.py:L58` (`registrar`) | Append-only no modelo. Ressalva honesta: `update` e `delete` em lote existem e são usados na anonimização e na retenção. |
| Por quanto tempo a auditoria é mantida? | `config/settings.py:L313` (180 dias), `apps/auditoria/management/commands/limpar_auditoria.py:L20` e `deploy/crontab:L9` | Um cron diário às 3h30 apaga o que passou de 180 dias (RNF13). |
| Quem pode ver a auditoria? | `apps/auditoria/views.py:L55` e `apps/auditoria/views.py:L62` (`auditoria.view`) | Só quem tem a permissão, e a própria consulta é auditada (RF33-RN01, `apps/auditoria/views.py:L92`). |

### Regras do jogo

| Pergunta provável | Onde achar | Resposta em uma frase |
|---|---|---|
| Quanto XP vale um exercício? | `apps/progressao/services.py:L37` (tabela por dificuldade), `apps/progressao/services.py:L102` e `apps/progressao/services.py:L563` | O servidor calcula pela dificuldade e aplica o bônus da criatura; nenhuma rota aceita XP do cliente. |
| A criatura evolui sozinha? | `apps/progressao/services.py:L633` e `apps/gamificacao/views.py:L152` | Não: a conclusão só avisa que pode evoluir; o aluno escolhe, um estágio por vez (`apps/progressao/services.py:L174`). |
| Como se garante uma criatura inicial e uma ativa? | `apps/gamificacao/models/ownership.py:L63` (inicial), `apps/gamificacao/models/ownership.py:L71` (ativa) e `apps/gamificacao/models/ownership.py:L58` (sem repetir) | Restrições únicas parciais no banco; o serviço só converte o conflito em mensagem. |
| Como o desafio do dia é escolhido? | `apps/trilhas/desafios.py:L22` e `apps/trilhas/desafios.py:L35` | Pela data: o mesmo dia devolve sempre o mesmo desafio. |
| O catálogo faz consulta demais ao banco? | `apps/trilhas/views.py:L54` (`annotate`) e `apps/trilhas/views.py:L84` (`prefetch`) | Contagens e relações vêm em número constante de consultas (RNF18). |
| Como o catálogo evita limitar o próprio Next? | `apps/trilhas/throttling.py:L20` e `config/settings.py:L150` (redes isentas) | A rede interna do Docker não conta no limite; pedido da internet chega com o IP real do aluno. |

### Infraestrutura e qualidade

| Pergunta provável | Onde achar | Resposta em uma frase |
|---|---|---|
| Como é a implantação? | `docker-compose.yml:L26` (backend), `docker-compose.yml:L41` (frontend), `docker-compose.yml:L51` (Nginx) e `deploy/nginx.conf:L92` | Nginx com TLS na frente do Next, que repassa `/api` ao Django com gunicorn e PostgreSQL 18 (RNF25). |
| Onde o HTTPS é forçado? | `deploy/nginx.conf:L73` (redireciona), `deploy/nginx.conf:L98` (TLS 1.2 e 1.3) e `deploy/nginx.conf:L104` (HSTS) | HTTP redireciona para HTTPS e o navegador memoriza por um ano. |
| Como o Django sobe em produção? | `entrypoint.sh:L5` (migrate) e `entrypoint.sh:L33` (gunicorn), ambos relativos a `backend/` | Aplica migrações, roda seeds só se pedido e inicia o gunicorn. |
| Como é o CI? | `.github/workflows/ci.yml:L22`, `.github/workflows/ci.yml:L53`, `.github/workflows/ci.yml:L85` e `.github/workflows/ci.yml:L124` | Três jobs em paralelo (unitários, integração, linter); o build do frontend só roda se os três passarem (RNF27). |
| Onde está a documentação da API? | `config/urls.py:L26` (condição), `config/urls.py:L28` (schema) e `config/urls.py:L30` (Swagger) | Em `/api/docs/`, mas só quando `API_DOCS=True` (em produção fica desligado). |
| Qual é o padrão de erro da API? | `apps/core/exceptions.py:L52` e `config/settings.py:L184` (`EXCEPTION_HANDLER`) | Toda exceção sai no mesmo formato, com código e mensagem (RNF28). |
| Como o banco evolui? | `apps/*/migrations/` (64 arquivos) e `entrypoint.sh:L5` | Migração versionada rodada a cada subida do contêiner (RNF21). |
| Qual é o tipo de teste e a cobertura de tipos? | `pyproject.toml:L15` (pytest), `pyproject.toml:L43` (mypy strict, cobre 8 de 11 apps), `jest.config.ts:L7` e `tsconfig.json:L7` (strict) | Pytest e Jest; o mypy estrito ainda não cobre `contas`, `progressao` e `clas` (RNF26 parcial). Os caminhos de `pyproject.toml` são do backend; `jest.config.ts` e `tsconfig.json`, do frontend. |
| Como o frontend fala com a API? | `next.config.ts:L19` (rewrite) e `src/lib/api.ts:L253` (renovação do token) | Mesma origem: o Next encaminha `/api/*` ao Django; a renovação do token é automática e só uma por vez. |

## 2. Números para decorar

| Item | Valor | Onde |
|---|---|---|
| Token de acesso / renovação | 15 minutos / 7 dias, com rotação e lista de bloqueio | `config/settings.py:L217` a `config/settings.py:L220` |
| Bloqueio de login | 5 falhas, 15 minutos | `config/settings.py:L294`, `config/settings.py:L295` |
| Link de e-mail / senha / troca / exclusão | 24 horas / 30 / 30 / 30 minutos | `config/settings.py:L289`, `config/settings.py:L290`, `config/settings.py:L292`, `config/settings.py:L303` |
| 2FA: token de login / código por e-mail | 5 / 10 minutos | `config/settings.py:L308`, `config/settings.py:L307` |
| Idade mínima | 16 anos | `apps/contas/validators.py:L13` |
| Retenção da auditoria | 180 dias | `config/settings.py:L313` |
| Judge0: por usuário / total diário / disjuntor | 10 / 50 por dia / 90% | `config/settings.py:L169`, `config/settings.py:L167`, `apps/correcao/services.py:L33` |
| Judge0: rajada | 5 por minuto por usuário | `config/settings.py:L201` |
| Cache de correção | 10 minutos | `apps/correcao/services.py:L32` |
| Tamanho máximo do código | 10.000 caracteres | `apps/correcao/services.py:L31` |
| Taxas gerais | anônimo 60/min, usuário 600/min, login 20/min, verificação 5/min, conclusão 30/min, catálogo 60/min | `config/settings.py:L189` |
| Apps do backend | 11 (`contas`, `trilhas`, `autoria`, `progressao`, `gamificacao`, `conquistas`, `ranking`, `clas`, `correcao`, `auditoria`, `core`) | `config/urls.py:L6` |
| Migrações | 64 | `apps/*/migrations/` |
| Requisitos | 37 RFs e 33 RNFs (32 implementados, RNF26 parcial) | `Docs/Rastreabilidade_Requisitos.md` |

## 3. Rotas da API

Todas sob o prefixo `/api/v1/`. A coluna "View" aponta a classe que responde.

### Contas e autenticação

| Método | Rota | View | RF |
|---|---|---|---|
| GET | `auth/csrf/` | `apps/contas/views.py:L144` | RNF03 |
| GET | `auth/documentos/` | `apps/contas/views.py:L60` | RF01 |
| POST | `auth/registrar/` | `apps/contas/views.py:L72` | RF01 |
| POST | `auth/verificar/` e `auth/verificar/reenviar/` | `apps/contas/views.py:L100` e `apps/contas/views.py:L122` | RF02 |
| POST | `auth/login/` | `apps/contas/views.py:L154` | RF03 |
| POST | `auth/login/mfa/` | `apps/contas/views.py:L452` | RF04 |
| GET | `auth/eu/mfa/` | `apps/contas/views.py:L476` | RF05 |
| POST | `auth/eu/mfa/iniciar/`, `confirmar/`, `desativar/iniciar/`, `desativar/` | `apps/contas/views.py:L489`, `apps/contas/views.py:L518`, `apps/contas/views.py:L555`, `apps/contas/views.py:L577` | RF05 |
| POST | `auth/renovar/` e `auth/sair/` | `apps/contas/views.py:L186` e `apps/contas/views.py:L212` | RF06 |
| POST | `auth/senha/esquecida/` e `auth/senha/redefinir/` | `apps/contas/views.py:L313` e `apps/contas/views.py:L333` | RF07 |
| GET, PUT, PATCH | `auth/eu/` | `apps/contas/views.py:L232` | RF08 |
| POST | `auth/eu/email/` e `auth/eu/email/confirmar/` | `apps/contas/views.py:L250` e `apps/contas/views.py:L274` | RF09 |
| GET | `auth/eu/exportar/` | `apps/contas/views.py:L368` | RF29 |
| GET | `auth/eu/consentimentos/` | `apps/contas/views.py:L382` | RF30 |
| POST | `auth/eu/consentimentos/aceitar/` | `apps/contas/views.py:L394` | RF30 |
| POST | `auth/eu/excluir/` e `auth/eu/excluir/confirmar/` | `apps/contas/views.py:L415` e `apps/contas/views.py:L432` | RF31 |
| GET | `auth/eu/atividade/` | `apps/auditoria/views.py:L111` | RF28 |

### Administração e revisão (cada rota exige a própria permissão)

| Método | Rota | View | RF |
|---|---|---|---|
| GET | `auth/admin/permissoes/` | `apps/contas/views_rbac.py:L61` | RF10 |
| GET, POST | `auth/admin/niveis/` | `apps/contas/views_rbac.py:L71` | RF10 |
| GET, PUT, PATCH, DELETE | `auth/admin/niveis/<uuid>/` | `apps/contas/views_rbac.py:L91` | RF10 |
| GET | `auth/admin/usuarios/` | `apps/contas/views_rbac.py:L159` | RF11 |
| DELETE | `auth/admin/usuarios/<uuid>/` | `apps/contas/views_rbac.py:L187` | RF31 |
| PATCH | `auth/admin/usuarios/<uuid>/nivel/` | `apps/contas/views_rbac.py:L247` | RF11 |
| PATCH | `auth/admin/usuarios/<uuid>/situacao/` | `apps/contas/views_rbac.py:L295` | RF34 |
| GET | `auditoria/` | `apps/auditoria/views.py:L55` | RF33 |
| GET | `admin/dashboard/` e `admin/logs/` | `apps/progressao/views.py:L96` e `apps/progressao/views.py:L111` | painel |
| GET | `admin/solicitacoes/` (pedidos de autoria pendentes) | `apps/autoria/views.py:L349` | RF15 |
| POST | `admin/solicitacoes/<id>/aprovar/` e `admin/solicitacoes/<id>/rejeitar/` | `apps/autoria/views.py:L377` e `apps/autoria/views.py:L390` | RF15 |

### Trilhas, exercícios e correção

| Método | Rota | View | RF |
|---|---|---|---|
| GET | `trilhas/` | `apps/trilhas/views.py:L43` | RF12 |
| GET | `trilhas/<slug>/` | `apps/trilhas/views.py:L77` | RF13 |
| GET | `exercicios/<trilha>/<exercicio>/` | `apps/trilhas/views.py:L101` | RF14 |
| GET | `desafios/` e `desafios/hoje/` | `apps/trilhas/views.py:L125` e `apps/trilhas/views.py:L137` | RF27 |
| GET | `exercicios/<trilha>/<exercicio>/codigo/` | `apps/correcao/views.py:L62` | RF20 |
| POST | `exercicios/<trilha>/<exercicio>/executar/` | `apps/correcao/views.py:L81` | RF20 |
| POST | `exercicios/<trilha>/<exercicio>/concluir/` (envia o código quando é exercício de código) | `apps/progressao/views.py:L183` | RF18 e RF21 |
| POST | `trilhas/<slug>/iniciar/` | `apps/progressao/views.py:L137` | RF17 |
| GET | `eu/progresso/` | `apps/progressao/views.py:L70` | RF19 |
| GET | `eu/trilhas/`, `eu/trilhas/<slug>/passos/`, `eu/trilha-atual/` | `apps/progressao/views.py:L165`, `apps/progressao/views.py:L386` e `apps/progressao/views.py:L413` | RF19 |
| POST | `aulas/<trilha>/<aula>/leitura/concluir/` e `.../quiz/concluir/` | `apps/progressao/views.py:L315` e `apps/progressao/views.py:L342` | RF19 |

### Autoria (fluxo editorial)

| Método | Rota | View | RF |
|---|---|---|---|
| POST | `autoria/trilhas/`, `autoria/aulas/`, `autoria/exercicios/` | `apps/autoria/views.py:L425`, `apps/autoria/views.py:L434` e `apps/autoria/views.py:L443` | RF15 |
| POST | `autoria/<tipo>/<id>/submeter/` | `apps/autoria/views.py:L144` | RF15 |
| POST | `autoria/<tipo>/<id>/aprovar/` | `apps/autoria/views.py:L149` | RF15 |
| POST | `autoria/<tipo>/<id>/devolver/` | `apps/autoria/views.py:L155` | RF15 |
| POST | `autoria/<tipo>/<id>/publicar/` | `apps/autoria/views.py:L176` | RF15 |
| GET | `autoria/rascunhos/`, `autoria/aprovados/`, `autoria/fila-revisao/` | `apps/autoria/views.py:L206`, `apps/autoria/views.py:L214` e `apps/autoria/views.py:L220` | RF15 |
| GET | `autoria/exercicios/<trilha>/<exercicio>/solucao/` | `apps/autoria/views.py:L87` | RF16 |
| POST | `autoria/solicitacoes/` | `apps/autoria/views.py:L316` | RF15 |

### Criaturas, clãs e ranking

| Método | Rota | View | RF |
|---|---|---|---|
| GET | `criaturas/` | `apps/gamificacao/views.py:L45` | RF26 |
| GET, POST | `eu/criaturas/` (o POST escolhe a inicial) | `apps/gamificacao/views.py:L60` | RF22 |
| POST | `eu/criaturas/adquirir/` | `apps/gamificacao/views.py:L99` | RF23 |
| GET, PUT | `eu/criaturas/ativa/` | `apps/gamificacao/views.py:L122` | RF24 |
| POST | `eu/criaturas/<slug>/evoluir/` | `apps/gamificacao/views.py:L152` | RF25 |
| GET | `eu/bonus/` | `apps/gamificacao/views.py:L198` | RF26 |
| GET | `eu/conquistas/` | `apps/conquistas/views.py:L16` | conquistas |
| GET, POST | `clas/` | `apps/clas/views.py:L70` | RF35 |
| GET, PATCH | `clas/<tag>/` | `apps/clas/views.py:L109` | RF35 |
| POST | `clas/<tag>/entrar/` e `eu/cla/sair/` | `apps/clas/views.py:L133` e `apps/clas/views.py:L157` | RF35 |
| GET | `ranking/mensal/` | `apps/ranking/views.py:L16` | RF36 |
| GET | `perfil/<nickname>/` | `apps/ranking/views.py:L34` | RF37 |

Documentação interativa (só com `API_DOCS=True`): `/api/docs/` e `/api/schema/`.

## 4. Telas do frontend

Rotas do App Router. Os grupos `(app)` e `(foco)` não aparecem na URL. A coluna "Arquivo" aponta o `export default` da página.

| URL | Arquivo | O que é |
|---|---|---|
| `/` | `src/app/page.tsx:L17` | Landing pública |
| `/admin` | `src/app/(app)/admin/page.tsx:L10` | Painel administrativo: níveis, usuários e auditoria (RF10, RF11, RF33, RF34) |
| `/autoria` | `src/app/(app)/autoria/page.tsx:L10` | Painel de autoria e fila de revisão (RF15) |
| `/autoria/novo` | `src/app/(app)/autoria/novo/page.tsx:L12` | Editor de conteúdo (RF15) |
| `/cadastro` | `src/app/cadastro/page.tsx:L11` | Cadastro (RF01) |
| `/clas` | `src/app/(app)/clas/page.tsx:L11` | Lista e busca de clãs (RF35) |
| `/clas/[tag]` | `src/app/(app)/clas/[tag]/page.tsx:L10` | Página do clã (RF35) |
| `/clas/convite/[token]` | `src/app/(app)/clas/convite/[token]/page.tsx:L10` | Aceitar convite de clã (RF35) |
| `/clas/criar` | `src/app/(app)/clas/criar/page.tsx:L10` | Criar clã (RF35) |
| `/configuracoes` | `src/app/(app)/configuracoes/page.tsx:L9` | Perfil, segurança, atividade, dados e exclusão (RF05, RF08, RF09, RF28 a RF31) |
| `/confirmar-email` | `src/app/confirmar-email/page.tsx:L15` | Confirmação da troca de e-mail (RF09) |
| `/confirmar-exclusao` | `src/app/confirmar-exclusao/page.tsx:L15` | Confirmação da exclusão de conta (RF31) |
| `/conquistas` | `src/app/(app)/conquistas/page.tsx:L10` | Conquistas |
| `/criatura` | `src/app/(app)/criatura/page.tsx:L12` | Painel da criatura, loja e evolução (RF23, RF25) |
| `/criaturas` | `src/app/criaturas/page.tsx:L12` | Escolha da criatura ativa (RF24) |
| `/desafios` | `src/app/(app)/desafios/page.tsx:L17` | Desafios do dia (RF27) |
| `/desafios/[desafioSlug]` | `src/app/(foco)/desafios/[desafioSlug]/page.tsx:L37` | Resolver um desafio (RF14, RF18, RF20, RF21) |
| `/entrar` | `src/app/entrar/page.tsx:L11` | Login e segundo fator (RF03, RF04) |
| `/escolher-criatura` | `src/app/escolher-criatura/page.tsx:L11` | Escolha da criatura inicial (RF22) |
| `/faq` | `src/app/faq/page.tsx:L25` | Perguntas frequentes |
| `/perfil/[nickname]` | `src/app/(app)/perfil/[nickname]/page.tsx:L10` | Perfil público (RF37) |
| `/privacidade` | `src/app/privacidade/page.tsx:L144` | Política de Privacidade (RNF15) |
| `/ranking` | `src/app/(app)/ranking/page.tsx:L10` | Ranking mensal (RF36) |
| `/recuperar-senha` | `src/app/recuperar-senha/page.tsx:L11` | Pedido de recuperação de senha (RF07) |
| `/redefinir-senha` | `src/app/redefinir-senha/page.tsx:L15` | Definir a nova senha pelo link (RF07) |
| `/ser-autor` | `src/app/(app)/ser-autor/page.tsx:L10` | Pedido de autoria (RF15) |
| `/suporte` | `src/app/suporte/page.tsx:L13` | Suporte |
| `/termos` | `src/app/termos/page.tsx:L13` | Termos de Uso (RNF15) |
| `/trilhas` | `src/app/(app)/trilhas/page.tsx:L12` | Catálogo de trilhas (RF12) |
| `/trilhas/[trilhaSlug]` | `src/app/(app)/trilhas/[trilhaSlug]/page.tsx:L57` | Trilha e mapa de fases (RF13) |
| `/trilhas/[trilhaSlug]/aulas/[aulaSlug]` | `src/app/(foco)/trilhas/[trilhaSlug]/aulas/[aulaSlug]/page.tsx:L22` | Leitura da aula |
| `/trilhas/[trilhaSlug]/aulas/[aulaSlug]/quiz` | `src/app/(foco)/trilhas/[trilhaSlug]/aulas/[aulaSlug]/quiz/page.tsx:L18` | Quiz da aula |
| `/trilhas/[trilhaSlug]/concluida` | `src/app/(foco)/trilhas/[trilhaSlug]/concluida/page.tsx:L16` | Trilha concluída |
| `/trilhas/[trilhaSlug]/exercicios/[exercicioSlug]` | `src/app/(foco)/trilhas/[trilhaSlug]/exercicios/[exercicioSlug]/page.tsx:L78` | Resolver um exercício (RF14, RF16, RF18, RF20, RF21) |
| `/trilhas/[trilhaSlug]/flashcards` | `src/app/(foco)/trilhas/[trilhaSlug]/flashcards/page.tsx:L17` | Sessão de flashcards |
| `/verificar-email` | `src/app/verificar-email/page.tsx:L15` | Verificação do e-mail pelo link (RF02) |

## 5. Onde está cada requisito (consulta direta)

Principal ponto de cada RF. O mapa completo, com pontos secundários, está em `Docs/Rastreabilidade_Requisitos.md`.

| Requisito | Nome | Backend (a partir de `backend/`) | Frontend (a partir de `frontend/`) |
|---|---|---|---|
| RF01 | Cadastrar conta | `apps/contas/views.py:L72` | `src/components/auth/FormularioCadastro.tsx:L50` |
| RF02 | Verificar e-mail da conta | `apps/contas/views.py:L100` | `src/components/auth/PainelVerificarEmail.tsx:L48` |
| RF03 | Autenticar usuário | `apps/contas/views.py:L154` | `src/components/auth/FormularioLogin.tsx:L33` |
| RF04 | Autenticar com segundo fator (2FA) | `apps/contas/views.py:L452` | `src/components/auth/FormularioLogin.tsx:L106` |
| RF05 | Ativar e desativar o 2FA | `apps/contas/views.py:L489` | `src/components/configuracoes/SecaoSeguranca.tsx:L35` |
| RF06 | Renovar e encerrar sessão | `apps/contas/views.py:L186` | `src/lib/api.ts:L253` |
| RF07 | Recuperar senha | `apps/contas/views.py:L313` | `src/components/auth/FormularioSenhaEsquecida.tsx:L17` |
| RF08 | Consultar e editar perfil | `apps/contas/views.py:L232` | `src/components/configuracoes/PainelConfiguracoes.tsx:L21` |
| RF09 | Trocar e-mail da conta | `apps/contas/views.py:L250` | `src/components/configuracoes/PainelConfiguracoes.tsx:L133` |
| RF10 | Gerenciar níveis de acesso | `apps/contas/views_rbac.py:L71` | `src/components/admin/GestaoNiveis.tsx:L25` |
| RF11 | Atribuir nível de acesso a usuário | `apps/contas/views_rbac.py:L247` | `src/components/admin/ModalAtribuirNivel.tsx:L35` |
| RF12 | Consultar catálogo de trilhas | `apps/trilhas/views.py:L43` | `src/components/trilhas/PainelDeTrilhas.tsx:L101` |
| RF13 | Consultar trilha e mapa de fases | `apps/trilhas/views.py:L77` | `src/components/trilhas/MapaDeFases.tsx:L12` |
| RF14 | Consultar exercício | `apps/trilhas/views.py:L101` | `src/app/(foco)/trilhas/[trilhaSlug]/exercicios/[exercicioSlug]/page.tsx:L78` |
| RF15 | Controlar fluxo editorial do conteúdo | `apps/autoria/views.py:L133` | `src/components/autoria/PainelAutoria.tsx:L59` |
| RF16 | Consultar solução de referência | `apps/autoria/views.py:L87` | `src/components/exercicio/PetDoExercicio.tsx:L30` |
| RF17 | Iniciar trilha | `apps/progressao/views.py:L137` | `src/components/trilhas/BotaoIniciarTrilha.tsx:L23` |
| RF18 | Concluir exercício e creditar XP | `apps/progressao/services.py:L545` | `src/components/exercicio/PainelDeCodigo.tsx:L160` |
| RF19 | Consultar progresso do aluno | `apps/progressao/views.py:L70` | `src/components/progresso/ProvedorProgresso.tsx:L82` |
| RF20 | Executar código contra casos visíveis | `apps/correcao/views.py:L81` | `src/components/exercicio/PainelDeCodigo.tsx:L136` |
| RF21 | Enviar código para correção automática | `apps/correcao/services.py:L540` | `src/components/exercicio/ResultadoDosCasos.tsx:L82` |
| RF22 | Escolher criatura inicial | `apps/gamificacao/views.py:L60` | `src/components/criaturas/SeletorCriatura.tsx:L10` |
| RF23 | Adquirir nova criatura | `apps/gamificacao/views.py:L99` | `src/components/criatura/PainelCriatura.tsx:L51` |
| RF24 | Definir criatura ativa | `apps/gamificacao/views.py:L122` | `src/components/criaturas/SeletorAtiva.tsx:L96` |
| RF25 | Evoluir criatura | `apps/gamificacao/views.py:L152` | `src/components/gamificacao/TelaDeEvolucao.tsx:L148` |
| RF26 | Consultar criaturas e bônus de XP | `apps/gamificacao/views.py:L198` | `src/components/gamificacao/SeloBonusXp.tsx:L14` |
| RF27 | Apresentar desafios do dia | `apps/trilhas/views.py:L137` | `src/components/desafios/PainelDeDesafios.tsx:L20` |
| RF28 | Consultar histórico da própria atividade | `apps/auditoria/views.py:L111` | `src/components/configuracoes/SecaoAtividade.tsx:L25` |
| RF29 | Exportar dados pessoais | `apps/contas/views.py:L368` | `src/components/configuracoes/SecaoMeusDados.tsx:L6` |
| RF30 | Renovar consentimento dos documentos legais | `apps/contas/views.py:L394` | `src/components/legal/AvisoConsentimento.tsx:L15` |
| RF31 | Excluir conta por anonimização | `apps/contas/views.py:L415` | `src/components/configuracoes/SecaoZonaRisco.tsx:L6` |
| RF32 | Registrar eventos na trilha de auditoria | `apps/auditoria/services.py:L58` | não se aplica |
| RF33 | Consultar trilha de auditoria | `apps/auditoria/views.py:L55` | `src/components/admin/GestaoAuditoria.tsx:L32` |
| RF34 | Suspender e reativar conta | `apps/contas/views_rbac.py:L295` | `src/components/admin/ModalAtribuirNivel.tsx:L125` |
| RF35 | Gerenciar clãs | `apps/clas/views.py:L70` | `src/components/clas/PainelDeClas.tsx:L26` |
| RF36 | Consultar ranking | `apps/ranking/views.py:L16` | `src/components/ranking/PainelDeRanking.tsx:L54` |
| RF37 | Consultar perfil público | `apps/ranking/views.py:L34` | `src/components/perfil/PainelDePerfil.tsx:L25` |

### Requisitos não funcionais

| Requisito | Nome | Backend (a partir de `backend/`) | Frontend (a partir de `frontend/`) |
|---|---|---|---|
| RNF01 | Armazenamento e política de senha | `config/settings.py:L118` | não se aplica |
| RNF02 | Sessão em cookies protegidos | `apps/contas/cookies.py:L18` | `src/lib/api.ts:L169` |
| RNF03 | Proteção contra CSRF e origens não autorizadas | `config/settings.py:L252` | `src/lib/api.ts:L163` |
| RNF04 | Bloqueio por tentativas de login | `apps/contas/models.py:L267` | não se aplica |
| RNF05 | Limitação de taxa de requisições | `config/settings.py:L133` | não se aplica |
| RNF06 | Proteção dos segredos do segundo fator | `apps/contas/mfa.py:L45` | não se aplica |
| RNF07 | Autorização por permissão em cada rota | `config/settings.py:L180` | `src/components/layout/PortaDeAcesso.tsx:L7` |
| RNF08 | Não exposição de gabaritos e casos ocultos | `apps/autoria/views.py:L87` | não se aplica |
| RNF09 | Respostas que não revelam contas existentes | `apps/contas/views.py:L313` | não se aplica |
| RNF10 | Isolamento da execução de código do aluno | `apps/correcao/judge0.py:L19` | não se aplica |
| RNF11 | Política de segurança de conteúdo no navegador | não se aplica | `src/proxy.ts:L16` |
| RNF12 | Trilha de auditoria imutável | `apps/auditoria/models.py:L237` | não se aplica |
| RNF13 | Retenção e descarte da auditoria | `apps/auditoria/management/commands/limpar_auditoria.py:L20` | não se aplica |
| RNF14 | Anonimização na exclusão de conta | `apps/contas/lgpd.py:L108` | não se aplica |
| RNF15 | Consentimento versionado e idade mínima | `apps/contas/documentos.py:L23` | `src/components/legal/AvisoConsentimento.tsx:L15` |
| RNF16 | Reaproveitamento de correções idênticas | `apps/correcao/services.py:L32` | não se aplica |
| RNF17 | Cotas e disjuntor da correção automática | `apps/correcao/services.py:L154` | não se aplica |
| RNF18 | Consultas ao banco com número constante | `apps/trilhas/views.py:L84` | não se aplica |
| RNF19 | Integridade da progressão e da posse de criaturas | `apps/progressao/services.py:L557` | não se aplica |
| RNF20 | Suíte de testes automatizados | `pyproject.toml:L15` | `jest.config.ts:L7` |
| RNF21 | Evolução versionada do banco de dados | `apps/*/migrations/` | não se aplica |
| RNF22 | Degradação controlada sem o Judge0 | `apps/correcao/judge0.py:L120` | `src/components/ui/ServicoIndisponivel.tsx:L7` |
| RNF23 | Configuração por variáveis de ambiente | `config/settings.py:L21` | `next.config.ts:L3` |
| RNF24 | Versões de dependências e de runtime fixadas | `requirements.txt:L1` | `package.json:L5` |
| RNF25 | Implantação em servidor próprio (VPS) | `Dockerfile:L1` (em `backend/`) | `Dockerfile:L2` (em `frontend/`) |
| RNF26 | Análise estática e tipagem | `pyproject.toml:L43` | `tsconfig.json:L7` |
| RNF27 | Integração contínua | `.github/workflows/ci.yml:L22` | `.github/workflows/ci.yml:L49` |
| RNF28 | Documentação da API e padrão de erro | `apps/core/exceptions.py:L52` | não se aplica |
| RNF29 | Identidade visual e tema escuro | não se aplica | `src/app/globals.css:L3` |
| RNF30 | Acessibilidade | não se aplica | `src/components/ui/useModal.ts:L13` |
| RNF31 | Idioma e fuso horário brasileiros | `config/settings.py:L353` | `src/app/layout.tsx:L22` |
| RNF32 | Navegadores suportados | não se aplica | `package.json:L8` |
| RNF33 | Plataforma tecnológica | `requirements.txt:L1` | `package.json:L27` |

## 6. Respostas honestas para as perguntas difíceis

1. **"O quiz entrega a resposta ao navegador?"** Sim, `resposta_correta` vai no payload (`apps/trilhas/serializers.py:L19`). O quiz é corrigido no servidor e grava a nota, mas não dá XP; quem lê a rede pode tirar nota máxima. Está registrado como ressalva 1.
2. **"O segredo do TOTP é cifrado?"** Não: fica em texto puro (`apps/contas/models.py:L512`), porque o servidor precisa lê-lo para validar o código. Os códigos de recuperação e os códigos por e-mail só existem em hash. Ressalva 4.
3. **"O mypy cobre tudo?"** Não: `contas`, `progressao` e `clas` ficam fora do modo estrito (`pyproject.toml:L47` lista o que está dentro). RNF26 está marcado como parcial.
4. **"A auditoria é à prova de adulteração?"** Contra alteração pelo modelo, sim (`apps/auditoria/models.py:L237`); contra quem tem acesso direto ao banco, não. É o limite de qualquer log em tabela comum.
5. **"Há alguma regra que só existe por convenção?"** Sim: nunca gravar segredo na auditoria (`apps/auditoria/services.py:L11`) é combinado, não filtro; e o RF27-RN02 (desafio não dá XP extra) vale por ausência de código.
6. **"A RN diz só Python, o código aceita mais?"** O mapa do Judge0 tem Python e SQL (`apps/correcao/judge0.py:L12`); a RN escrita está desatualizada.
7. **"O perfil é público?"** Exige sessão (`apps/ranking/views.py:L37`): é público entre alunos logados, não para a internet.
8. **"Onde estão os testes?"** Ao lado do código: `apps/*/tests/` no backend (`pyproject.toml:L20` define `testpaths`) e `src/**/__tests__/` no frontend (`jest.config.ts:L10`).
