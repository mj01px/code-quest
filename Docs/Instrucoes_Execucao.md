# Instruções de Execução e Evidências do CodeQuest

Guia para a orientação testar o sistema, em produção ou na própria máquina.

- **Base:** branch `main`, commit `46af66f` (15/11/2026).
- **Repositório:** https://github.com/mj01px/code-quest

## 1. Ambiente de produção (recomendado)

**Endereço:** https://codequest.dev.br/

O sistema está no ar numa VPS da DigitalOcean. Ele usa o banco de produção, então tudo o que for criado ali (contas, progresso, conteúdo) é real e fica registrado na trilha de auditoria.

### 1.1 Criar a conta

1. Acesse o endereço e clique em cadastrar.
2. Informe e-mail, nickname, senha e data de nascimento, e aceite os Termos de Uso e a Política de Privacidade.
3. Abra o link de confirmação que chega no e-mail informado. Por isso o e-mail precisa ser real.
4. Entre com e-mail e senha e escolha a criatura inicial.

Regras do cadastro:

- idade mínima de 16 anos;
- nickname de 3 a 20 caracteres, só com letras sem acento, números e sublinhado;
- senha que siga a política exibida na própria tela.

### 1.2 Perfis de Autor e de Administrador

Toda conta nova começa como Aluno. Para testar as telas de **Autoria** e **Admin**, use o **usuário de teste fornecido no chat** pela equipe. Nenhuma credencial é escrita neste documento. Outra opção é pedir o perfil de autor pela tela **SER AUTOR** e avisar a equipe para aprovar o pedido.

## 2. As três telas principais

### 2.1 Trilhas (perfil Aluno)

Menu lateral, item **TRILHAS**.

1. Abra a trilha **Lógica de Programação** e clique em iniciar.
2. Na primeira aula, faça a leitura e depois o quiz de fixação.
3. Abra um exercício de código e escreva a solução no editor.
   - **Rodar o código:** executa contra os casos de teste visíveis e mostra a saída no terminal. Não dá XP.
   - **Enviar para correção:** corrige contra todos os casos, inclusive os ocultos. Se todos passarem, o exercício é concluído e o XP vai para a criatura ativa.
4. Tente colar um código no editor (Ctrl+V). O editor bloqueia a colagem e mostra o aviso do **Warden**, pedindo que a solução seja digitada.
5. Repita o envio de um exercício já concluído: o sistema não credita XP de novo.
6. Confira o resultado em **CRIATURA** (XP, nível, evolução), **RANKING** e **CONQUISTAS**.

Cada aluno tem 10 correções pagas por dia no Judge0. Ao atingir o limite, a tela avisa e a correção volta no dia seguinte.

### 2.2 Autoria (perfil Autor)

Menu lateral, item **AUTORIA**.

1. Clique em **+ NOVA AULA** e monte o texto pelo editor de seções. A prévia **COMO O ALUNO VÊ** mostra o resultado enquanto você digita.
2. Salve como rascunho e depois envie para revisão.
3. Abra a aba **Meus Conteúdos**: ela lista tudo o que a sua conta criou, em qualquer estado.
4. Edite um conteúdo já aprovado ou publicado. A edição volta para revisão e não aparece aos alunos até ser aprovada de novo.

Regras do fluxo editorial:

- O caminho é sempre `Rascunho`, `Em revisão`, `Aprovado` e `Publicado`.
- Quem criou o conteúdo não pode aprová-lo, nem sendo administrador (regra dos quatro olhos).
- Publicar é exclusivo do administrador.

### 2.3 Admin (perfil Administrador)

Menu lateral, item **ADMIN**.

1. **Painel de indicadores:** escolha o período e veja alunos ativos por dia, submissões por dia, funil por trilha e distribuição de sequências.
2. **Pedidos para ser autor:** aprovar ou rejeitar (a rejeição exige motivo).
3. **Revisão de conteúdo** (em **AUTORIA**, fila **Aguardando Revisão**): abra um item editado e veja o diff, com o que entrou em verde e o que saiu em vermelho riscado. Depois aprove ou devolva com parecer e, se aprovado, publique.
4. **Níveis de acesso e Usuários:** crie níveis com permissões, atribua níveis, suspenda ou reative contas.
5. **Auditoria:** filtre por ação e por período (**DE** e **ATÉ**). A própria consulta também fica registrada.

## 3. Ambiente local

Requisitos: Git, Python 3.14, Node.js 24 e PostgreSQL. A opção A é a mais simples para avaliar o código.

### 3.1 Opção A: `runserver` e `npm run dev`

**Banco** (uma vez; troque `sua-senha` por uma senha local qualquer):

