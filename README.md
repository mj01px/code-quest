<p align="center">
  <img src="Docs/readme/banner.png" alt="CodeQuest: aprenda a programar como quem joga. Ao lado, o dragão Blaze adulto, a tartaruga e a cobra filhotes, e um terminal mostrando 6 de 6 testes passando e +100 XP." width="100%">
</p>

<p align="center">
  Uma <b>plataforma gamificada</b> para aprender a programar:<br>
  trilhas com aulas e exercícios, e uma <b>criatura</b> que evolui junto com você.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Django-6.0-A855F7?labelColor=555" alt="Django 6.0">
  <img src="https://img.shields.io/badge/Next.js-16-A855F7?labelColor=555" alt="Next.js 16">
  <img src="https://img.shields.io/badge/PostgreSQL-banco-6D28D9?labelColor=555" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/corre%C3%A7%C3%A3o-Judge0-A855F7?labelColor=555" alt="Correção: Judge0">
  <img src="https://img.shields.io/badge/LGPD-exportar%20e%20excluir-6D28D9?labelColor=555" alt="LGPD: exportar e excluir">
</p>

## A jornada

<img src="Docs/readme/jornada.png" alt="Como a jornada funciona: 1, escolha sua criatura, uma por área. 2, resolva no navegador, com o código corrigido na hora contra testes, alguns ocultos. 3, ganhe XP e evolua: filhote, jovem e adulto, e você decide quando evoluir. A regra da casa: só vira trilha o que foi escrito, testado e revisado." width="100%">

| Criatura | Domínio |
|---|---|
| Tartaruga (Shellby) | Fundamentos |
| Cobra (Slyth) | Python e Scripting |
| Dragão (Blaze) | Compiladas e OO |
| Raposa | Web |
| Elefante | Dados |

## A plataforma

Antes de qualquer aluno ver uma trilha, ela passa por um **fluxo editorial**, então nada pela metade chega a quem está estudando. O progresso vive no servidor: cada conclusão vira um evento de XP no banco, creditado uma única vez, e os exercícios de código são corrigidos pelo **Judge0** contra casos de teste, alguns deles ocultos.

<img src="Docs/readme/vitrine.png" alt="Aprenda, rode e evolua: a tela do exercício com o enunciado, o editor e o terminal lado a lado, com a correção na hora." width="100%">

- **Trilhas:** aulas em Markdown e exercícios de código ou teóricos, por dificuldade, com pré-requisito entre aulas e um mapa de fases com "continuar de onde parou".
- **Aulas, quiz e flashcards:** cada lição tem leitura, um quiz no fim e um baralho de flashcards para revisar o módulo, e a trilha termina numa tela de quest concluída.
- **Perfil:** XP total, sequência, recorde e a vitrine de conquistas de cada aluno.
- **Correção automática:** *Executar* roda os casos visíveis para o aluno depurar, *Enviar* roda todos e só diz se os ocultos passaram.
- **Criaturas:** XP por dificuldade (50, 100 ou 200), creditado só à criatura ativa, com bônus na trilha do domínio dela.
- **Sequência:** dias seguidos de estudo, com o recorde guardado.
- **Desafio do dia:** exercícios de código próprios, separados das trilhas, com um novo a cada dia.
- **Conquistas:** 13 medalhas, algumas ocultas até serem desbloqueadas, com aviso na hora.
- **Ranking mensal:** o top 10 do XP ganho no mês e a sua posição, com pódio guardado e conquistas para quem sobe nele.
- **Clãs:** grupos públicos ou privados com bandeira, líder, co-líderes e link de convite.
- **Autoria e revisão:** autores escrevem, revisores aprovam ou devolvem, e só o que foi publicado aparece.
- **Painel de admin:** métricas da plataforma, níveis de acesso e usuários.

## Pensado para proteger quem estuda

