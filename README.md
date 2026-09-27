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
  backend:     ["Python 3.14", "Django 6.0", "Django REST Framework", "SimpleJWT", "PostgreSQL", "Judge0", "pytest"],
  frontend:    ["Next.js 16", "React 19", "TypeScript", "Tailwind CSS v4", "Jest + RTL"],
  recursos:    ["Trilhas de aprendizado", "Fluxo editorial", "Correção automática de código", "XP e progressão no servidor", "Criaturas companheiras", "RBAC dinâmico", "2FA", "LGPD e auditoria"],
  auth:        "JWT em cookie, Argon2, 2FA opcional, cadastro aberto a partir de 16 anos com confirmação de e-mail",
  autores:       "Mauro Junior, github.com/mj01px", "Julio Franz,  github.com/JulioFranz", "Arthur Sabino, github.com/ArthurS357"
} as const;
```

O **CodeQuest** transforma aprender a programar em uma jornada. O conteúdo é
organizado em **trilhas**, feitas de aulas e exercícios, e cada aluno escolhe uma
**criatura** que ganha XP com os exercícios e pode evoluir quando o nível permite. Ele
resolve as duas coisas de que uma plataforma para iniciantes depende: manter o
material coerente e confiável, e dar ao aluno um motivo para voltar à próxima fase.

As trilhas passam por um fluxo editorial antes de qualquer um vê-las, então nada pela
metade chega ao aluno. O progresso vive no servidor: cada conclusão vira um evento de
XP no banco, creditado uma única vez, e os exercícios de código são corrigidos pelo
**Judge0** contra casos de teste, alguns deles ocultos. As contas são protegidas de
ponta a ponta: hash com Argon2, JWT em cookies httponly, verificação de e-mail, 2FA
opcional e uma tabela de permissões que vive em dados, não no código. Os direitos do
titular previstos na LGPD (ver a própria atividade, exportar os dados e excluir a
conta) têm rota própria, e os eventos sensíveis ficam numa trilha de auditoria.

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
        <li>Progresso, XP e conclusões guardados no banco, não no navegador</li>
        <li>Trilhas iniciadas e exercícios concluídos consultados pela API</li>
      </ul>
      <br/>
      <b>🐉 Gamificação</b><br/><br/>
      <ul>
        <li>Uma criatura por domínio de conhecimento</li>
        <li>Três estágios: filhote, jovem e adulto</li>
        <li>Criatura inicial escolhida no cadastro, outras adquiridas depois, uma ativa por vez</li>
        <li>XP por dificuldade (50, 100 ou 200), creditado só à criatura ativa</li>
        <li>Bônus de XP na trilha do domínio da criatura (<code>seed_bonus_xp</code>)</li>
        <li>O nível libera o próximo estágio, e o aluno decide quando evoluir</li>
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
        <li>Níveis de acesso e permissões dinâmicos (RBAC), com painel de admin</li>
        <li>Hash de senha com Argon2</li>
        <li>JWT em cookies httponly, refresh com escopo em <code>/auth/</code></li>
        <li>Verificação de e-mail e links de recuperação de uso único</li>
        <li>2FA opcional por app autenticador (TOTP) ou código por e-mail</li>
        <li>Troca de e-mail confirmada no endereço atual e no novo</li>
        <li>Bloqueio de login após tentativas repetidas</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td valign="top" width="50%">
      <b>🧪 Correção de código</b><br/><br/>
      <ul>
        <li>Exercícios de Python corrigidos pelo <b>Judge0</b>, sem rede e com teto de CPU e memória</li>
        <li><i>Executar</i> roda os casos visíveis, <i>Enviar</i> roda todos e só diz se os ocultos passaram</li>
        <li>Análise da AST antes da chamada: sintaxe, função esperada, construções exigidas ou proibidas</li>
        <li>Cache de submissão idêntica e cota diária por usuário e global</li>
        <li>Casos de teste semeados pelo comando <code>seed_correcao</code></li>
      </ul>
    </td>
    <td valign="top" width="50%">
      <b>⚖️ Privacidade e LGPD</b><br/><br/>
      <ul>
        <li>Cadastro a partir de 16 anos, com aceite versionado dos termos e da privacidade</li>
        <li>Histórico da própria atividade na conta</li>
        <li>Exportação dos dados pessoais em JSON</li>
        <li>Exclusão por anonimização, confirmada por e-mail e senha</li>
        <li>Trilha de auditoria append-only, purgada após o prazo de retenção</li>
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

cp .env.example .env                # depois preencha os valores (inclui DATABASE_URL)

python manage.py migrate
python manage.py seed_trilhas       # carrega as trilhas e publica Lógica de Programação, Python e Banco de Dados
python manage.py seed_bonus_xp      # cadastra os bônus de XP por trilha
python manage.py seed_correcao      # cadastra os casos de teste da correção automática
python manage.py createsuperuser    # o e-mail que ele pede é o login
python manage.py runserver 8000     # → http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install && npm run dev          # → http://localhost:3000
```

