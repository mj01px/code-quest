# Integração com a API do CodeQuest

> **Origem deste texto.** Montado a partir do código da branch
> `entrega/2026-09-28-lgpd-mfa-exclusao-e-validacao-de-conta` (commit
> `e136e72`): `backend/config/urls.py`, o `urls.py` e as views de cada app,
> `backend/config/settings.py` e o schema OpenAPI gerado pelo drf-spectacular.
> Nenhuma rota aqui foi inferida: as 55 operações da seção 7 são exatamente as
> que o schema publica.

## 1. Visão geral

O CodeQuest é um monorepo com dois processos:

| Processo | Pasta | Porta local | Papel |
|---|---|---|---|
| Django 6.0.8 + Django REST Framework 3.18.0 (Python 3.14) | `backend/` | 8000 | Serve só a API REST, em JSON, sob `/api/v1/`. Banco PostgreSQL via `DATABASE_URL`. |
| Next.js 16.3.3 + React 19.2.8 (TypeScript 5.9.3, Tailwind 4.3.3) | `frontend/` | 3000 | Serve as telas. Não guarda regra de negócio nem dado. |

O navegador fala com a API pela **mesma origem** do frontend: o Next faz rewrite
de `/api/*` para `API_ORIGIN` (padrão `http://localhost:8000`). Por isso os
cookies de sessão são de primeira parte e nunca cruzam domínio.

Convenções da API:

- Nomes de campo em português, `snake_case` (`data_nascimento`, `senha_atual`).
- Datas e horários em ISO 8601.
- Toda rota termina em barra (`/api/v1/trilhas/`, não `/api/v1/trilhas`).
- Toda rota exige sessão, exceto as marcadas como **pública** na seção 7.

## 2. Documentação interativa (Swagger)

Com o backend rodando (`python manage.py runserver 8000`):

| O quê | Endereço |
|---|---|
| Swagger UI | `http://localhost:8000/api/docs/` |
| Schema OpenAPI 3 (bruto) | `http://localhost:8000/api/schema/` |

Os dois são gerados pelo **drf-spectacular 0.30.0** direto das views e dos
serializers, então acompanham o código sem edição manual. O schema declara dois
esquemas de autenticação: `cookieAuth` (o cookie `cq_access`) e `jwtAuth`
(header `Authorization: Bearer`).

O Swagger mostra o formato de cada request e response. Este documento cobre o
que ele não mostra: a ordem dos fluxos, o papel de cada cookie, o CSRF, os
limites e o significado dos erros. Várias rotas de autenticação declaram
`responses=None` e aparecem no Swagger sem schema de resposta; o corpo delas
está descrito na seção 4.

## 3. Autenticação

### 3.1 Cookies

O login devolve um par de JWT (SimpleJWT 5.5.1) **só em cookies**. Nenhuma rota
devolve o token no corpo da resposta.

| Cookie | Conteúdo | Validade | Caminho | HttpOnly |
|---|---|---|---|---|
| `cq_access` | Token de acesso | 15 minutos | `/` | Sim |
| `cq_refresh` | Token de renovação | 7 dias | `/api/v1/auth/` | Sim |
| `cq_sessao` | O valor `1`, sem credencial | 7 dias | `/` | Não |
| `csrftoken` | Token anti-CSRF do Django | Padrão do Django | `/` | Não |

Os quatro usam `SameSite=Lax`. O atributo `Secure` segue `AUTH_COOKIE_SECURE`,
que por padrão é o contrário de `DEBUG`: ligado em produção, desligado em
desenvolvimento.

- `cq_refresh` tem caminho restrito a `/api/v1/auth/`: o navegador só o envia
  para as rotas de autenticação, nunca para o resto da API.
- `cq_sessao` existe porque os cookies de verdade são HttpOnly e o JavaScript
  não os enxerga. Ele só avisa à interface que provavelmente há sessão. Não
  autentica nada.
- A renovação é rotativa: cada `POST /auth/renovar/` emite um refresh novo e põe
  o anterior na lista negra (`ROTATE_REFRESH_TOKENS` e
  `BLACKLIST_AFTER_ROTATION`).

A API também aceita `Authorization: Bearer <access>`, porque o
`JWTAuthentication` do SimpleJWT está configurado como segunda classe de
autenticação. Na prática, o caminho suportado é o cookie, já que o token não
sai no corpo de nenhuma resposta.