- **Contas protegidas de ponta a ponta:** hash com Argon2, JWT em cookies httponly, verificação de e-mail, 2FA opcional e bloqueio após tentativas repetidas.
- **Permissões em dados, não no código:** níveis de acesso (RBAC) editáveis no painel, sem atalho para admin nem para `is_superuser`.
- **LGPD:** o titular vê a própria atividade, exporta os dados em JSON e exclui a conta. Os eventos sensíveis ficam numa trilha de auditoria.
- **Cadastro a partir de 16 anos**, com aceite versionado dos Termos de Uso e da Política de Privacidade.

## Rodando o projeto

```
code-quest/
├── backend/     # API REST Django       →  http://localhost:8000
└── frontend/    # Next.js App Router     →  http://localhost:3000
```

**Backend**

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

**Frontend**

```bash
cd frontend
npm install && npm run dev          # → http://localhost:3000
```

O banco é **PostgreSQL**. Com o Postgres rodando, crie a role e o banco uma vez antes do `migrate` e aponte o `DATABASE_URL` do `.env` para eles:

```bash
psql postgres -c "CREATE ROLE codequest WITH LOGIN PASSWORD 'sua-senha' CREATEDB;"
psql postgres -c "CREATE DATABASE codequest OWNER codequest;"
```

A `CREATEDB` na role deixa o `pytest` criar o banco de testes. A documentação interativa da API (Swagger UI) fica em `http://localhost:8000/api/docs/`, gerada a partir do mesmo schema em `/api/schema/`.

<details>
<summary><b>Variáveis de ambiente</b></summary>
<br>

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

**Ajustes opcionais**

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

# Dias que um registro de auditoria vive antes do limpar_auditoria
AUDITORIA_RETENCAO_DIAS=180

# Clãs: máximo de membros e validade do link de convite, em dias
CLA_LIMITE_MEMBROS=50
CLA_CONVITE_VALIDADE_DIAS=7
```

</details>

<details>
<summary><b>Comandos</b></summary>
<br>

```bash
python manage.py seed_trilhas           # carrega as trilhas (idempotente, pode rodar de novo)
python manage.py seed_bonus_xp          # bônus de XP de cada criatura na trilha do seu domínio (idempotente)
python manage.py seed_correcao          # especificações e casos de teste da correção (rode depois do seed_trilhas)
python manage.py reavaliar_conquistas   # reavalia as conquistas de todos os alunos ativos
python manage.py fechar_podios          # grava o pódio dos meses que já viraram (--meses N)
python manage.py limpar_auditoria       # apaga auditoria além de AUDITORIA_RETENCAO_DIAS (--dry-run só conta)
python manage.py migrate                # aplica mudanças de schema
python manage.py createsuperuser        # cria o primeiro admin
python manage.py runserver 8000         # → http://localhost:8000
```

</details>

<details>
<summary><b>Estrutura das pastas</b></summary>
<br>

```
backend/
├── config/        settings e rotas da API (/api/v1/, /api/schema/, /api/docs/)
├── apps/
│   ├── contas/        cadastro, login, 2FA, troca de e-mail, RBAC e LGPD
│   ├── trilhas/       trilhas, aulas e exercícios, com o fluxo editorial
│   ├── autoria/       rascunhos, fila de revisão e transições editoriais
│   ├── correcao/      especificações, casos de teste e a ponte com o Judge0
│   ├── progressao/    XP, conclusões, sequência e o dashboard do admin
│   ├── gamificacao/   criaturas, estágios e bônus de XP
│   ├── conquistas/    catálogo de conquistas e o que cada aluno desbloqueou
│   ├── ranking/       placar mensal e pódios
│   ├── clas/          clãs, membros, cargos e convites
│   ├── auditoria/     trilha de auditoria append-only
│   └── core/          autenticação por cookie, permissões, erros e middleware
└── tests/

frontend/
├── src/app/          as telas (trilhas, exercício, criatura, desafios, ranking,
│                     clãs, conquistas, autoria, admin, configurações, legais)
├── src/components/   um diretório por área, com os testes em __tests__/
└── public/           sprites das criaturas, bandeiras dos clãs e a marca