O banco é **PostgreSQL**. Com o Postgres rodando, crie a role e o banco uma vez
antes do `migrate` e aponte o `DATABASE_URL` do `.env` para eles:

```bash
psql postgres -c "CREATE ROLE codequest WITH LOGIN PASSWORD 'sua-senha' CREATEDB;"
psql postgres -c "CREATE DATABASE codequest OWNER codequest;"
```

A `CREATEDB` na role deixa o `pytest` criar o banco de testes. A documentação
interativa da API (Swagger UI) fica em `http://localhost:8000/api/docs/`, gerada a
partir do mesmo schema em `/api/schema/`.

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

# Banco PostgreSQL: postgres://USUARIO:SENHA@HOST:PORTA/NOME
DATABASE_URL=postgres://codequest:sua-senha@localhost:5432/codequest

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
EMAIL_USE_TLS=True
EMAIL_TIMEOUT=10
DEFAULT_FROM_EMAIL=CodeQuest <nao-responda@seu-dominio.com>
# Opcional. Comentado, escolhe sozinho: SMTP se houver EMAIL_HOST_USER, senão console.
# EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend

# Validade dos links de uso único, em segundos. Comentário sempre na linha de
# cima: o django-environ não corta "# ..." no fim da linha e o valor deixa de ser
# um número.
# Verificação de e-mail (24h) e redefinição de senha (30min)
VERIFICACAO_EMAIL_MAX_AGE=86400
REDEFINICAO_SENHA_MAX_AGE=1800

# Bloqueio de login: tentativas e duração do bloqueio (15min)
LOGIN_MAX_TENTATIVAS=5
LOGIN_BLOQUEIO_SEGUNDOS=900

# De onde os sprites das criaturas são servidos
SPRITE_BASE_URL=/criaturas/

# CORS / CSRF (o dev server do Next roda na 3000)
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Throttle nas rotas públicas de catálogo
THROTTLE_CATALOGO=60/min

# Correção automática (Judge0). Sem URL e token, executar e enviar código
# respondem 503 e o resto da plataforma segue funcionando. Uma URL da RapidAPI
# manda a chave em X-RapidAPI-Key; qualquer outra, em X-Auth-Token.
# O limite diário é a cota do plano (novas chamadas param em 90% dela), e o por
# usuário conta só chamadas pagas no dia.
JUDGE0_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_TOKEN=
JUDGE0_TIMEOUT=15
JUDGE0_LIMITE_DIARIO=50
JUDGE0_LIMITE_POR_USUARIO=10

# 2FA, em segundos: validade do código por e-mail (10min) e janela entre a senha
# e o 2º fator no login (5min)
MFA_EMAIL_CODIGO_MAX_AGE=600
MFA_LOGIN_TOKEN_MAX_AGE=300

# Validade do link que confirma a exclusão da conta, em segundos (30min)
EXCLUSAO_TOKEN_MAX_AGE=1800

# Dias que um registro de auditoria vive antes do purgar_logs_antigos
AUDITORIA_RETENCAO_DIAS=180
```

</details>

---

## `~/comandos`

```bash
python manage.py seed_trilhas         # carrega as trilhas (idempotente, pode rodar de novo)
python manage.py seed_bonus_xp        # bônus de XP de cada criatura na trilha do seu domínio (idempotente)
python manage.py seed_correcao        # especificações e casos de teste da correção (rode depois do seed_trilhas)
python manage.py purgar_logs_antigos  # apaga auditoria além de AUDITORIA_RETENCAO_DIAS (--dry-run só conta)
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
<summary><b>Correção de código, o Judge0 atrás de uma porta estreita</b></summary>
<br/>

Um exercício de código pode ter uma **especificação**: a linguagem (hoje, Python), o
nome da função que o aluno precisa definir, um código inicial e os casos de teste,
cada um visível ou oculto. O código do aluno vai ao **Judge0** junto de um harness que
chama a função com os argumentos de cada caso, sem rede e com teto de CPU, de tempo e
de memória.

Há dois modos. *Executar* roda só os casos visíveis e devolve a saída e o erro, para
o aluno depurar. *Enviar* roda todos, e dos ocultos conta apenas se passaram, sem
argumentos nem resultado. O envio aprovado é o que conclui o exercício e credita o
XP, pela mesma rota de conclusão dos exercícios sem código.