### 3.2 CSRF

Quando a requisição se autentica pelo cookie `cq_access`, o backend aplica a
checagem de CSRF do Django (`apps/contas/autenticacao.py`). Em todo método que
altera estado (`POST`, `PUT`, `PATCH`, `DELETE`):

1. Obtenha o cookie `csrftoken` com `GET /api/v1/auth/csrf/` (responde 204).
2. Envie o valor dele no header `X-CSRFToken`.

Sem isso, a resposta é **403** com a mensagem "Falha na verificação CSRF.
Recarregue a página e tente de novo." A regra mais simples para o cliente é
mandar `X-CSRFToken` em toda requisição que altera estado, como o frontend faz.
`/auth/csrf/` e `/auth/sair/` não passam por autenticação e dispensam o header.

Se o cliente rodar num navegador e em outra origem, essa origem precisa constar
em `CSRF_TRUSTED_ORIGINS` e em `CORS_ALLOWED_ORIGINS` no `.env` do backend
(`CORS_ALLOW_CREDENTIALS` já é `True`).

### 3.3 Verificação de e-mail

O cadastro é aberto, mas a conta fica inerte até o titular abrir o link enviado
por e-mail. Enquanto isso, o login responde **400** com o código
`email_nao_verificado`. O link vale 24 horas (`VERIFICACAO_EMAIL_MAX_AGE`).

### 3.4 Verificação em duas etapas (2FA)

Opcional, um método por vez:

- **APP**: código TOTP de 6 dígitos de um aplicativo autenticador.
- **EMAIL**: código de 6 dígitos enviado por e-mail, válido por 10 minutos
  (`MFA_EMAIL_CODIGO_MAX_AGE`) e de uso único.

Ao ativar, a API devolve **uma única vez** 8 códigos de recuperação no formato
`xxxx-xxxx`. Cada um vale uma vez e serve para qualquer método. Com 2FA ativo, o
login tem dois passos (seção 4.3), e o `mfa_token` entre eles vale 5 minutos
(`MFA_LOGIN_TOKEN_MAX_AGE`). Trocar de método exige desativar antes, e desativar
exige um código válido.

### 3.5 Bloqueio por tentativas

Depois de 5 senhas erradas seguidas (`LOGIN_MAX_TENTATIVAS`), a conta fica
bloqueada por 15 minutos (`LOGIN_BLOQUEIO_SEGUNDOS`). Durante o bloqueio, o
login responde exatamente como a uma senha errada (401, `credencial_invalida`),
para não revelar se a conta existe ou está bloqueada. Senha atual errada na
troca de e-mail conta no mesmo contador.

### 3.6 Permissões

Por padrão toda rota exige sessão (`IsAuthenticated`). Em cima disso, as rotas
de ação checam uma permissão do RBAC (ex.: `submissoes.create`,
`trilhas.enroll`), que vem do **nível de acesso** do usuário. O painel
administrativo exige um nível com `acesso_admin`. Os níveis de sistema (Aluno,
Autor, Admin) já concedem o que um aluno usa; a recusa por permissão responde
**403**.

## 4. Fluxos principais

Todos os caminhos abaixo são relativos a `/api/v1`.

### 4.1 Cadastro

1. `GET /auth/documentos/` devolve a versão vigente dos Termos e da Política
   (`termos.versao`, `privacidade.versao`, `vigente_desde`, `caminho`).
2. `POST /auth/registrar/` com:

   | Campo | Regra |
   |---|---|
   | `email` | E-mail válido; normalizado para minúsculas |
   | `nickname` | Único sem diferenciar maiúsculas |
   | `senha` | Passa pelos validadores de senha do Django |
   | `data_nascimento` | `AAAA-MM-DD`; idade mínima de **16 anos** (`idade_minima`) |
   | `aceite_documentos` | Precisa ser `true` (`aceite_obrigatorio`) |
   | `versao_termos`, `versao_privacidade` | Precisam ser as versões vigentes do passo 1 (`versao_desatualizada`) |

3. Resposta **201** `{"email_enviado": true|false}`. O aceite dos dois
   documentos é gravado com versão, data e IP de origem.

