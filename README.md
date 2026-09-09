<div align="center">

<br/>

<a href="https://git.io/typing-svg">
  <img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&weight=600&size=30&pause=1000&color=A855F7&center=true&vCenter=true&width=520&lines=CodeQuest;Aprenda.+Pratique.+Evolua." alt="Typing SVG" />
</a>

<br/>

<p>
  <img src="https://img.shields.io/badge/Python-3.14-3776AB?style=flat-square&logo=python&logoColor=white"/>
  <img src="https://img.shields.io/badge/Django-6.0-092E20?style=flat-square&logo=django&logoColor=white"/>
  <img src="https://img.shields.io/badge/DRF-3.18-A30000?style=flat-square&logo=django&logoColor=white"/>
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white"/>
  <img src="https://img.shields.io/badge/React-19-20232A?style=flat-square&logo=react&logoColor=61DAFB"/>
  <img src="https://img.shields.io/badge/TypeScript-5-007ACC?style=flat-square&logo=typescript&logoColor=white"/>
  <img src="https://img.shields.io/badge/Tailwind-4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white"/>
</p>

</div>

<br/>

---

## `~/sobre`

```ts
const codequest = {
  tipo:        "Plataforma gamificada de ensino de programação",
  backend:     ["Python 3.14", "Django 6.0", "Django REST Framework", "SimpleJWT", "SQLite", "pytest"],
  frontend:    ["Next.js 16", "React 19", "TypeScript", "Tailwind CSS v4", "Jest + RTL"],
  recursos:    ["Trilhas de aprendizado", "Fluxo editorial", "Criaturas companheiras", "RBAC dinâmico", "JWT em cookies", "Verificação por e-mail"],
  auth:        "JWT em cookie, Argon2, cadastro aberto com confirmação de e-mail",
  autor:       "Mauro Junior, github.com/mj01px",
} as const;
```

O **CodeQuest** transforma aprender a programar em uma jornada. O conteúdo é
organizado em **trilhas**, feitas de aulas e exercícios, e cada aluno escolhe uma
**criatura** que evolui conforme ele avança de nível. Ele resolve as duas coisas de
que uma plataforma para iniciantes depende: manter o material coerente e confiável, e
dar ao aluno um motivo para voltar à próxima fase.

As trilhas passam por um fluxo editorial antes de qualquer um vê-las, então nada pela
metade chega ao aluno. O progresso é guardado no cliente, a API de conteúdo é
somente-leitura, e as contas são protegidas de ponta a ponta: hash com Argon2, JWT em
cookies httponly, verificação de e-mail e uma tabela de permissões por papel que vive
em dados, não no código.

```
code-quest/
├── backend/     # API REST Django       →  http://localhost:8000
└── frontend/    # Next.js App Router     →  http://localhost:3000
```

---

## `~/recursos`

<table>
  <tr>
    <td valign="top" width="50%">
      <b>📚 Aprendizado</b><br/><br/>
      <ul>
        <li>Trilhas, aulas (Markdown) e exercícios</li>
        <li>Exercícios de código e teóricos, por dificuldade</li>
        <li>Pré-requisito entre aulas dentro da trilha</li>
        <li>Mapa de fases com "continuar de onde parou"</li>
        <li>Progresso guardado localmente, a API de conteúdo é somente-leitura</li>
      </ul>
      <br/>
      <b>🐉 Gamificação</b><br/><br/>
      <ul>
        <li>Uma criatura por domínio de conhecimento</li>
        <li>Três estágios: filhote, jovem e adulto</li>
        <li>Criatura inicial escolhida no cadastro, uma por usuário</li>
        <li>Criaturas evoluem conforme o aluno sobe de nível</li>
      </ul>
    </td>
    <td valign="top" width="50%">
      <b>✍️ Autoria e revisão</b><br/><br/>
      <ul>
        <li>Fluxo editorial: rascunho, revisão, aprovado, publicado</li>
        <li>Autores editam apenas o próprio conteúdo</li>
        <li>Solução de referência nunca vaza pela API pública</li>
        <li>Comando <code>seed_trilhas</code> idempotente para semear conteúdo</li>
      </ul>
      <br/>
      <b>🔒 Acesso e segurança</b><br/><br/>
      <ul>
        <li>Papéis e permissões dinâmicos (RBAC), em dados, não em deploy</li>
        <li>Hash de senha com Argon2</li>
        <li>JWT em cookies httponly, refresh com escopo em <code>/auth/</code></li>
        <li>Verificação de e-mail e links de recuperação de uso único</li>
        <li>Bloqueio de login após tentativas repetidas</li>
      </ul>
    </td>
  </tr>
</table>

---

## `~/começando`

### Backend