```bash
psql postgres -c "CREATE ROLE codequest WITH LOGIN PASSWORD 'sua-senha' CREATEDB;"
psql postgres -c "CREATE DATABASE codequest OWNER codequest;"
```

**Backend** (porta 8000):

```bash
git clone https://github.com/mj01px/code-quest.git
cd code-quest/backend
python -m venv venv
venv\Scripts\activate                # Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
copy .env.example .env               # Linux/macOS: cp .env.example .env
```

No `.env`, preencha ao menos:

- `SECRET_KEY` (gere com `python -c "import secrets; print(secrets.token_urlsafe(50))"`);
- `DATABASE_URL`, no formato `postgres://codequest:sua-senha@localhost:5432/codequest`.

Depois rode as migrações e as cargas de conteúdo, nesta ordem, porque cada carga depende da anterior:

```bash
python manage.py migrate
python manage.py seed_trilhas
python manage.py seed_licoes
python manage.py seed_desafios
python manage.py seed_bonus_xp
python manage.py seed_correcao
```

Para criar o administrador no nível de acesso "Admin", defina as variáveis só na sessão do terminal, com uma senha escolhida na hora (PowerShell):

```powershell
$env:ADMIN_EMAIL="<seu-email>"; $env:ADMIN_NICKNAME="<seu-nickname>"; $env:ADMIN_PASSWORD="<senha-escolhida-agora>"
python manage.py criar_admin
python manage.py runserver 8000
```

**Frontend** (porta 3000), em outro terminal:

```bash
cd code-quest/frontend
npm install
npm run dev
```

Acesse http://localhost:3000. O Next encaminha `/api/*` ao Django na porta 8000.

Diferenças em relação à produção:

- **E-mail:** sem SMTP configurado, os e-mails de verificação e de recuperação são impressos no terminal do `runserver`. Copie o link de lá.
- **Correção automática:** sem `JUDGE0_URL` e `JUDGE0_TOKEN` no `.env`, Rodar e Enviar respondem 503 e a tela mostra o aviso de serviço indisponível. O resto da plataforma funciona normalmente. Para corrigir código localmente, é preciso uma chave do Judge0, que a equipe pode fornecer pelo chat.
- **Documentação da API:** fica em http://localhost:8000/api/docs/ quando `DEBUG=True` ou `API_DOCS=True`.

### 3.2 Opção B: Docker Compose

O `docker-compose.yml` sobe a pilha de produção: Nginx, Next.js, Django com Gunicorn e PostgreSQL 18. Por isso, `docker compose up -d --build` sozinho não funciona: o Compose exige o arquivo de variáveis de produção e o Nginx exige o certificado TLS.

1. Copie `.env.prod.example` (na raiz) para `.env.prod` e preencha conforme os comentários do arquivo. No primeiro deploy, use `RODAR_SEEDS=1` e as variáveis `ADMIN_*`.
2. Coloque `origin.pem` e `origin.key` em `deploy/certs/`. Em produção são os certificados de origem da Cloudflare; localmente, sirva um certificado autoassinado.
3. Suba a pilha:

```bash
docker compose --env-file .env.prod up -d --build
```

4. Depois da primeira subida, volte `RODAR_SEEDS=0` e apague `ADMIN_PASSWORD` do `.env.prod`.

## 4. Evidências

### 4.1 Testes automatizados

Os resultados abaixo são da execução local de 15/11/2026.

| Suíte | Comando | Resultado |
|---|---|---|
| Backend (pytest) | `cd backend && pytest` | 1.413 testes aprovados, 0 falhas, 98% de cobertura |
| Frontend (Jest) | `cd frontend && npm test` | 638 testes aprovados em 88 suítes |

O backend precisa do PostgreSQL rodando, porque parte dos testes de integração depende dele. Nos testes, o Judge0 é substituído por um executor local, então a suíte não gasta cota nem precisa de rede.

### 4.2 Integração contínua

Na aba **Actions** do repositório, o workflow de CI (`.github/workflows/ci.yml`) roda a cada pull request:

- três jobs em paralelo: `unitarios`, `integracao` e `linter`;
- depois deles, o build do frontend.

### 4.3 Documentos de apoio

| Documento | O que mostra |
|---|---|
| `Docs/Manual_do_Usuario.md` | Uso da plataforma pelos perfis Aluno, Autor e Administrador |
| `Docs/Rastreabilidade_Requisitos.md` | Onde cada RF e RNF está no código, com arquivo e linha |
| `Docs/Rastreabilidade_Regras_Negocio.md` | Onde cada regra de negócio está no código |
| `Docs/Cheat_Sheet_Banca.md` | Perguntas prováveis da banca, números do sistema, rotas da API e telas |
| `Docs/Relatorio_Acompanhamento_16-11.md` | O que mudou desde a entrega de 09/11 |