Se o e-mail já tiver conta, a resposta é a mesma 201: a API não revela quais
endereços estão cadastrados. Nesse caso, o dono do endereço recebe um aviso de
tentativa de cadastro, em vez do link.

### 4.2 Verificação de e-mail

1. O e-mail traz um link para a tela `/verificar-email?token=...` do frontend
   (`FRONTEND_URL`).
2. A tela chama `POST /auth/verificar/` com `{"token": "..."}`. Resposta **200**
   com os dados do usuário e `ja_confirmado` (se o link já tinha sido usado).
3. Para pedir outro link: `POST /auth/verificar/reenviar/` com `{"email": "..."}`.
   Responde **204** sempre, exista a conta ou não.

### 4.3 Login

1. `POST /auth/login/` com `{"email": "...", "senha": "..."}`.
2. Sem 2FA: **200** `{"usuario": {...}}` e os cookies da seção 3.1.
3. Com 2FA: **200** `{"mfa_required": true, "metodo": "APP"|"EMAIL", "mfa_token": "..."}`,
   sem cookies. Se o método for e-mail, o código acabou de ser enviado.
4. `POST /auth/login/mfa/` com `{"mfa_token": "...", "codigo": "..."}` (código
   do método ou de recuperação). Resposta **200** `{"usuario": {...}}` e os
   cookies.

`GET /auth/eu/` devolve o usuário logado: `id`, `email`, `nickname`, `papel`,
`papel_rotulo`, `permissoes`, `is_admin`, `criado_em`. `PATCH /auth/eu/` altera
só o `nickname`.

### 4.4 Renovação

`POST /auth/renovar/`, sem corpo. A API lê o `cq_refresh` do cookie, responde
**204** e regrava `cq_access`, `cq_refresh` e `cq_sessao`. Sem o cookie, ou com
ele vencido ou na lista negra, responde **401**. O frontend renova quando uma
chamada autenticada volta 401 e repete a chamada uma vez.

### 4.5 Logout

`POST /auth/sair/` põe o refresh na lista negra, grava o logout na auditoria e
apaga os três cookies de sessão. Responde **204** mesmo sem sessão.

### 4.6 Recuperação de senha

1. `POST /auth/senha/esquecida/` com `{"email": "..."}`. Responde **204**
   sempre.
2. O e-mail traz `/redefinir-senha?token=...`, válido por 30 minutos
   (`REDEFINICAO_SENHA_MAX_AGE`).
3. `POST /auth/senha/redefinir/` com `{"token", "senha", "senha_confirmacao"}`.
   Resposta **204**.

A redefinição encerra **todas** as sessões abertas, zera o bloqueio por
tentativas e cancela uma troca de e-mail pendente. O link é de uso único: o
segundo uso responde 400 com o código `link_ja_usado`.

### 4.7 Troca de e-mail em duas etapas

1. `POST /auth/eu/email/` com `{"email": "<novo>", "senha_atual": "..."}`.
   Resposta **200** `{"email_enviado": ...}`. Nada muda ainda: o pedido fica
   pendente, e login, 2FA e redefinição de senha continuam no endereço atual.
2. O **endereço atual** recebe `/confirmar-email?token=...`. A tela chama
   `POST /auth/eu/email/confirmar/` com o token. Resposta **200**
   `{"etapa": "posse", "email_enviado": ...}`.
3. O **endereço novo** recebe outro link para a mesma tela. O mesmo
   `POST /auth/eu/email/confirmar/` com esse token efetiva a troca e responde
   **200** com o usuário já no e-mail novo.

Cada link vale 30 minutos (`TROCA_EMAIL_MAX_AGE`) e uma vez só. Um pedido novo,
ou uma redefinição de senha, invalida o pendente.

### 4.8 Exclusão de conta

1. `POST /auth/eu/excluir/`. Resposta **200** `{"email_enviado": ...}`. A conta
   ainda não muda.
2. O e-mail traz `/confirmar-exclusao?token=...`, válido por 30 minutos
   (`EXCLUSAO_TOKEN_MAX_AGE`).
3. `POST /auth/eu/excluir/confirmar/` com `{"token": "...", "senha": "..."}`.
   Resposta **204**: a conta é anonimizada na hora, todas as sessões são
   encerradas e os cookies apagados. Não há prazo de arrependimento.