nginx/                proxy reverso de produção
docker-compose.yml    sobe tudo junto
Docs/                 requisitos, termos de aceite, integração da API e as imagens deste README
```

</details>

## Como funciona

<details>
<summary><b>Trilhas, o fluxo editorial que protege o conteúdo</b></summary>
<br>

O conteúdo tem três níveis: uma **Trilha** contém **Aulas** (material em Markdown), e cada aula contém **Exercícios** (de código ou teóricos, do iniciante ao avançado). Uma aula pode declarar um pré-requisito, validado para ser outra aula da mesma trilha, então o mapa de fases nunca aponta para fora da própria trilha.

Nada chega ao aluno por acidente. Cada peça passa por quatro estados editoriais (rascunho, em revisão, aprovado e publicado) e a API pública só devolve o que está publicado. O autor submete para revisão, o revisor aprova ou devolve, e a publicação é uma permissão à parte. Autores editam apenas o próprio conteúdo.

Os serializers usam uma allowlist explícita de campos, então a solução de referência do autor (`solucao_autor`) nunca aparece num payload público: vê-la exige a permissão `trilhas.view_solution`, por uma rota própria.

O `seed_trilhas` é idempotente. Seu `update_or_create` tem chave `(trilha, slug)` nos dois níveis, então rodar de novo reaproveita as linhas em vez de duplicá-las.

</details>

<details>
<summary><b>Correção de código, o Judge0 atrás de uma porta estreita</b></summary>
<br>

Um exercício de código pode ter uma **especificação**: a linguagem (hoje, Python), o nome da função que o aluno precisa definir, um código inicial e os casos de teste, cada um visível ou oculto. O código do aluno vai ao **Judge0** junto de um harness que chama a função com os argumentos de cada caso, sem rede e com teto de CPU, de tempo e de memória.

Há dois modos. *Executar* roda só os casos visíveis e devolve a saída e o erro, para o aluno depurar. *Enviar* roda todos, e dos ocultos conta apenas se passaram, sem argumentos nem resultado. O envio aprovado é o que conclui o exercício e credita o XP, pela mesma rota de conclusão dos exercícios sem código.

Antes de gastar uma chamada, o código passa por uma análise da AST: erro de sintaxe, função ausente e construções exigidas ou proibidas pelo exercício (um `for`, um `import`) param ali. Um código idêntico corrigido nos últimos 10 minutos reaproveita o resultado guardado. Só as chamadas pagas contam na cota, que vive no banco: um teto diário por usuário (429) e um disjuntor global que para em 90% da cota do plano (503), além de uma rajada de 5 chamadas por minuto por usuário. Se o Judge0 cai ou não está configurado, a API responde 503.

</details>

<details>
<summary><b>Gamificação, criaturas que ganham XP e evoluem quando o aluno quer</b></summary>
<br>

Existe exatamente uma criatura por domínio de conhecimento (Fundamentos, Scripting, Compiladas e OO, Web e Dados), garantido por uma constraint de unicidade na coluna do domínio. Cada uma tem três estágios (filhote, jovem e adulto), e cada estágio exige um nível mínimo.

O XP é por criatura, não por conta: só a criatura **ativa** recebe crédito, e uma criatura recém-adquirida começa no nível 1 mesmo numa conta adiantada. Um exercício vale 50, 100 ou 200 XP conforme a dificuldade, multiplicado pelo bônus da trilha quando há um (o `seed_bonus_xp` dá XP em dobro na trilha do domínio da criatura). O valor sai sempre do servidor, nenhuma rota aceita XP vindo do cliente, e cada exercício credita uma vez só por conta: concluir de novo responde `ja_concluido` sem somar nada. A soma e a subida de nível acontecem no banco, com a linha travada, então dois pedidos simultâneos não perdem incremento.

Evoluir não é automático. Quando o nível alcança o próximo estágio, a conclusão avisa (`pode_evoluir`) e o aluno escolhe a hora, um estágio por vez, então quem chega ao topo ainda em filhote passa por jovem antes de adulto. O estágio só avança, nunca regride.

Três invariantes mantêm a posse honesta: um usuário só pode ter uma dada criatura uma vez, no máximo uma inicial (a escolhida no cadastro) e no máximo uma ativa. Os três são constraints no banco, não checagens na view. Escolher a inicial é uma única operação atômica, então uma corrida não entrega duas para ninguém.

</details>

<details>
<summary><b>Sequência e desafio do dia, motivos para voltar amanhã</b></summary>
<br>

A **sequência** conta os dias seguidos em que o aluno concluiu alguma coisa. Ela é atualizada na mesma transação da conclusão, com a linha travada, e guarda o recorde. Um dia sem estudo zera a sequência atual na leitura, mas nunca o recorde.

O **desafio do dia** escolhe três fases entre as trilhas publicadas, sorteadas pela data, então todo mundo vê as mesmas três no mesmo dia. Ele não dá XP extra: concluir uma fase do desafio é concluir o exercício normal da trilha.

</details>

<details>
<summary><b>Conquistas, medalhas que o servidor confere</b></summary>
<br>

Cada conquista tem um critério e uma meta, e o catálogo vive no banco. São 13 hoje: Ovo Chocado, Hello, World!, Explorador, Roda na Minha Máquina, De Primeira!, Debugger, Aquecendo os Motores, Engrenando, Level Up, Não Estou Sozinho, Pódio do Mês, Campeão do Mês e Freguês do Pódio.

Os critérios cobrem escolher a criatura, concluir exercícios, iniciar trilhas, alcançar um nível, executar código, ser aprovado no primeiro envio ou depois de errar, entrar num clã e subir no pódio do ranking. Algumas são **ocultas** e aparecem como ??? até serem desbloqueadas. A avaliação roda por sinais, no momento em que o evento acontece, e cada conquista desbloqueia uma vez só por aluno. O aviso aparece até o aluno vê-lo (`vista_em`), e o `reavaliar_conquistas` confere todo mundo de novo quando o catálogo muda.

</details>

<details>
<summary><b>Ranking mensal, o placar que zera sem apagar nada</b></summary>
<br>

O ranking é a soma do XP ganho no mês corrente, ajustes do admin incluídos. Não existe reset físico: a virada do mês só muda a janela da soma, então XP e nível das criaturas nunca são tocados.

A tela mostra o top 10 e a posição de quem está logado. Empate fica para quem chegou primeiro àquele XP. Ficam de fora contas com 0 XP no mês, suspensas e anonimizadas.

O **pódio** (os 3 primeiros) de cada mês é gravado sob demanda, na primeira leitura do ranking depois da virada, sem precisar de tarefa agendada. O comando `fechar_podios` grava os meses que faltarem. É o pódio que alimenta as conquistas Pódio do Mês, Campeão do Mês e Freguês do Pódio.

</details>

<details>
<summary><b>Clãs, grupos com regras no banco</b></summary>
<br>

Um clã tem nome, descrição, uma das quatro bandeiras, tipo (público ou privado) e um nível mínimo para entrar. A **tag** de 8 caracteres é o identificador público e imutável, exibida com `#` na frente, e não usa 0, O, 1 nem I para não confundir. Nome e descrição passam por um filtro de palavras proibidas que pega acento, leet (`b0b0`), letras separadas e letra repetida.