```bash
cd backend

python -m venv venv
source venv/bin/activate            # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env                # depois preencha os valores

python manage.py migrate
python manage.py seed_trilhas       # carrega as trilhas e publica "Lógica de Programação"
python manage.py createsuperuser    # o e-mail que ele pede é o login
python manage.py runserver 8000     # → http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install && npm run dev          # → http://localhost:3000
```

O banco usa SQLite por padrão, sem nada para configurar. A documentação interativa
da API (Swagger UI) fica em `http://localhost:8000/api/docs/`, gerada a partir do
mesmo schema em `/api/schema/`.

---

## `~/ambiente`

Crie o `.env` dentro de `backend/`:

```env
# Chave de assinatura do Django
# Gere com: python -c "import secrets; print(secrets.token_urlsafe(50))"
SECRET_KEY=troque-por-uma-chave-longa-e-aleatoria
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
ADMIN_URL=admin/

# Base de todo link enviado por e-mail. É o endereço do FRONTEND, não o da API:
# quem clica num link de verificação ou recuperação cai numa tela.
FRONTEND_URL=http://localhost:3000
```

<details>
<summary><b>Ajustes opcionais</b></summary>
<br/>

```env
# E-mail. Sem um EMAIL_HOST_USER/PASSWORD de verdade, o Django imprime a mensagem
# no console, então os links de verificação e recuperação aparecem no terminal do
# runserver e o desenvolvimento não precisa de SMTP. Os defaults miram o relay da Brevo.
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=2525
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
DEFAULT_FROM_EMAIL=CodeQuest <nao-responda@seu-dominio.com>

# Validade dos links de uso único, em segundos
VERIFICACAO_EMAIL_MAX_AGE=86400     # verificação de e-mail (24h)
REDEFINICAO_SENHA_MAX_AGE=1800      # redefinição de senha (30min)

# Bloqueio de login
LOGIN_MAX_TENTATIVAS=5
LOGIN_BLOQUEIO_SEGUNDOS=900         # 15 minutos

# De onde os sprites das criaturas são servidos
SPRITE_BASE_URL=/criaturas/

# CORS / CSRF (o dev server do Next roda na 3000)
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Throttle nas rotas públicas de catálogo
THROTTLE_CATALOGO=60/min
```

</details>

---

## `~/comandos`

```bash
python manage.py seed_trilhas         # carrega as trilhas (idempotente, pode rodar de novo)
python manage.py migrate              # aplica mudanças de schema
python manage.py createsuperuser      # cria o primeiro admin
python manage.py runserver 8000       # → http://localhost:8000
```

---

## `~/como-funciona`

<details>
<summary><b>Trilhas, o fluxo editorial que protege o conteúdo</b></summary>
<br/>

O conteúdo tem três níveis: uma **Trilha** contém **Aulas** (material em Markdown), e
cada aula contém **Exercícios** (de código ou teóricos, do iniciante ao avançado).
Uma aula pode declarar um pré-requisito, validado para ser outra aula da mesma
trilha, então o mapa de fases nunca aponta para fora da própria trilha.

Nada chega ao aluno por acidente. Cada peça passa por quatro estados editoriais
(rascunho, em revisão, aprovado e publicado) e a API pública só devolve o que está
publicado. Os serializers usam uma allowlist explícita de campos, então a solução de
referência do autor (`solucao_autor`) nunca aparece num payload público: vê-la exige
a permissão `trilhas.view_solution`, por uma rota própria.

O `seed_trilhas` é idempotente. Seu `update_or_create` tem chave `(trilha, slug)` nos
dois níveis, então rodar de novo reaproveita as linhas em vez de duplicá-las.

</details>

<details>
<summary><b>Gamificação, uma criatura por domínio que evolui por nível</b></summary>
<br/>

Existe exatamente uma criatura por domínio de conhecimento (Fundamentos, Scripting,
Compiladas e OO, Web e Dados), garantido por uma constraint de unicidade na coluna do
domínio. Cada uma tem três estágios (filhote, jovem e adulto), e a criatura do aluno
sobe conforme o nível dele cruza os limiares. O estágio só avança, nunca regride.

Dois invariantes mantêm a posse honesta: um usuário só pode ter uma dada criatura uma
vez, e pode ter no máximo uma inicial (a escolhida no cadastro). Os dois são
constraints parciais no banco, não checagens na view. Escolher a inicial é uma única
operação atômica, então uma corrida não entrega duas para ninguém.

</details>

<details>
<summary><b>Acesso, contas, papéis e a segunda camada</b></summary>
<br/>

O login é por e-mail, e as senhas usam hash **Argon2**. No sucesso, a API emite um
par de JWT do SimpleJWT e o guarda em **cookies httponly** (`cq_access`,
`cq_refresh`). O JavaScript nunca toca nos tokens. Um sinalizador `cq_sessao`
separado, sem credencial nenhuma, só deixa a interface supor que há sessão. O cookie
de refresh tem escopo no caminho `/auth/`, então ele viaja só com as rotas que
precisam dele.