### 4.9 Dados do titular e consentimentos

| Rota | O que faz |
|---|---|
| `GET /auth/eu/exportar/` | Cópia em JSON dos dados pessoais: perfil, aceites, trilhas iniciadas, XP, criaturas e atividade. |
| `GET /auth/eu/atividade/` | As ações sensíveis da própria conta, paginadas (5 por página, `?tamanho=` até 50). |
| `GET /auth/eu/consentimentos/` | Para cada documento: versão vigente, versão aceita e `pendente`. |
| `POST /auth/eu/consentimentos/aceitar/` | Registra o aceite das versões vigentes ainda não aceitas. |

### 4.10 Gestão do 2FA

| Rota | O que faz |
|---|---|
| `GET /auth/eu/mfa/` | `{"ativo": bool, "metodo": "APP"|"EMAIL"|""}` |
| `POST /auth/eu/mfa/iniciar/` | `{"metodo": "APP"}` devolve `secret`, `otpauth` e `qr` (SVG em data URI) para cadastrar no aplicativo. `{"metodo": "EMAIL"}` envia o primeiro código. Ainda não ativa. |
| `POST /auth/eu/mfa/confirmar/` | `{"codigo": "..."}` ativa e devolve `{"codigos_recuperacao": [...]}`. |
| `POST /auth/eu/mfa/desativar/iniciar/` | Envia o código por e-mail, quando o método ativo é e-mail. |
| `POST /auth/eu/mfa/desativar/` | `{"codigo": "..."}` desativa e apaga os códigos de recuperação. Responde 204. |

## 5. Envelope de erro

Toda falha responde no mesmo formato, montado por `apps/core/exceptions.py`:

```json
{
  "error": {
    "code": "validacao",
    "message": "É preciso ter pelo menos 16 anos para criar uma conta.",
    "details": [
      {
        "field": "data_nascimento",
        "code": "idade_minima",
        "message": "É preciso ter pelo menos 16 anos para criar uma conta."
      }
    ]
  }
}
```

- **Erro de validação** (400): `code` é sempre `validacao`, `message` repete o
  primeiro detalhe, e `details` traz um item por problema, com o campo
  (`field`, em notação de ponto quando aninhado), o código e a mensagem.
- **Demais erros** (401, 403, 404, 429, 503): `code` é o código específico,
  `message` é o texto para exibir e `details` vem vazio.

```json
{
  "error": {
    "code": "credencial_invalida",
    "message": "E-mail ou senha incorretos. Se errou várias vezes, espere alguns minutos ou redefina sua senha.",
    "details": []
  }
}
```

O cliente deve decidir pelo `code`, não pelo texto da `message`.

## 6. Versionamento

Toda a API está sob `/api/v1/`. O schema declara a versão `1.0.0`. Não há
outra versão publicada, nem negociação de versão por header.

## 7. Endpoints por módulo

Legenda de acesso: **pública** (sem sessão), **sessão** (login),
**permissão `x`** (login mais a permissão do RBAC), **admin** (nível com
`acesso_admin`). A coluna de limite cita o escopo de throttle da seção 10.
Caminhos relativos a `/api/v1`.

### Autenticação

| Método | Rota | Acesso | Limite |
|---|---|---|---|
| GET | `/auth/csrf/` | pública | `anon` |
| GET | `/auth/documentos/` | pública | `anon`/`user` |
| POST | `/auth/registrar/` | pública | `auth` |
| POST | `/auth/verificar/` | pública | `verificacao` |
| POST | `/auth/verificar/reenviar/` | pública | `verificacao` |
| POST | `/auth/login/` | pública | `auth` |
| POST | `/auth/login/mfa/` | pública | `auth` |
| POST | `/auth/renovar/` | pública (usa o cookie de refresh) | `auth` |
| POST | `/auth/sair/` | pública | `anon` |
| POST | `/auth/senha/esquecida/` | pública | `verificacao` |
| POST | `/auth/senha/redefinir/` | pública | `verificacao` |

### Conta, LGPD e 2FA