Criar um clã exige e-mail confirmado e a criatura no nível 5. Cada aluno está em um clã por vez, e cada clã tem até `CLA_LIMITE_MEMBROS` membros (50 por padrão). Os cargos são líder, co-líder e membro: líder e co-líderes editam o clã, mudam cargos, expulsam e geram o link de convite, e só existe um líder por clã, garantido no banco. O líder pode transferir a liderança.

Clãs públicos aparecem na busca e aceitam entrada direta de quem tiver o nível mínimo (contado pela criatura mais forte do aluno, nunca abaixo de 5). Nos privados, a entrada é só por link de convite, com validade de `CLA_CONVITE_VALIDADE_DIAS` dias, um ativo por vez e revogável pela liderança. O banco guarda o hash do token, não o token. Quando uma conta é excluída, ela sai do clã junto.

</details>

<details>
<summary><b>Acesso, contas, papéis e a segunda camada</b></summary>
<br>

O login é por e-mail, e as senhas usam hash **Argon2**. No sucesso, a API emite um par de JWT do SimpleJWT e o guarda em **cookies httponly** (`cq_access`, `cq_refresh`). O JavaScript nunca toca nos tokens. Um sinalizador `cq_sessao` separado, sem credencial nenhuma, só deixa a interface supor que há sessão. O cookie de refresh tem escopo no caminho `/auth/`, então ele viaja só com as rotas que precisam dele.