Antes de gastar uma chamada, o código passa por uma análise da AST: erro de sintaxe,
função ausente e construções exigidas ou proibidas pelo exercício (um `for`, um
`import`) param ali. Um código idêntico corrigido nos últimos 10 minutos reaproveita
o resultado guardado. Só as chamadas pagas contam na cota, que vive no banco: um teto
diário por usuário (429) e um disjuntor global que para em 90% da cota do plano
(503), além de uma rajada de 5 chamadas por minuto por usuário. Se o Judge0 cai ou
não está configurado, a API responde 503.

</details>

<details>
<summary><b>Gamificação, criaturas que ganham XP e evoluem quando o aluno quer</b></summary>
<br/>

Existe exatamente uma criatura por domínio de conhecimento (Fundamentos, Scripting,
Compiladas e OO, Web e Dados), garantido por uma constraint de unicidade na coluna do
domínio. Cada uma tem três estágios (filhote, jovem e adulto), e cada estágio exige
um nível mínimo.

O XP é por criatura, não por conta: só a criatura **ativa** recebe crédito, e uma
criatura recém-adquirida começa no nível 1 mesmo numa conta adiantada. Um exercício
vale 50, 100 ou 200 XP conforme a dificuldade, multiplicado pelo bônus da trilha
quando há um (o `seed_bonus_xp` dá XP em dobro na trilha do domínio da criatura). O
valor sai sempre do servidor, nenhuma rota aceita XP vindo do cliente, e cada
exercício credita uma vez só por conta: concluir de novo responde `ja_concluido` sem
somar nada. A soma e a subida de nível acontecem no banco, com a linha travada, então
dois pedidos simultâneos não perdem incremento.

Evoluir não é automático. Quando o nível alcança o próximo estágio, a conclusão avisa
(`pode_evoluir`) e o aluno escolhe a hora, um estágio por vez, então quem chega ao
topo ainda em filhote passa por jovem antes de adulto. O estágio só avança, nunca
regride.

Três invariantes mantêm a posse honesta: um usuário só pode ter uma dada criatura uma
vez, no máximo uma inicial (a escolhida no cadastro) e no máximo uma ativa. Os três
são constraints no banco, não checagens na view. Escolher a inicial é uma única
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

O cadastro é aberto a partir de **16 anos** (a data de nascimento é conferida no
servidor) e exige o aceite da versão vigente dos Termos de Uso e da Política de
Privacidade. Contas não verificadas ficam inertes até que o link enviado por e-mail
seja usado, e tanto o link de verificação quanto o de redefinição de senha são de uso
único e com prazo. Logins que falham repetidamente bloqueiam a conta por uma janela
configurável.

O **2FA** é opcional e tem um método ativo por vez: app autenticador (TOTP, ativado
por QR code) ou código enviado por e-mail. Ao ativar, o aluno recebe 8 códigos de
recuperação de uso único, que valem para qualquer método. Com o 2FA ligado, o login
vira dois passos: a senha certa devolve só um `mfa_token` de vida curta, e a sessão
sai em `/auth/login/mfa/` depois do segundo fator. Desligar o 2FA também exige um
código válido.

Trocar o e-mail pede a senha atual e duas confirmações: um link no endereço atual
autoriza a troca, e um segundo link, no endereço novo, prova que ele é do titular. Só
então o e-mail muda. Até lá, login, 2FA e recuperação de senha seguem no endereço
antigo.

As permissões vivem numa tabela e são agrupadas em **níveis de acesso**. Cada conta
nasce no nível de sistema do seu papel (Aluno, Autor ou Admin) e tem exatamente as
permissões do nível, admin inclusive: nem o papel nem o `is_superuser` dão atalho,
então rebaixar o nível de alguém de fato o rebaixa. O painel de RBAC (`/admin` no
frontend) cria e edita níveis e os atribui a usuários, e o acesso ao próprio painel
vem de uma marca no nível (`acesso_admin`), não do papel. Conceder autoria ou a fila
de revisão é dado, não deploy.

</details>

<details>
<summary><b>Privacidade, os direitos do titular e a trilha de auditoria</b></summary>
<br/>

Os eventos sensíveis (login e falha de login, cadastro, redefinição de senha, troca
de e-mail, 2FA, exportação, exclusão, mudanças nos níveis de acesso) vão para uma
**trilha de auditoria** append-only: o `save()` recusa alterar um registro já
gravado. Quem tem `auditoria.view` consulta tudo em `/auditoria/`, e a própria
consulta também fica registrada. Cada titular vê só as próprias linhas, filtradas às
ações que dizem respeito a ele, na seção de atividade da conta. O comando
`purgar_logs_antigos` apaga o que passou de `AUDITORIA_RETENCAO_DIAS` (180 por
padrão) e foi feito para rodar por cron.