O cadastro é aberto, mas contas não verificadas ficam inertes até que o link enviado
por e-mail seja usado, e tanto o link de verificação quanto o de redefinição de senha
são de uso único e com prazo. Logins que falham repetidamente bloqueiam a conta por
uma janela configurável.

As permissões vivem numa tabela, agrupadas em papéis (ALUNO, AUTOR e ADMIN), então
conceder o papel de autor ou a fila de revisão é dado, não deploy. Nenhum papel nasce
com tudo. Acesso total é `is_superuser`, que pula a checagem.

</details>

<details>
<summary><b>API</b></summary>
<br/>

Tudo sob `/api/v1/`. Toda falha responde no mesmo envelope
`{ error: { code, message, details } }`.

| Rota | O que faz |
|---|---|
| `GET /trilhas/` · `/trilhas/{slug}/` | A lista de trilhas publicadas, e uma trilha com seu mapa de fases |
| `GET /exercicios/{trilha_slug}/{exercicio_slug}/` | Um único exercício publicado |
| `GET /criaturas/` | O catálogo de criaturas escolhíveis |
| `GET /eu/criaturas/` | As criaturas do usuário logado |
| `POST /auth/registrar/` | Cria uma conta. **Público** |
| `POST /auth/verificar/` · `/verificar/reenviar/` | Confirma um e-mail, reenvia o link. **Público** |
| `POST /auth/login/` · `/renovar/` · `/sair/` | Entrar, renovar o token, sair |
| `GET /auth/eu/` | Quem está logado |
| `POST /auth/senha/esquecida/` · `/senha/redefinir/` | Recuperação de senha. **Público** |
| `GET /auth/csrf/` · `/auth/documentos/` | Token CSRF e os documentos legais. **Público** |

Docs interativas em `/api/docs/`, schema em `/api/schema/`. Fora as rotas marcadas
como públicas, tudo exige sessão.

</details>

---

## `~/deploy`

Feito para rodar numa **VPS** (DigitalOcean), backend e frontend no mesmo servidor,
não em plataformas serverless. O Django serve a API e o Next serve as telas, com um
proxy reverso (Nginx) na frente e o banco na própria máquina.

```
DigitalOcean Droplet
├── Nginx        # proxy reverso + TLS
├── Django       # gunicorn, API em /api/
├── Next.js      # next start, telas
└── SQLite       # arquivo no disco do droplet
```

---

## `~/testes`

```bash
cd backend && pytest                 # 292 testes
cd frontend && npm test              # 165 testes (Jest + React Testing Library)
```

A suíte do backend cobre a API de conteúdo, o fluxo editorial, a tabela de RBAC e os
fluxos de autenticação, incluindo o que **não** pode funcionar: um link de
redefinição usado duas vezes, conteúdo não publicado vazando pela API, uma solução de
referência chegando a um payload público, e o login bloqueando após tentativas
demais. Nenhum model é registrado no admin do Django, então toda ação administrativa
passa pelas regras de negócio.

---

## `~/stack`

<div align="center">

| Camada | Tecnologias |
|-------|-------------|
| **Backend** | ![Python](https://img.shields.io/badge/Python_3.14-3776AB?style=flat-square&logo=python&logoColor=white) ![Django](https://img.shields.io/badge/Django_6.0-092E20?style=flat-square&logo=django&logoColor=white) ![DRF](https://img.shields.io/badge/DRF-A30000?style=flat-square&logo=django&logoColor=white) ![JWT](https://img.shields.io/badge/SimpleJWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white) ![pytest](https://img.shields.io/badge/pytest-0A9EDC?style=flat-square&logo=pytest&logoColor=white) |
| **Frontend** | ![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=nextdotjs&logoColor=white) ![React](https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white) ![Tailwind](https://img.shields.io/badge/Tailwind_v4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white) ![Jest](https://img.shields.io/badge/Jest-C21325?style=flat-square&logo=jest&logoColor=white) |
| **Banco** | ![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white) |
| **Infra** | ![DigitalOcean](https://img.shields.io/badge/DigitalOcean-0080FF?style=flat-square&logo=digitalocean&logoColor=white) ![Nginx](https://img.shields.io/badge/Nginx-009639?style=flat-square&logo=nginx&logoColor=white) |
| **Docs da API** | ![OpenAPI](https://img.shields.io/badge/drf--spectacular-6BA539?style=flat-square&logo=openapiinitiative&logoColor=white) ![Swagger](https://img.shields.io/badge/Swagger_UI-85EA2D?style=flat-square&logo=swagger&logoColor=black) |

</div>

---

<div align="center">
  <br/>
  <sub>
    Feito por <a href="https://github.com/mj01px"><strong>Mauro Junior</strong></a>
    &nbsp;·&nbsp;
    <a href="https://www.linkedin.com/in/mauroapjunior/">LinkedIn</a>
  </sub>
  <br/><br/>
</div>

---