O cadastro é aberto a partir de **16 anos** (a data de nascimento é conferida no servidor) e exige o aceite da versão vigente dos Termos de Uso e da Política de Privacidade. Contas não verificadas ficam inertes até que o link enviado por e-mail seja usado, e tanto o link de verificação quanto o de redefinição de senha são de uso único e com prazo. Logins que falham repetidamente bloqueiam a conta por uma janela configurável.

O **2FA** é opcional e tem um método ativo por vez: app autenticador (TOTP, ativado por QR code) ou código enviado por e-mail. Ao ativar, o aluno recebe 8 códigos de recuperação de uso único, que valem para qualquer método. Com o 2FA ligado, o login vira dois passos: a senha certa devolve só um `mfa_token` de vida curta, e a sessão sai em `/auth/login/mfa/` depois do segundo fator. Desligar o 2FA também exige um código válido.

Trocar o e-mail pede a senha atual e duas confirmações: um link no endereço atual autoriza a troca, e um segundo link, no endereço novo, prova que ele é do titular. Só então o e-mail muda. Até lá, login, 2FA e recuperação de senha seguem no endereço antigo.

As permissões vivem numa tabela e são agrupadas em **níveis de acesso**. Cada conta nasce no nível de sistema do seu papel (Aluno, Autor ou Admin) e tem exatamente as permissões do nível, admin inclusive: nem o papel nem o `is_superuser` dão atalho, então rebaixar o nível de alguém de fato o rebaixa. O painel de RBAC (`/admin` no frontend) cria e edita níveis e os atribui a usuários, e o acesso ao próprio painel vem de uma marca no nível (`acesso_admin`), não do papel. Conceder autoria ou a fila de revisão é dado, não deploy.

O mesmo painel tem uma aba de **dashboard**: total de usuários, trilhas publicadas, tamanho da fila de revisão, submissões ao Judge0, novos usuários e submissões aprovadas e rejeitadas nos últimos 7 dias, e os logs mais recentes da auditoria. Como mostra logs, abrir o dashboard também fica registrado como acesso à auditoria.

</details>

<details>
<summary><b>Privacidade, os direitos do titular e a trilha de auditoria</b></summary>
<br>

Os eventos sensíveis (login e falha de login, cadastro, redefinição de senha, troca de e-mail, 2FA, exportação, exclusão, mudanças nos níveis de acesso, ações nos clãs) vão para uma **trilha de auditoria** append-only: o `save()` recusa alterar um registro já gravado. Quem tem `auditoria.view` consulta tudo em `/auditoria/`, e a própria consulta também fica registrada. Cada titular vê só as próprias linhas, filtradas às ações que dizem respeito a ele, na seção de atividade da conta. O comando `limpar_auditoria` apaga o que passou de `AUDITORIA_RETENCAO_DIAS` (180 por padrão) e foi feito para rodar por cron.