A exportação devolve em JSON os dados pessoais do titular. A exclusão tem dois
passos: um pedido autenticado manda um link por e-mail, e esse link, junto com a
senha, anonimiza a conta na hora e encerra a sessão. Anonimizar embaralha os dados
pessoais e apaga os derivados (o e-mail guardado na auditoria e o IP dos aceites),
mas mantém os agregados e a prova de aceite dos termos. Quando os Termos ou a
Política de Privacidade mudam de versão, a API aponta o documento pendente e registra
o novo aceite.

</details>

<details>
<summary><b>API</b></summary>
<br/>

Tudo sob `/api/v1/`. Toda falha responde no mesmo envelope
`{ error: { code, message, details } }`. Fora as rotas marcadas como públicas, tudo
exige sessão, e a permissão do RBAC que a rota pede, quando pede, vem entre
parênteses.

**Conteúdo**

| Rota | O que faz |
|---|---|
| `GET /trilhas/` · `/trilhas/{slug}/` | A lista de trilhas publicadas, e uma trilha com seu mapa de fases. **Público** |
| `GET /exercicios/{trilha_slug}/{exercicio_slug}/` | Um único exercício publicado. **Público** |
| `GET /autoria/exercicios/{trilha_slug}/{exercicio_slug}/solucao/` | A solução de referência do autor (`trilhas.view_solution`) |

**Progressão**

| Rota | O que faz |
|---|---|
| `GET /eu/progresso/` | XP e nível da criatura ativa, com quanto falta para o próximo (204 sem criatura ativa) |
| `POST /trilhas/{slug}/iniciar/` | Marca a trilha como iniciada: 201 na primeira vez, 200 nas seguintes (`trilhas.enroll`) |
| `GET /eu/trilhas/` | Os slugs das trilhas que o aluno já iniciou |
| `GET /eu/exercicios-concluidos/` | As conclusões do aluno, com filtro opcional `?trilha={slug}` |
| `POST /exercicios/{trilha_slug}/{exercicio_slug}/concluir/` | Conclui o exercício e credita o XP. Com correção automática, recebe o `codigo` e só credita se o envio passar (`exercicios.complete`, e `submissoes.create` quando há código) |

**Correção de código**

| Rota | O que faz |
|---|---|
| `GET /exercicios/{trilha_slug}/{exercicio_slug}/codigo/` | A especificação: função, código inicial, requisitos e os casos visíveis (`submissoes.create`) |
| `POST /exercicios/{trilha_slug}/{exercicio_slug}/executar/` | Roda o `codigo` no Judge0 contra os casos visíveis, sem creditar XP (`submissoes.create`) |

**Criaturas**

| Rota | O que faz |
|---|---|
| `GET /criaturas/` | O catálogo de criaturas. **Público** |
| `GET` · `POST /eu/criaturas/` | As criaturas do usuário (`criaturas.view`), e a escolha da inicial (`criaturas.acquire`) |
| `POST /eu/criaturas/adquirir/` | Adquire outra criatura do catálogo (`criaturas.acquire`) |
| `GET` · `PUT /eu/criaturas/ativa/` | A criatura ativa, e a troca de qual recebe o XP (`criaturas.view`) |
| `POST /eu/criaturas/{slug}/evoluir/` | Sobe a criatura um estágio, se o nível dela permitir (`criaturas.evolve`) |
| `GET /eu/bonus/` | Os bônus de XP que valem para as criaturas do usuário (`criaturas.view`) |

**Conta e sessão**

| Rota | O que faz |
|---|---|
| `POST /auth/registrar/` | Cria uma conta, com data de nascimento e as versões aceitas dos documentos. **Público** |
| `POST /auth/verificar/` · `/verificar/reenviar/` | Confirma um e-mail, reenvia o link. **Público** |
| `POST /auth/login/` · `/login/mfa/` | Entrar, e o segundo passo quando há 2FA. **Público** |
| `POST /auth/renovar/` · `/sair/` | Renovar o token pelo cookie de refresh, sair. **Público** |
| `GET` · `PATCH /auth/eu/` | Quem está logado, e a troca do nickname |
| `POST /auth/eu/email/` | Pede a troca de e-mail, com a senha atual |
| `POST /auth/eu/email/confirmar/` | Confirma cada etapa da troca com o token do link. **Público** |
| `POST /auth/senha/esquecida/` · `/senha/redefinir/` | Recuperação de senha. **Público** |
| `GET /auth/csrf/` · `/auth/documentos/` | Token CSRF e os documentos legais. **Público** |