| Método | Rota | Acesso | Limite |
|---|---|---|---|
| GET, PATCH | `/auth/eu/` | sessão | `user` |
| POST | `/auth/eu/email/` | sessão | `verificacao` |
| POST | `/auth/eu/email/confirmar/` | pública (usa o token do link) | `verificacao` |
| POST | `/auth/eu/excluir/` | sessão | `verificacao` |
| POST | `/auth/eu/excluir/confirmar/` | pública (usa o token do link e a senha) | `verificacao` |
| GET | `/auth/eu/exportar/` | sessão | `user` |
| GET | `/auth/eu/atividade/` | sessão | `user` |
| GET | `/auth/eu/consentimentos/` | sessão | `user` |
| POST | `/auth/eu/consentimentos/aceitar/` | sessão | `user` |
| GET | `/auth/eu/mfa/` | sessão | `user` |
| POST | `/auth/eu/mfa/iniciar/` | sessão | `verificacao` |
| POST | `/auth/eu/mfa/confirmar/` | sessão | `verificacao` |
| POST | `/auth/eu/mfa/desativar/iniciar/` | sessão | `verificacao` |
| POST | `/auth/eu/mfa/desativar/` | sessão | `verificacao` |

### Administração (RBAC e auditoria)

| Método | Rota | Acesso | Limite |
|---|---|---|---|
| GET | `/auth/admin/permissoes/` | admin | `user` |
| GET, POST | `/auth/admin/niveis/` | admin | `user` |
| GET, PUT, PATCH, DELETE | `/auth/admin/niveis/{id}/` | admin | `user` |
| GET | `/auth/admin/usuarios/` | admin | `user` |
| PATCH | `/auth/admin/usuarios/{id}/nivel/` | admin | `user` |
| GET | `/auditoria/` | permissão `auditoria.view` | `user` |

`/auditoria/` aceita os filtros `acao`, `actor`, `desde` e `ate`, e pagina com
50 itens por página (`?tamanho=` até 200).

### Trilhas e exercícios

| Método | Rota | Acesso | Limite |
|---|---|---|---|
| GET | `/trilhas/` | pública | `catalogo` |
| GET | `/trilhas/{slug}/` | pública | `catalogo` |
| GET | `/exercicios/{trilha_slug}/{exercicio_slug}/` | pública | `catalogo` |
| GET | `/autoria/exercicios/{trilha_slug}/{exercicio_slug}/solucao/` | permissão `trilhas.view_solution` | `autoria` |

A API pública só devolve conteúdo publicado.

### Progressão

| Método | Rota | Acesso | Limite |
|---|---|---|---|
| GET | `/eu/progresso/` | sessão | `user` |
| GET | `/eu/trilhas/` | sessão | `eu_progresso` |
| POST | `/trilhas/{trilha_slug}/iniciar/` | permissão `trilhas.enroll` | `conclusao` |
| GET | `/eu/exercicios-concluidos/` | sessão | `eu_progresso` |
| POST | `/exercicios/{trilha_slug}/{exercicio_slug}/concluir/` | permissão `exercicios.complete` | `conclusao`, e `judge0` quando há correção automática |

- `/eu/progresso/` responde **204** quando o usuário ainda não tem criatura ativa.
- `/trilhas/{trilha_slug}/iniciar/` é idempotente: **201** na primeira vez,
  **200** nas seguintes, com o mesmo corpo.
- `/eu/exercicios-concluidos/` aceita `?trilha=<slug>`.
- Em exercício com correção automática, `concluir/` exige também
  `submissoes.create` e recebe `{"codigo": "..."}`. Se o código não passar, a
  resposta é **200** `{"aprovado": false, "correcao": {...}}`, sem XP.

### Gamificação (criaturas)

| Método | Rota | Acesso | Limite |
|---|---|---|---|
| GET | `/criaturas/` | pública | `anon`/`user` |
| GET | `/eu/criaturas/` | permissão `criaturas.view` | `user` |
| POST | `/eu/criaturas/` | permissão `criaturas.acquire` (escolha da criatura inicial) | `user` |
| POST | `/eu/criaturas/adquirir/` | permissão `criaturas.acquire` | `user` |
| GET, PUT | `/eu/criaturas/ativa/` | permissão `criaturas.view` | `user` |
| POST | `/eu/criaturas/{creature_slug}/evoluir/` | permissão `criaturas.evolve` | `conclusao` |
| GET | `/eu/bonus/` | permissão `criaturas.view` | `user` |