A exportação devolve em JSON os dados pessoais do titular. A exclusão tem dois passos: um pedido autenticado manda um link por e-mail, e esse link, junto com a senha, anonimiza a conta na hora e encerra a sessão. Anonimizar embaralha os dados pessoais e apaga os derivados (o e-mail guardado na auditoria e o IP dos aceites), mas mantém os agregados e a prova de aceite dos termos. Quando os Termos ou a Política de Privacidade mudam de versão, a API aponta o documento pendente e registra o novo aceite.

</details>

<details>
<summary><b>API</b></summary>
<br>

Tudo sob `/api/v1/`. Toda falha responde no mesmo envelope `{ error: { code, message, details } }`. Fora as rotas marcadas como públicas, tudo exige sessão, e a permissão do RBAC que a rota pede, quando pede, vem entre parênteses.

**Conteúdo**

| Rota | O que faz |
|---|---|
| `GET /trilhas/` · `/trilhas/{slug}/` | A lista de trilhas publicadas, e uma trilha com seu mapa de fases. **Público** |
| `GET /exercicios/{trilha_slug}/{exercicio_slug}/` | Um único exercício publicado. **Público** |

**Autoria e revisão**

| Rota | O que faz |
|---|---|
| `GET /autoria/rascunhos/` · `/autoria/fila-revisao/` | Trilhas, aulas e exercícios em rascunho (`trilhas.submit_review`) ou em revisão (`trilhas.review`) |
| `GET /autoria/{tipo}/{pk}/detalhe/` | O conteúdo inteiro em qualquer status, sem a solução (`trilhas.submit_review` ou `trilhas.review`) |
| `POST /autoria/{tipo}/{pk}/submeter/` | Manda o rascunho para revisão (`trilhas.submit_review`) |
| `POST /autoria/{tipo}/{pk}/aprovar/` · `/devolver/` | Aprova ou devolve ao autor (`trilhas.review`) |
| `POST /autoria/{tipo}/{pk}/publicar/` | Publica o que foi aprovado (`trilhas.publish`) |
| `GET /autoria/exercicios/{trilha_slug}/{exercicio_slug}/solucao/` | A solução de referência do autor (`trilhas.view_solution`) |

`{tipo}` é `trilhas`, `aulas` ou `exercicios`. Qualquer outro valor nem chega à view (404).

**Progressão**

| Rota | O que faz |
|---|---|
| `GET /eu/progresso/` | XP e nível da criatura ativa, com quanto falta para o próximo (204 sem criatura ativa) |
| `GET /eu/sequencia/` | A sequência atual, o recorde e se o aluno já estudou hoje |
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

**Conquistas e ranking**

| Rota | O que faz |
|---|---|
| `GET /eu/conquistas/` | O catálogo com as conquistas do aluno marcadas, e as ocultas como ??? |
| `POST /eu/conquistas/vistas/` | Marca os avisos de desbloqueio como vistos |
| `GET /ranking/mensal/` | O top 10 do mês, a posição de quem pediu e os pódios dele |

**Clãs**

| Rota | O que faz |
|---|---|
| `GET` · `POST /clas/` | Busca clãs, e cria um (`comunidades.create`) |
| `GET` · `PATCH /clas/{tag}/` | Um clã, e a edição pela liderança |
| `POST /clas/{tag}/entrar/` | Entra num clã público (`comunidades.join`) |
| `GET /clas/{tag}/membros/` | Os membros e seus cargos |
| `PATCH` · `DELETE /clas/{tag}/membros/{id}/` | Muda o cargo de um membro, ou o expulsa |
| `POST /clas/{tag}/lideranca/` | Transfere a liderança |
| `POST` · `DELETE /clas/{tag}/convite/` | Gera ou revoga o link de convite |
| `GET /convites/{token}/` · `POST /convites/{token}/aceitar/` | A prévia do convite, e o aceite |
| `GET /eu/cla/` · `POST /eu/cla/sair/` | O clã do usuário, e a saída dele |

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
| `GET /admin/dashboard/` | As métricas do painel e os logs recentes (nível com `acesso_admin`) |
| `GET /auditoria/` | A trilha de auditoria, com filtros `acao`, `actor`, `desde` e `ate` (`auditoria.view`) |
| `GET /auth/admin/permissoes/` | O catálogo de permissões concedíveis |
| `/auth/admin/niveis/` · `/niveis/{id}/` | Lista, cria, edita e remove níveis de acesso |
| `GET /auth/admin/usuarios/` · `PATCH /usuarios/{id}/nivel/` | Os usuários, e a atribuição de nível a um deles |