**2FA**

| Rota | O que faz |
|---|---|
| `GET /auth/eu/mfa/` | Se o 2FA está ativo, e por qual método |
| `POST /auth/eu/mfa/iniciar/` · `/mfa/confirmar/` | Prepara o método (QR code do app ou código por e-mail) e o ativa com um código válido, devolvendo os códigos de recuperação |
| `POST /auth/eu/mfa/desativar/iniciar/` · `/mfa/desativar/` | Manda o código por e-mail quando o método é e-mail, e desativa com um código válido ou de recuperação |

**Privacidade (LGPD)**

| Rota | O que faz |
|---|---|
| `GET /auth/eu/atividade/` | O histórico do próprio titular, paginado |
| `GET /auth/eu/exportar/` | Os dados pessoais do titular, em JSON |
| `GET /auth/eu/consentimentos/` · `POST /consentimentos/aceitar/` | A versão vigente e a aceita de cada documento, e o aceite das pendentes |
| `POST /auth/eu/excluir/` | Manda por e-mail o link que confirma a exclusão |
| `POST /auth/eu/excluir/confirmar/` | Com o token do link e a senha, anonimiza a conta. **Público** |

**Administração**

| Rota | O que faz |
|---|---|
| `GET /auditoria/` | A trilha de auditoria, com filtros `acao`, `actor`, `desde` e `ate` (`auditoria.view`) |
| `GET /auth/admin/permissoes/` | O catálogo de permissões concedíveis |
| `/auth/admin/niveis/` · `/niveis/{id}/` | Lista, cria, edita e remove níveis de acesso |
| `GET /auth/admin/usuarios/` · `PATCH /usuarios/{id}/nivel/` | Os usuários, e a atribuição de nível a um deles |

As rotas `/auth/admin/` exigem um nível com `acesso_admin`. Docs interativas em
`/api/docs/`, schema em `/api/schema/`.

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
└── PostgreSQL   # banco relacional no droplet
```

---

## `~/testes`

```bash
cd backend && pytest                 # 650 testes, mais 504 subtests
cd frontend && npm test              # 281 testes (Jest + React Testing Library)
```

A suíte do backend cobre a API de conteúdo, o fluxo editorial, a tabela de RBAC, os
fluxos de autenticação, o 2FA, a troca de e-mail, os direitos da LGPD, a auditoria, o
crédito de XP e a correção de código, incluindo o que **não** pode funcionar: um link
de redefinição usado duas vezes, conteúdo não publicado vazando pela API, uma
solução de referência chegando a um payload público, o login bloqueando após
tentativas demais, um crédito de XP apagando o que outro pedido gravou no meio do
caminho e um aluno estourando a cota do Judge0. Nos testes, o Judge0 dá lugar a um
executor Python local, então a suíte não gasta cota nem precisa de rede. Nenhum model é registrado no admin do Django, então toda ação administrativa
passa pelas regras de negócio.

---

## `~/stack`

<div align="center">

| Camada | Tecnologias |
|-------|-------------|
| **Backend** | ![Python](https://img.shields.io/badge/Python_3.14-3776AB?style=flat-square&logo=python&logoColor=white) ![Django](https://img.shields.io/badge/Django_6.0-092E20?style=flat-square&logo=django&logoColor=white) ![DRF](https://img.shields.io/badge/DRF-A30000?style=flat-square&logo=django&logoColor=white) ![JWT](https://img.shields.io/badge/SimpleJWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white) ![pytest](https://img.shields.io/badge/pytest-0A9EDC?style=flat-square&logo=pytest&logoColor=white) |
| **Frontend** | ![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=nextdotjs&logoColor=white) ![React](https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white) ![Tailwind](https://img.shields.io/badge/Tailwind_v4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white) ![Jest](https://img.shields.io/badge/Jest-C21325?style=flat-square&logo=jest&logoColor=white) |
| **Banco** | ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white) |
| **Infra** | ![DigitalOcean](https://img.shields.io/badge/DigitalOcean-0080FF?style=flat-square&logo=digitalocean&logoColor=white) ![Nginx](https://img.shields.io/badge/Nginx-009639?style=flat-square&logo=nginx&logoColor=white) |
| **Docs da API** | ![OpenAPI](https://img.shields.io/badge/drf--spectacular-6BA539?style=flat-square&logo=openapiinitiative&logoColor=white) ![Swagger](https://img.shields.io/badge/Swagger_UI-85EA2D?style=flat-square&logo=swagger&logoColor=black) |

</div>

---