### Correção de código (Judge0)

| Método | Rota | Acesso | Limite |
|---|---|---|---|
| GET | `/exercicios/{trilha_slug}/{exercicio_slug}/codigo/` | permissão `submissoes.create` | `eu_progresso` |
| POST | `/exercicios/{trilha_slug}/{exercicio_slug}/executar/` | permissão `submissoes.create` | `judge0` |

`codigo/` devolve a especificação do exercício (linguagem, função, código
inicial, exemplos visíveis, limite de 10.000 caracteres e o último código
aprovado do próprio usuário). `executar/` recebe `{"codigo": "..."}`, roda o
código contra os casos de teste e devolve o veredito, sem dar XP. O backend
chama o Judge0 no servidor; o cliente nunca fala com ele nem vê a credencial.

## 8. Integração por cliente terceiro (curl)

Os exemplos usam um arquivo de cookies (`cq.txt`), que faz o papel do navegador.
Rodam em Bash contra o backend local.

```bash
API=http://localhost:8000/api/v1
JAR=cq.txt
```

**Obter o token CSRF** (grava o cookie `csrftoken` no arquivo e extrai o valor):

```bash
curl -s -c $JAR -b $JAR "$API/auth/csrf/"
CSRF=$(awk '$6=="csrftoken"{print $7}' $JAR)
```

**Consultar o catálogo público** (sem sessão):

```bash
curl -s "$API/trilhas/"
```

**Cadastrar** (as versões vêm de `GET /auth/documentos/`):

```bash
curl -s "$API/auth/documentos/"
curl -s -c $JAR -b $JAR -X POST "$API/auth/registrar/" \
  -H "Content-Type: application/json" -H "X-CSRFToken: $CSRF" \
  -d '{"email":"aluna@exemplo.com","nickname":"aluna_01","senha":"uma-senha-longa-e-sua","data_nascimento":"2005-04-10","aceite_documentos":true,"versao_termos":"1.1","versao_privacidade":"1.1"}'
```

**Confirmar o e-mail** (o token vem do link recebido; em desenvolvimento, sem
SMTP configurado, o e-mail sai no terminal do `runserver`):

```bash
curl -s -X POST "$API/auth/verificar/" \
  -H "Content-Type: application/json" -d '{"token":"<token-do-link>"}'
```

**Entrar** (os cookies de sessão ficam gravados no arquivo):

```bash
curl -s -c $JAR -b $JAR -X POST "$API/auth/login/" \
  -H "Content-Type: application/json" -H "X-CSRFToken: $CSRF" \
  -d '{"email":"aluna@exemplo.com","senha":"uma-senha-longa-e-sua"}'
```

Se a resposta trouxer `"mfa_required": true`, complete o segundo passo:

```bash
curl -s -c $JAR -b $JAR -X POST "$API/auth/login/mfa/" \
  -H "Content-Type: application/json" -H "X-CSRFToken: $CSRF" \
  -d '{"mfa_token":"<mfa_token-da-resposta>","codigo":"123456"}'
```

**Usar a sessão** (leitura não pede CSRF; escrita pede):

```bash
curl -s -b $JAR "$API/auth/eu/"
curl -s -c $JAR -b $JAR -X POST "$API/trilhas/logica-de-programacao/iniciar/" \
  -H "X-CSRFToken: $CSRF"
```

**Enviar código para correção**:

```bash
curl -s -b $JAR -X POST "$API/exercicios/<trilha_slug>/<exercicio_slug>/executar/" \
  -H "Content-Type: application/json" -H "X-CSRFToken: $CSRF" \
  -d '{"codigo":"def soma(a, b):\n    return a + b\n"}'
```

**Renovar a sessão** depois que o acesso vencer (15 minutos):

```bash
curl -s -c $JAR -b $JAR -X POST "$API/auth/renovar/" -H "X-CSRFToken: $CSRF"
```

**Exportar os próprios dados**:

```bash
curl -s -b $JAR "$API/auth/eu/exportar/" -o meus-dados.json
```

**Sair**:

```bash
curl -s -c $JAR -b $JAR -X POST "$API/auth/sair/"
```

O `curl` respeita o caminho dos cookies, então o `cq_refresh` só é enviado para
`/api/v1/auth/`, como no navegador.