As rotas `/auth/admin/` exigem um nível com `acesso_admin`. Docs interativas em `/api/docs/`, schema em `/api/schema/`.

</details>

## Testes

```bash
cd backend && pytest                 # API, regras de negócio e segurança
cd frontend && npm test              # Jest + React Testing Library
```

A suíte do backend cobre a API de conteúdo, o fluxo editorial, a tabela de RBAC, os fluxos de autenticação, o 2FA, a troca de e-mail, os direitos da LGPD, a auditoria, o crédito de XP, a correção de código, as conquistas, o ranking e os clãs, incluindo o que **não** pode funcionar: um link de redefinição usado duas vezes, conteúdo não publicado vazando pela API, uma solução de referência chegando a um payload público, o login bloqueando após tentativas demais, um crédito de XP apagando o que outro pedido gravou no meio do caminho e um aluno estourando a cota do Judge0.

Nos testes, o Judge0 dá lugar a um executor Python local, então a suíte não gasta cota nem precisa de rede. Nenhum model é registrado no admin do Django, então toda ação administrativa passa pelas regras de negócio.

## Deploy

Feito para rodar numa **VPS** (DigitalOcean), backend e frontend no mesmo servidor, não em plataformas serverless. O Django serve a API e o Next serve as telas, com um proxy reverso (Nginx) na frente e o banco na própria máquina.

```
DigitalOcean Droplet
├── Nginx        # proxy reverso + TLS
├── Django       # gunicorn, API em /api/
├── Next.js      # next start, telas
└── PostgreSQL   # banco relacional no droplet
```

A configuração fica em [`deploy/`](deploy/), pronta para copiar para o servidor
(repositório em `/srv/codequest`, usuário `codequest`):

| Arquivo | Destino |
|---|---|
| `nginx.conf` | `/etc/nginx/sites-available/codequest` (TLS com certbot) |
| `codequest-api.service` · `codequest-web.service` | `/etc/systemd/system/` |
| `gunicorn.conf.py` | lido pela unidade da API |
| `crontab` | `crontab -u codequest deploy/crontab` (auditoria e pódio) |

1. `backend/`: criar a `.venv`, `pip install -r requirements.txt` e o `.env` de
   produção (`DEBUG=False`, `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, `DATABASE_URL`).
2. `systemctl enable --now codequest-api` (roda o `migrate`, que também cria a
   tabela do cache de throttle).
3. `frontend/`: `npm ci && npm run build` com a API já no ar, porque o build lê o
   catálogo; depois `systemctl enable --now codequest-web`.
4. Ativar o site no Nginx e instalar o `crontab`.

## Stack

| Camada | Tecnologias |
|---|---|
| **Backend** | Python 3.14, Django 6.0, Django REST Framework 3.18, SimpleJWT, Argon2, pytest |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS v4, Jest + React Testing Library |
| **Banco** | PostgreSQL |
| **Correção de código** | Judge0 CE |
| **Infra** | DigitalOcean, Nginx, Docker Compose |
| **Docs da API** | drf-spectacular, Swagger UI |

## Quem fez

**[Mauro Junior](https://github.com/mj01px)**, **[Julio Franz](https://github.com/JulioFranz)** e **[Arthur Sabino](https://github.com/ArthurS357)**<br>
Orientador: Fabiano Bezerra Menegidio<br>
Projeto Final de Curso · Engenharia de Software, 8B Noturno · Universidade de Mogi das Cruzes · 2026