## 9. Códigos de status

| Status | Significado neste projeto | Códigos típicos em `error.code` |
|---|---|---|
| 400 | Dado inválido, regra de negócio recusada ou link de e-mail inválido ou já usado. | `validacao`, com o motivo em `details[].code` (`idade_minima`, `versao_desatualizada`, `aceite_obrigatorio`, `nickname_em_uso`, `email_nao_verificado`, `token_invalido`, `link_ja_usado`, `codigo_invalido`, `senha_incorreta`, ...). Exceção: `mfa_ja_ativo` e `mfa_inativo` vêm direto em `code`. |
| 401 | Sem sessão, sessão vencida ou credencial errada. No login, também conta bloqueada, com a mesma mensagem. | `not_authenticated`, `token_not_valid`, `credencial_invalida` |
| 403 | Sessão válida sem a permissão do RBAC exigida, ou falha na verificação CSRF. | `permission_denied` |
| 404 | Recurso inexistente ou não publicado (trilha, exercício, criatura do usuário). | `not_found` |
| 405 | Método não suportado na rota (ex.: `DELETE` no catálogo). | `method_not_allowed` |
| 429 | Limite de requisições estourado (seção 10), ou teto diário de correções do usuário. | `throttled`, `limite_do_usuario` |
| 503 | Correção automática indisponível: o Judge0 falhou, não respondeu ou não está configurado, ou o disjuntor da cota diária abriu. | `corretor_indisponivel`, `limite_diario` |

O 503 é do serviço, não do pedido: o cliente deve mostrar a mensagem e deixar a
pessoa tentar depois, sem repetir a chamada em laço.

## 10. Limites de requisição

| Escopo | Limite | Onde vale |
|---|---|---|
| `anon` | 60/min por IP | Rotas sem escopo próprio, sem sessão |
| `user` | 600/min por usuário | Rotas sem escopo próprio, com sessão |
| `auth` | 20/min | Cadastro, login, segundo passo do login, renovação |
| `verificacao` | 5/min | Links de e-mail, senha, troca de e-mail, exclusão, gestão do 2FA |
| `catalogo` | 60/min (`THROTTLE_CATALOGO`) | Catálogo público de trilhas e exercícios |
| `eu_progresso` | 120/min (`THROTTLE_EU_PROGRESSO`) | Listas do próprio progresso e especificação do exercício |
| `conclusao` | 30/min | Iniciar trilha, concluir exercício, evoluir criatura |
| `autoria` | 30/min (`THROTTLE_AUTORIA`) | Solução de referência |
| `judge0` | 5/min por usuário | `executar/` e o envio de código do `concluir/`, no mesmo balde |

Além da rajada, a correção tem dois tetos diários, contados no banco e só para
chamadas pagas ao Judge0 (acerto de cache e código barrado antes da chamada não
contam):

- **Por usuário**: `JUDGE0_LIMITE_POR_USUARIO` (padrão 10 por dia). Estourou,
  **429** `limite_do_usuario`.
- **Global (disjuntor)**: para em 90% de `JUDGE0_LIMITE_DIARIO` (padrão 50,
  a cota do plano). Abriu, **503** `limite_diario` para todos até a
  meia-noite de `America/Sao_Paulo`.

Os contadores de rajada ficam em `LocMemCache`, que é por processo: com vários
workers o limite real se multiplica, e reiniciar o servidor zera os contadores.
Trocar o cache por Redis resolve sem mudar as views. Os tetos diários do Judge0
não sofrem disso, porque contam no banco.

## 11. O que um integrador não recebe

- **Solução de referência** (`solucao_autor`): fora de todo serializer
  público; só a rota de autoria, com `trilhas.view_solution`.
- **Credencial do Judge0**: vive no `.env` do backend (`JUDGE0_TOKEN`) e só é
  usada no header da chamada que o servidor faz. Não aparece em resposta nem em
  log.
- **Tokens de sessão**: só em cookie HttpOnly, nunca no corpo.
- **Senha**: guardada só como hash Argon2; nenhuma rota a devolve.
- **Chave do 2FA e códigos de recuperação**: exibidos uma única vez, nas
  respostas descritas na seção 4.10, e nunca gravados em log.
