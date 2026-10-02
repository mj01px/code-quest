# Requisitos Funcionais do CodeQuest

Documento de requisitos funcionais do Projeto Final de Curso (PFC) CodeQuest,
plataforma gamificada de ensino de programação. A estrutura de cada requisito
segue o "Guia de apoio: como descrever requisitos funcionais para um projeto de
software" (Prof. Alessandro Aparecido da Silva, UMC): identificação, nome,
descrição, atores, pré-condições, fluxo principal, regras de negócio,
pós-condições e critérios de aceite no formato "Dado..., quando..., então...".

Além dos campos do guia, cada requisito traz três campos de rastreabilidade:

| Campo | Significado |
|---|---|
| Prioridade | Alta, Média ou Baixa, conforme o peso da funcionalidade para o objetivo do sistema |
| Estado | `Implementado`, `Parcial`, `Planejado` ou `Em desenvolvimento` |
| Fonte | Onde a funcionalidade está no código (caminhos relativos à raiz do repositório) |

Significado de cada estado:

| Estado | Critério usado |
|---|---|
| `Implementado` | Existe código na branch `main` e, quando possível, teste automatizado cobrindo o comportamento |
| `Parcial` | Parte do comportamento existe na `main` (por exemplo, a regra na API sem a tela correspondente) |
| `Planejado` | Previsto (permissão no RBAC, código de auditoria reservado ou documentação), sem implementação na `main` |
| `Em desenvolvimento` | Em construção numa branch da equipe, ainda não integrada à `main` |

Base da verificação: branch `main` no commit `9ebd18a` (2 de outubro de 2026).
Os números de regras de negócio (RN) e critérios de aceite (CA) recomeçam a cada
requisito.

## Atores

| Ator | Descrição |
|---|---|
| Visitante | Pessoa sem sessão. Consulta o catálogo público, cria conta e usa os links enviados por e-mail |
| Aluno | Conta com o nível de acesso Aluno. Estuda as trilhas, resolve exercícios e cuida das criaturas |
| Autor | Conta com o nível de acesso Autor. Tem as permissões do aluno e acesso à solução de referência |
| Administrador | Conta cujo nível de acesso tem a marca `acesso_admin`. Gerencia níveis, usuários e auditoria |
| Sistema | Ações automáticas do CodeQuest (e-mails, auditoria, cálculo de XP) |
| Judge0 | Serviço externo que executa o código enviado pelo aluno |

As permissões de cada ator vêm do nível de acesso da conta, não do papel
(`backend/apps/contas/rbac.py` e `NivelDeAcesso` em `backend/apps/contas/models.py`).

## Quadro resumo

| ID | Nome | Prioridade | Estado |
|---|---|---|---|
| RF01 | Cadastrar conta | Alta | Implementado |
| RF02 | Verificar e-mail da conta | Alta | Implementado |
| RF03 | Autenticar usuário | Alta | Implementado |
| RF04 | Autenticar com segundo fator (2FA) | Alta | Implementado |
| RF05 | Ativar e desativar o 2FA | Média | Implementado |
| RF06 | Renovar e encerrar sessão | Alta | Implementado |
| RF07 | Recuperar senha | Alta | Implementado |
| RF08 | Consultar e editar perfil | Média | Implementado |
| RF09 | Trocar e-mail da conta | Média | Implementado |
| RF10 | Gerenciar níveis de acesso | Alta | Implementado |
| RF11 | Atribuir nível de acesso a usuário | Alta | Implementado |
| RF12 | Consultar catálogo de trilhas | Alta | Implementado |
| RF13 | Consultar trilha e mapa de fases | Alta | Implementado |
| RF14 | Consultar exercício | Alta | Implementado |
| RF15 | Controlar fluxo editorial do conteúdo | Média | Parcial |
| RF16 | Consultar solução de referência | Baixa | Parcial |
| RF17 | Iniciar trilha | Média | Implementado |
| RF18 | Concluir exercício e creditar XP | Alta | Implementado |
| RF19 | Consultar progresso do aluno | Alta | Implementado |
| RF20 | Executar código contra casos visíveis | Alta | Implementado |
| RF21 | Enviar código para correção automática | Alta | Implementado |
| RF22 | Escolher criatura inicial | Alta | Implementado |
| RF23 | Adquirir nova criatura | Média | Implementado |
| RF24 | Definir criatura ativa | Média | Implementado |
| RF25 | Evoluir criatura | Média | Implementado |
| RF26 | Consultar criaturas e bônus de XP | Média | Implementado |
| RF27 | Apresentar desafios do dia | Baixa | Implementado |
| RF28 | Consultar histórico da própria atividade | Média | Implementado |
| RF29 | Exportar dados pessoais | Alta | Implementado |
| RF30 | Renovar consentimento dos documentos legais | Média | Parcial |
| RF31 | Excluir conta por anonimização | Alta | Implementado |
| RF32 | Registrar eventos na trilha de auditoria | Alta | Implementado |
| RF33 | Consultar trilha de auditoria | Média | Parcial |
| RF34 | Suspender e reativar conta | Baixa | Planejado |
| RF35 | Gerenciar clãs | Média | Em desenvolvimento |

---

## 1. Conta e acesso

### RF01. Cadastrar conta

**Prioridade:** Alta · **Estado:** Implementado

**Descrição:** O sistema deverá permitir que um visitante crie uma conta de aluno
informando e-mail, nickname, senha e data de nascimento, e aceitando a versão
vigente dos Termos de Uso e da Política de Privacidade.

**Atores:** Visitante, Sistema.

**Pré-condições:** O visitante não possui sessão ativa.

**Fluxo principal:**
1. O visitante acessa a tela de cadastro e informa e-mail, nickname, senha e data de nascimento.
2. O visitante marca o aceite dos Termos de Uso e da Política de Privacidade.
3. O sistema valida os dados, a idade mínima e a política de senha.
4. O sistema cria a conta com o papel Aluno, registra o aceite de cada documento com versão, data e IP, e envia o link de verificação por e-mail.
5. O sistema informa que o e-mail de confirmação foi enviado.

**Regras de negócio:**
- RN01: A idade mínima é de 16 anos completos, calculada no servidor a partir da data de nascimento.
- RN02: O aceite dos dois documentos é obrigatório e precisa citar a versão vigente; versão desatualizada é recusada.
- RN03: O nickname tem de 3 a 20 caracteres (letras sem acento, números e underscore), é único sem diferenciar maiúsculas e não pode ser uma palavra reservada.
- RN04: A senha segue a política descrita no RNF01.
- RN05: Se o e-mail já tiver conta, nenhuma conta nova é criada; o sistema envia um aviso ao dono do endereço e responde ao visitante da mesma forma que no cadastro bem-sucedido, sem revelar que o e-mail existe.
- RN06: O papel de autor ou administrador nunca é escolhido no cadastro.

**Pós-condições:** Conta criada, ainda sem e-mail verificado, e evento `CADASTRO` registrado na auditoria.

**Critérios de aceite:**
- CA01: Dado um visitante com 15 anos, quando enviar o cadastro, então o sistema deverá recusar com a mensagem de idade mínima.
- CA02: Dado um cadastro sem o aceite dos documentos, quando enviado, então o sistema deverá recusar a criação da conta.
- CA03: Dado um e-mail já cadastrado, quando um visitante tentar se cadastrar com ele, então nenhuma conta deverá ser criada e a resposta deverá ser igual à de um cadastro novo.
- CA04: Dado um cadastro válido, quando concluído, então deverão existir dois registros de aceite (Termos e Privacidade) com a versão vigente.

**Fonte:** `backend/apps/contas/views.py` (`RegistrarView`), `backend/apps/contas/serializers.py` (`RegistroSerializer`), `backend/apps/contas/validators.py`, `backend/apps/contas/cadastro_alerta.py`, `frontend/src/app/cadastro/page.tsx`, `frontend/src/components/auth/FormularioCadastro.tsx`.

### RF02. Verificar e-mail da conta

**Prioridade:** Alta · **Estado:** Implementado

**Descrição:** O sistema deverá confirmar a posse do e-mail informado no cadastro
por meio de um link assinado e com prazo, e permitir o reenvio desse link.

**Atores:** Visitante, Sistema.

**Pré-condições:** A conta existe e o e-mail ainda não foi verificado.

**Fluxo principal:**
1. O visitante abre o link recebido por e-mail.
2. O sistema valida a assinatura e o prazo do token.
3. O sistema marca o e-mail como verificado e registra o evento na auditoria.
4. A tela confirma a verificação e oferece o acesso ao login.

**Regras de negócio:**
- RN01: O link vale por 24 horas (configurável em `VERIFICACAO_EMAIL_MAX_AGE`).
- RN02: Enquanto o e-mail não for verificado, o login é recusado (RF03).
- RN03: O reenvio responde sempre da mesma forma, exista a conta ou não.
- RN04: Abrir de novo um link de conta já verificada é tratado como sucesso, sem registrar a verificação duas vezes.

**Pós-condições:** Conta com `email_verified_at` preenchido.

**Critérios de aceite:**
- CA01: Dado um link válido, quando aberto, então a conta deverá passar a ter o e-mail verificado.
- CA02: Dado um link vencido de uma conta ainda pendente, quando aberto, então o sistema deverá recusar e orientar o pedido de novo e-mail.
- CA03: Dado um e-mail inexistente, quando o visitante pedir o reenvio, então a resposta deverá ser a mesma de um e-mail existente.

**Fonte:** `backend/apps/contas/views.py` (`VerificarEmailView`, `ReenviarVerificacaoView`), `backend/apps/contas/verificacao.py`, `frontend/src/app/verificar-email/page.tsx`, `frontend/src/app/confirmar-email/page.tsx`.

### RF03. Autenticar usuário

**Prioridade:** Alta · **Estado:** Implementado

**Descrição:** O sistema deverá permitir que usuários cadastrados entrem com e-mail
e senha e recebam uma sessão, liberando apenas as funcionalidades permitidas pelo
seu nível de acesso.

**Atores:** Aluno, Autor, Administrador.

**Pré-condições:** Conta ativa, com e-mail verificado e não bloqueada.

**Fluxo principal:**
1. O usuário informa e-mail e senha.
2. O sistema verifica bloqueio, credenciais e verificação do e-mail.
3. Se o 2FA estiver desativado, o sistema inicia a sessão e grava os tokens em cookies.
4. Se o 2FA estiver ativo, o sistema segue para o RF04.
5. Se as credenciais forem inválidas, o sistema informa a falha sem dizer qual dado está errado.

**Regras de negócio:**
- RN01: Após 5 falhas seguidas a conta fica bloqueada por 15 minutos (`LOGIN_MAX_TENTATIVAS` e `LOGIN_BLOQUEIO_SEGUNDOS`).
- RN02: Conta bloqueada, senha errada e e-mail inexistente recebem a mesma mensagem genérica.
- RN03: Conta inativa ou anonimizada não autentica.
- RN04: Todo sucesso e toda falha são registrados na auditoria, sem guardar a senha tentada.

**Pós-condições:** Sessão iniciada com cookies `cq_access` e `cq_refresh`, ou acesso recusado.

**Critérios de aceite:**
- CA01: Dado um usuário verificado com credenciais corretas e sem 2FA, quando entrar, então o sistema deverá iniciar a sessão.
- CA02: Dado um usuário com senha incorreta, quando tentar entrar, então o sistema deverá recusar com a mensagem de credenciais inválidas.
- CA03: Dado um usuário que errou a senha 5 vezes, quando tentar de novo com a senha correta dentro de 15 minutos, então o sistema deverá recusar o acesso.
- CA04: Dado um usuário com e-mail não verificado, quando informar credenciais corretas, então o sistema deverá recusar e pedir a confirmação do e-mail.

**Fonte:** `backend/apps/contas/views.py` (`LoginView`), `backend/apps/contas/serializers.py` (`LoginSerializer`), `backend/apps/contas/models.py` (`registrar_falha_de_login`), `backend/apps/contas/cookies.py`, `frontend/src/app/entrar/page.tsx`.

### RF04. Autenticar com segundo fator (2FA)

**Prioridade:** Alta · **Estado:** Implementado

**Descrição:** O sistema deverá exigir um segundo fator no login de contas com 2FA
ativo, aceitando o código do aplicativo autenticador, o código enviado por e-mail
ou um código de recuperação.

**Atores:** Aluno, Autor, Administrador.

**Pré-condições:** Senha validada no RF03 e 2FA ativo na conta.

**Fluxo principal:**
1. Após a senha correta, o sistema devolve um `mfa_token` de vida curta, sem sessão.
2. Se o método for e-mail, o sistema envia um código de 6 dígitos.
3. O usuário informa o código.
4. O sistema valida o código e inicia a sessão.

**Regras de negócio:**
- RN01: O `mfa_token` vale por 5 minutos (`MFA_LOGIN_TOKEN_MAX_AGE`).
- RN02: O código por e-mail vale por 10 minutos (`MFA_EMAIL_CODIGO_MAX_AGE`).
- RN03: Cada código de recuperação vale uma única vez.
- RN04: O evento `LOGIN_OK` só é registrado depois do segundo fator.

**Pós-condições:** Sessão iniciada, ou acesso recusado.

**Critérios de aceite:**
- CA01: Dado um usuário com 2FA ativo, quando acertar a senha, então o sistema não deverá gravar cookies de sessão até o segundo fator.
- CA02: Dado um código de recuperação já usado, quando informado, então o sistema deverá recusá-lo.
- CA03: Dado um `mfa_token` com mais de 5 minutos, quando usado, então o sistema deverá recusar o segundo passo.

**Fonte:** `backend/apps/contas/views.py` (`LoginMfaView`), `backend/apps/contas/mfa.py`, `frontend/src/components/auth/FormularioLogin.tsx`.

### RF05. Ativar e desativar o 2FA

**Prioridade:** Média · **Estado:** Implementado

**Descrição:** O sistema deverá permitir que o usuário ative o 2FA por aplicativo
autenticador (TOTP, via QR code) ou por código enviado por e-mail, e o desative
mediante um código válido.

**Atores:** Aluno, Autor, Administrador.

**Pré-condições:** Usuário autenticado.

**Fluxo principal:**
1. O usuário escolhe o método nas configurações de segurança.
2. O sistema prepara o método: QR code e segredo (aplicativo) ou envio de código (e-mail).
3. O usuário informa o código gerado.
4. O sistema ativa o 2FA e exibe 8 códigos de recuperação uma única vez.
5. Para desativar, o usuário informa um código válido do método ativo ou um código de recuperação.

**Regras de negócio:**
- RN01: Apenas um método fica ativo por vez.
- RN02: Com o 2FA ativo, trocar de método exige desativar antes, o que pede código.
- RN03: Os códigos de recuperação são guardados apenas em hash.
- RN04: Ativação e desativação são registradas na auditoria.

**Pós-condições:** 2FA ativo com o método escolhido, ou desativado.

**Critérios de aceite:**
- CA01: Dado um código TOTP correto, quando o usuário confirmar a ativação, então o sistema deverá devolver 8 códigos de recuperação.
- CA02: Dado o 2FA ativo, quando o usuário tentar iniciar outro método, então o sistema deverá recusar com a orientação de desativar antes.
- CA03: Dado um código incorreto, quando o usuário tentar desativar o 2FA, então o 2FA deverá continuar ativo.

**Fonte:** `backend/apps/contas/views.py` (`MfaIniciarView`, `MfaConfirmarView`, `MfaDesativarIniciarView`, `MfaDesativarView`), `backend/apps/contas/mfa.py`, `frontend/src/components/configuracoes/SecaoSeguranca.tsx`.

### RF06. Renovar e encerrar sessão

**Prioridade:** Alta · **Estado:** Implementado

**Descrição:** O sistema deverá renovar a sessão de forma transparente enquanto o
token de renovação for válido, e permitir que o usuário encerre a sessão.

**Atores:** Aluno, Autor, Administrador.

**Pré-condições:** Cookie de renovação presente (renovar) ou sessão ativa (sair).

**Fluxo principal:**
1. Quando o token de acesso expira, a interface pede a renovação.
2. O sistema valida o token de renovação, emite um novo par e invalida o anterior.
3. Ao sair, o sistema invalida o token de renovação, apaga os cookies e registra o logout.

**Regras de negócio:**
- RN01: O token de acesso vale 15 minutos e o de renovação 7 dias.
- RN02: Cada renovação gera um token novo e põe o anterior na lista de bloqueio.
- RN03: Redefinir a senha (RF07) e excluir a conta (RF31) encerram todas as sessões do usuário.

**Pós-condições:** Sessão renovada, ou encerrada sem cookies.

**Critérios de aceite:**
- CA01: Dado um token de renovação já usado, quando reapresentado, então o sistema deverá recusá-lo.
- CA02: Dado um usuário autenticado, quando sair, então os três cookies de sessão deverão ser removidos.

**Fonte:** `backend/apps/contas/views.py` (`RenovarView`, `SairView`), `backend/config/settings.py` (`SIMPLE_JWT`), `frontend/src/lib/api.ts`.

### RF07. Recuperar senha

**Prioridade:** Alta · **Estado:** Implementado

**Descrição:** O sistema deverá permitir que o usuário redefina a senha por meio de
um link de uso único enviado ao e-mail da conta.

**Atores:** Visitante, Sistema.

**Pré-condições:** O visitante conhece o e-mail da conta.

**Fluxo principal:**
1. O visitante informa o e-mail na tela de recuperação.
2. O sistema envia o link de redefinição, se a conta existir e estiver ativa.
3. O visitante abre o link e informa a nova senha.
4. O sistema troca a senha, zera o bloqueio de login, cancela troca de e-mail pendente e encerra todas as sessões.

**Regras de negócio:**
- RN01: O link vale 30 minutos (`REDEFINICAO_SENHA_MAX_AGE`) e deixa de valer assim que a senha muda (uso único).
- RN02: O pedido responde sempre da mesma forma, exista a conta ou não.
- RN03: A nova senha segue a política do RNF01.

**Pós-condições:** Senha nova gravada, sessões anteriores encerradas e evento `SENHA_REDEFINIDA` registrado.

**Critérios de aceite:**
- CA01: Dado um link já usado, quando aberto de novo, então o sistema deverá recusar a redefinição.
- CA02: Dado um e-mail sem conta, quando o visitante pedir a recuperação, então a resposta deverá ser igual à de um e-mail existente.
- CA03: Dado um usuário com sessão aberta em outro dispositivo, quando redefinir a senha, então aquela sessão não deverá conseguir renovar o token.

**Fonte:** `backend/apps/contas/views.py` (`SenhaEsquecidaView`, `RedefinirSenhaView`), `backend/apps/contas/senha.py`, `frontend/src/app/recuperar-senha/page.tsx`, `frontend/src/app/redefinir-senha/page.tsx`.

### RF08. Consultar e editar perfil

**Prioridade:** Média · **Estado:** Implementado

**Descrição:** O sistema deverá exibir os dados da conta do usuário autenticado e
permitir a troca do nickname.

**Atores:** Aluno, Autor, Administrador.

**Pré-condições:** Usuário autenticado.

**Fluxo principal:**
1. O usuário abre as configurações.
2. O sistema apresenta e-mail, nickname, papel e permissões efetivas.
3. O usuário altera o nickname e salva.
4. O sistema valida e grava o novo nickname.

**Regras de negócio:**
- RN01: O novo nickname segue as regras do RF01 (RN03).
- RN02: A troca de nickname é registrada na auditoria.

**Pós-condições:** Perfil atualizado.

**Critérios de aceite:**
- CA01: Dado um nickname já usado por outra conta, com qualquer combinação de maiúsculas, quando o usuário tentar adotá-lo, então o sistema deverá recusar.
- CA02: Dado um nickname válido e livre, quando salvo, então o perfil deverá exibi-lo imediatamente.

**Fonte:** `backend/apps/contas/views.py` (`EuView`), `frontend/src/components/configuracoes/PainelConfiguracoes.tsx`, `frontend/src/components/configuracoes/SecaoPerfil.tsx`.

### RF09. Trocar e-mail da conta

**Prioridade:** Média · **Estado:** Implementado

**Descrição:** O sistema deverá permitir a troca do e-mail da conta mediante a
senha atual e duas confirmações: uma no endereço atual e outra no endereço novo.

**Atores:** Aluno, Autor, Administrador.

**Pré-condições:** Usuário autenticado e não bloqueado.

**Fluxo principal:**
1. O usuário informa o novo e-mail e a senha atual.
2. O sistema guarda o endereço como pendente e envia um link ao e-mail atual.
3. O titular aprova pelo link do e-mail atual.
4. O sistema envia um segundo link ao endereço novo.
5. O titular confirma pelo link do endereço novo, e só então o e-mail da conta muda.

**Regras de negócio:**
- RN01: Até a segunda confirmação, login, 2FA e recuperação de senha seguem no e-mail atual.
- RN02: Senha atual errada conta como falha de login e participa do bloqueio do RF03.
- RN03: Os links valem 30 minutos (`TROCA_EMAIL_MAX_AGE`).
- RN04: Redefinir a senha cancela a troca pendente.

**Pós-condições:** E-mail da conta substituído e já marcado como verificado.

**Critérios de aceite:**
- CA01: Dado um pedido de troca, quando apenas o link do e-mail atual for aberto, então o e-mail da conta não deverá mudar.
- CA02: Dado o segundo link aberto, quando confirmado, então o login deverá passar a funcionar apenas com o e-mail novo.
- CA03: Dado uma senha atual incorreta, quando o usuário pedir a troca, então o sistema deverá recusar e contar uma falha de login.

**Fonte:** `backend/apps/contas/views.py` (`TrocarEmailView`, `ConfirmarTrocaEmailView`), `backend/apps/contas/troca_email.py`, `frontend/src/components/configuracoes/PainelConfiguracoes.tsx`, `frontend/src/components/__tests__/ConfirmarTrocaEmail.test.tsx`.

## 2. Controle de acesso (RBAC)

### RF10. Gerenciar níveis de acesso

**Prioridade:** Alta · **Estado:** Implementado

**Descrição:** O sistema deverá permitir que o administrador crie, consulte, edite e
remova níveis de acesso, cada um formado por um conjunto de permissões do catálogo.

**Atores:** Administrador.

**Pré-condições:** Usuário autenticado num nível com `acesso_admin`.

**Fluxo principal:**
1. O administrador abre o painel `/admin`.
2. O sistema lista os níveis, com a contagem de usuários, e o catálogo de permissões.
3. O administrador cria ou edita um nível, escolhendo nome, descrição, permissões e se o nível dá acesso ao painel.
4. O sistema grava o nível e registra a operação na auditoria.

**Regras de negócio:**
- RN01: Os níveis de sistema (Aluno, Autor, Admin) não podem ser removidos.
- RN02: As permissões concedíveis são apenas as do catálogo definido em `rbac.py`.
- RN03: O acesso ao painel vem da marca `acesso_admin` do nível, não do papel da conta.

**Pós-condições:** Nível criado, alterado ou removido, com evento `NIVEL_CRIADO`, `NIVEL_EDITADO` ou `NIVEL_REMOVIDO`.

**Critérios de aceite:**
- CA01: Dado um aluno, quando tentar acessar as rotas `/auth/admin/`, então o sistema deverá recusar com 403.
- CA02: Dado o nível de sistema Aluno, quando o administrador tentar removê-lo, então o sistema deverá recusar.

**Fonte:** `backend/apps/contas/views_rbac.py`, `backend/apps/contas/rbac.py`, `backend/apps/core/permissions.py`, `frontend/src/components/admin/GestaoNiveis.tsx`.

### RF11. Atribuir nível de acesso a usuário

**Prioridade:** Alta · **Estado:** Implementado

**Descrição:** O sistema deverá permitir que o administrador liste os usuários e
atribua a cada um o nível de acesso que define suas permissões.

**Atores:** Administrador.

**Pré-condições:** Usuário autenticado num nível com `acesso_admin`.

**Fluxo principal:**
1. O administrador abre a gestão de usuários no painel.
2. O sistema lista os usuários com o nível atual.
3. O administrador escolhe um novo nível para um usuário.
4. O sistema grava a atribuição e registra `NIVEL_ATRIBUIDO` na auditoria.

**Regras de negócio:**
- RN01: O usuário passa a ter exatamente as permissões do novo nível, administrador inclusive: rebaixar o nível rebaixa de fato.
- RN02: Conceder autoria é atribuir o nível Autor; não depende de mudança no código.

**Pós-condições:** Usuário com o novo nível e permissões efetivas atualizadas.

**Critérios de aceite:**
- CA01: Dado um administrador movido para o nível Aluno, quando tentar abrir o painel, então o sistema deverá recusar o acesso.
- CA02: Dado um aluno movido para o nível Autor, quando pedir a solução de referência (RF16), então o sistema deverá atendê-lo.

**Fonte:** `backend/apps/contas/views_rbac.py` (`UsuarioListView`, `UsuarioNivelView`), `backend/apps/contas/models.py` (`has_perm`), `frontend/src/components/admin/GestaoUsuarios.tsx`.

## 3. Conteúdo de aprendizado

### RF12. Consultar catálogo de trilhas

**Prioridade:** Alta · **Estado:** Implementado

**Descrição:** O sistema deverá listar as trilhas publicadas com nome, descrição e
a quantidade de aulas e exercícios publicados de cada uma.

**Atores:** Visitante, Aluno.

**Pré-condições:** Nenhuma para a API. A tela da área logada exige a permissão `trilhas.view`.

**Fluxo principal:**
1. O usuário acessa a lista de trilhas.
2. O sistema devolve as trilhas publicadas em ordem.
3. A tela mostra cada trilha com as contagens e, para o aluno, a situação (iniciar, em andamento, concluída).

**Regras de negócio:**
- RN01: Apenas trilhas, aulas e exercícios no estado PUBLICADO aparecem e entram nas contagens.

**Pós-condições:** Catálogo apresentado.

**Critérios de aceite:**
- CA01: Dada uma trilha em rascunho, quando o catálogo for consultado, então ela não deverá aparecer.
- CA02: Dada uma trilha publicada com uma aula em rascunho, quando o catálogo for consultado, então a contagem não deverá incluir essa aula.

**Fonte:** `backend/apps/trilhas/views.py` (`TrilhaListView`), `frontend/src/app/(app)/trilhas/page.tsx`, `frontend/src/components/trilhas/ListaDeTrilhas.tsx`.

### RF13. Consultar trilha e mapa de fases

**Prioridade:** Alta · **Estado:** Implementado

**Descrição:** O sistema deverá apresentar uma trilha com suas aulas (módulos) e
exercícios (fases) publicados, o pré-requisito entre aulas e o atalho
"continuar de onde parou".

**Atores:** Visitante, Aluno.

**Pré-condições:** A trilha está publicada.

**Fluxo principal:**
1. O usuário escolhe uma trilha.
2. O sistema devolve as aulas publicadas, cada uma com seus exercícios publicados e o pré-requisito.
3. A tela monta o mapa de fases e marca as fases já concluídas pelo aluno.
4. O destaque aponta para a primeira fase ainda não concluída.

**Regras de negócio:**
- RN01: O pré-requisito de uma aula precisa ser outra aula da mesma trilha.
- RN02: Uma trilha não publicada responde como inexistente (404).
- RN03: A retomada leva à primeira fase não concluída na ordem da trilha.

**Pós-condições:** Mapa de fases apresentado.

**Critérios de aceite:**
- CA01: Dado um slug de trilha em rascunho, quando acessado, então o sistema deverá responder 404.
- CA02: Dado um aluno que concluiu as fases 1 e 3, quando abrir a trilha, então o destaque deverá apontar para a fase 2.

**Fonte:** `backend/apps/trilhas/views.py` (`TrilhaDetailView`), `backend/apps/trilhas/models.py` (`Aula.clean`), `frontend/src/app/(app)/trilhas/[trilhaSlug]/page.tsx`, `frontend/src/components/trilhas/MapaDeFases.tsx`, `frontend/src/components/trilhas/CartaoDestaque.tsx`.

### RF14. Consultar exercício

**Prioridade:** Alta · **Estado:** Implementado

**Descrição:** O sistema deverá apresentar um exercício publicado com enunciado,
tipo (código ou teórico), dificuldade e o contexto da aula e da trilha.

**Atores:** Visitante, Aluno.

**Pré-condições:** Exercício, aula e trilha publicados.

**Fluxo principal:**
1. O usuário abre uma fase do mapa.
2. O sistema devolve o exercício.
3. A tela mostra o enunciado e, nos exercícios de código, o editor (RF20 e RF21).

**Regras de negócio:**
- RN01: A solução de referência do autor nunca faz parte da resposta.
- RN02: O slug do exercício é único dentro da trilha.

**Pós-condições:** Exercício apresentado.

**Critérios de aceite:**
- CA01: Dado qualquer exercício publicado, quando consultado, então a resposta não deverá conter o campo `solucao_autor`.
- CA02: Dado um exercício publicado dentro de uma aula em rascunho, quando consultado, então o sistema deverá responder 404.

**Fonte:** `backend/apps/trilhas/views.py` (`ExercicioDetailView`), `backend/apps/trilhas/serializers.py`, `frontend/src/app/(app)/trilhas/[trilhaSlug]/exercicios/[exercicioSlug]/page.tsx`.

### RF15. Controlar fluxo editorial do conteúdo

**Prioridade:** Média · **Estado:** Parcial

**Descrição:** O sistema deverá conduzir trilhas, aulas e exercícios pelos estados
RASCUNHO → REVISAO → APROVADO → PUBLICADO, de modo que somente conteúdo
publicado chegue ao aluno.

**Atores:** Autor, Administrador.

**Pré-condições:** Conteúdo cadastrado.

**Fluxo principal (previsto):**
1. O autor cria o conteúdo em rascunho.
2. O autor envia para revisão.
3. Um revisor aprova ou devolve.
4. Um usuário com permissão publica o conteúdo aprovado.

**Regras de negócio:**
- RN01: A API pública só devolve conteúdo PUBLICADO.
- RN02: Cada transição exige a permissão correspondente (`trilhas.create`, `trilhas.submit_review`, `trilhas.review`, `trilhas.publish`).

**Pós-condições:** Conteúdo no novo estado editorial.

**Critérios de aceite:**
- CA01: Dado um exercício em APROVADO, quando a API pública for consultada, então ele não deverá aparecer.
- CA02: Dado um aluno, quando tentar publicar conteúdo, então o sistema deverá recusar.

**O que existe:** os quatro estados no modelo, o filtro de publicados em todas as
rotas públicas, as permissões no catálogo do RBAC e o comando idempotente
`seed_trilhas`, que carrega o conteúdo e publica as trilhas Lógica de
Programação, Python e Banco de Dados.

**O que falta:** não há rotas nem telas para criar, editar, enviar para revisão,
aprovar ou publicar conteúdo. Hoje o conteúdo entra pelo comando de seed, e o
CA02 não tem rota a ser testada.

**Fonte:** `backend/apps/trilhas/models.py` (`StatusEditorial`, `PublicavelQuerySet`), `backend/apps/contas/rbac.py`, `backend/apps/trilhas/management/commands/seed_trilhas.py`.

### RF16. Consultar solução de referência

**Prioridade:** Baixa · **Estado:** Parcial

**Descrição:** O sistema deverá permitir que autores consultem a solução de
referência de um exercício, publicado ou não, por uma rota própria.

**Atores:** Autor, Administrador.

**Pré-condições:** Usuário autenticado com a permissão `trilhas.view_solution`.

**Fluxo principal:**
1. O autor pede a solução de um exercício pelo par trilha e exercício.
2. O sistema confere a permissão e devolve a solução.

**Regras de negócio:**
- RN01: A resposta não pode ser guardada em cache intermediário (`Cache-Control: private, no-store`).
- RN02: A rota tem limite de taxa próprio de 30 requisições por minuto.

**Pós-condições:** Solução entregue apenas a quem tem a permissão.

**Critérios de aceite:**
- CA01: Dado um aluno, quando pedir a solução, então o sistema deverá responder 403.
- CA02: Dado um autor, quando pedir a solução de um exercício em rascunho, então o sistema deverá devolvê-la.

**O que falta:** a regra está na API, mas o frontend não tem tela que consuma a rota.

**Fonte:** `backend/apps/autoria/views.py` (`SolucaoAutorView`), `backend/apps/autoria/urls.py`.

## 4. Progressão do aluno

### RF17. Iniciar trilha

**Prioridade:** Média · **Estado:** Implementado

**Descrição:** O sistema deverá registrar que o aluno iniciou uma trilha publicada.

**Atores:** Aluno.

**Pré-condições:** Aluno autenticado com a permissão `trilhas.enroll`; trilha publicada.

**Fluxo principal:**
1. O aluno aciona "Iniciar trilha".
2. O sistema registra a trilha como iniciada.
3. A tela passa a mostrar a trilha como em andamento.

**Regras de negócio:**
- RN01: A operação é idempotente: a primeira chamada responde 201 e as seguintes 200, com o mesmo corpo.

**Pós-condições:** Trilha presente na lista de trilhas iniciadas do aluno.

**Critérios de aceite:**
- CA01: Dado um aluno que já iniciou a trilha, quando acionar de novo, então o sistema deverá responder 200 sem criar outro registro.
- CA02: Dada uma trilha em rascunho, quando o aluno tentar iniciá-la, então o sistema deverá responder 404.

**Fonte:** `backend/apps/progressao/views.py` (`IniciarTrilhaView`), `backend/apps/progressao/services.py` (`iniciar_trilha`), `frontend/src/components/trilhas/BotaoIniciarTrilha.tsx`.

### RF18. Concluir exercício e creditar XP

**Prioridade:** Alta · **Estado:** Implementado

**Descrição:** O sistema deverá registrar a conclusão de um exercício e creditar XP
à criatura ativa do aluno, conforme a dificuldade e o bônus da trilha.

**Atores:** Aluno, Sistema.

**Pré-condições:** Aluno autenticado com `exercicios.complete`, exercício publicado e uma criatura ativa.

**Fluxo principal:**
1. O aluno conclui a fase: no exercício teórico, pelo botão de conclusão; no de código, por um envio aprovado (RF21).
2. O sistema calcula o XP: 50 (iniciante), 100 (intermediário) ou 200 (avançado), multiplicado pelo bônus da criatura na trilha, se houver.
3. O sistema soma o XP à criatura ativa e recalcula o nível.
4. A resposta informa o XP ganho, o novo nível e se a criatura já pode evoluir.

**Regras de negócio:**
- RN01: O valor do XP é sempre calculado no servidor; nenhuma rota aceita XP vindo do cliente.
- RN02: Cada exercício credita XP uma única vez por conta; repetir responde `ja_concluido` sem somar.
- RN03: Só a criatura ativa recebe XP.
- RN04: Em exercício com correção automática, só o envio aprovado conclui.

**Pós-condições:** Evento de XP gravado, XP e nível da criatura atualizados.

**Critérios de aceite:**
- CA01: Dado um exercício intermediário sem bônus, quando concluído pela primeira vez, então a criatura ativa deverá ganhar 100 XP.
- CA02: Dado um exercício já concluído, quando concluído de novo, então o XP não deverá mudar e a resposta deverá trazer `ja_concluido`.
- CA03: Dadas duas conclusões simultâneas de exercícios diferentes, quando processadas, então o XP final deverá somar as duas.
- CA04: Dado um exercício de código, quando o envio for reprovado, então nenhum XP deverá ser creditado.

**Fonte:** `backend/apps/progressao/views.py` (`ConcluirExercicioView`), `backend/apps/progressao/services.py` (`creditar_exercicio`, `XP_POR_DIFICULDADE`), `backend/apps/progressao/models.py` (`EventoXP`), `frontend/src/components/trilhas/BotaoConclusao.tsx`.

### RF19. Consultar progresso do aluno

**Prioridade:** Alta · **Estado:** Implementado

**Descrição:** O sistema deverá informar ao aluno o XP e o nível da criatura ativa,
quanto falta para o próximo nível, as trilhas iniciadas e os exercícios concluídos.

**Atores:** Aluno.

**Pré-condições:** Aluno autenticado.

**Fluxo principal:**
1. A interface consulta o progresso ao carregar a área logada.
2. O sistema devolve XP, nível e distância para o próximo nível.
3. A interface consulta as trilhas iniciadas e os exercícios concluídos, com filtro opcional por trilha.
4. A tela atualiza barras, percentuais e marcações das fases.

**Regras de negócio:**
- RN01: Sem criatura ativa, a rota de progresso responde 204.
- RN02: O progresso vive no servidor, não no navegador.

**Pós-condições:** Progresso apresentado.

**Critérios de aceite:**
- CA01: Dado um aluno sem criatura ativa, quando consultar o progresso, então o sistema deverá responder 204.
- CA02: Dado o filtro `?trilha=<slug>`, quando o aluno consultar os concluídos, então só deverão vir conclusões dessa trilha.

**Fonte:** `backend/apps/progressao/views.py` (`MeuProgressoView`, `MinhasTrilhasIniciadasView`, `MeusExerciciosConcluidosView`), `frontend/src/components/progresso/ProvedorProgresso.tsx`, `frontend/src/lib/progresso.ts`.

## 5. Correção automática de código

### RF20. Executar código contra casos visíveis

**Prioridade:** Alta · **Estado:** Implementado

**Descrição:** O sistema deverá permitir que o aluno execute sua solução contra os
casos de teste visíveis do exercício, recebendo saída e erros para depurar, sem
ganhar XP.

**Atores:** Aluno, Judge0.

**Pré-condições:** Aluno autenticado com `submissoes.create`; exercício publicado com especificação de código.

**Fluxo principal:**
1. O aluno abre o exercício e recebe a especificação: função esperada, código inicial, requisitos e casos visíveis.
2. O aluno escreve o código no editor e aciona "Executar".
3. O sistema analisa a AST (sintaxe, função esperada, construções exigidas ou proibidas).
4. Se a análise passar, o sistema envia o código ao Judge0 com o harness dos casos visíveis.
5. O sistema devolve o resultado de cada caso, a saída e o erro.

**Regras de negócio:**
- RN01: A única linguagem suportada hoje é Python.
- RN02: O código tem no máximo 10.000 caracteres.
- RN03: Código barrado pela análise da AST não consome chamada ao Judge0.
- RN04: Valem os limites de uso do RNF17.

**Pós-condições:** Submissão do modo executar registrada; nenhum XP creditado.

**Critérios de aceite:**
- CA01: Dado um código com erro de sintaxe, quando executado, então o sistema deverá apontar o erro sem chamar o Judge0.
- CA02: Dado um código que não define a função esperada, quando executado, então o sistema deverá recusar com a mensagem correspondente.
- CA03: Dado o Judge0 sem configuração, quando o aluno executar, então o sistema deverá responder 503.

**Fonte:** `backend/apps/correcao/views.py` (`EspecificacaoView`, `ExecutarCodigoView`), `backend/apps/correcao/services.py`, `backend/apps/correcao/analise_ast.py`, `backend/apps/correcao/harness.py`, `frontend/src/components/exercicio/AreaDeResolucao.tsx`, `frontend/src/components/exercicio/EditorDeCodigo.tsx`.

### RF21. Enviar código para correção automática

**Prioridade:** Alta · **Estado:** Implementado

**Descrição:** O sistema deverá corrigir a solução do aluno contra todos os casos de
teste, visíveis e ocultos, e concluir o exercício quando todos passarem.

**Atores:** Aluno, Judge0, Sistema.

**Pré-condições:** As mesmas do RF20, mais `exercicios.complete` e criatura ativa para receber o XP.

**Fluxo principal:**
1. O aluno aciona "Enviar".
2. O sistema executa a mesma análise da AST do RF20.
3. O sistema corrige o código no Judge0 contra todos os casos.
4. Se todos passarem, o sistema conclui o exercício e credita o XP (RF18).
5. A resposta mostra o veredito; dos casos ocultos, apenas se passaram.

**Regras de negócio:**
- RN01: Dos casos ocultos não são revelados argumentos nem resultado esperado.
- RN02: Um código idêntico corrigido nos últimos 10 minutos reaproveita o resultado guardado (RNF16).

**Pós-condições:** Submissão registrada com o veredito; exercício concluído se aprovado.

**Critérios de aceite:**
- CA01: Dado um código que passa nos visíveis e falha num oculto, quando enviado, então o veredito deverá ser reprovado e a resposta não deverá conter os argumentos do caso oculto.
- CA02: Dado um código aprovado, quando enviado, então o exercício deverá constar entre os concluídos do aluno.

**Fonte:** `backend/apps/progressao/views.py` (`ConcluirExercicioView`), `backend/apps/correcao/services.py` (`corrigir_envio`), `backend/apps/correcao/judge0.py`, `frontend/src/components/exercicio/ResultadoDosCasos.tsx`.

## 6. Gamificação

### RF22. Escolher criatura inicial

**Prioridade:** Alta · **Estado:** Implementado

**Descrição:** O sistema deverá permitir que o aluno escolha uma única criatura
inicial entre as disponíveis, que passa a ser a criatura ativa.

**Atores:** Aluno.

**Pré-condições:** Aluno autenticado com `criaturas.acquire` e sem criatura inicial.

**Fluxo principal:**
1. Ao entrar sem nenhuma criatura, o aluno é levado à tela de escolha.
2. O aluno escolhe uma criatura disponível.
3. O sistema registra a posse como inicial e ativa, no estágio filhote.

**Regras de negócio:**
- RN01: Cada aluno tem no máximo uma criatura inicial, garantido por restrição no banco.
- RN02: A escolha é atômica: pedidos simultâneos não entregam duas iniciais.
- RN03: Só criaturas marcadas como disponíveis podem ser escolhidas.

**Pós-condições:** Aluno com uma criatura inicial ativa.

**Critérios de aceite:**
- CA01: Dado um aluno que já escolheu, quando tentar escolher outra inicial, então o sistema deverá recusar com `inicial_ja_escolhida`.

**Fonte:** `backend/apps/gamificacao/views.py` (`MinhasCriaturasView`), `backend/apps/gamificacao/services.py` (`select_starter_creature`), `backend/apps/gamificacao/models/ownership.py`, `frontend/src/app/escolher-criatura/page.tsx`.

### RF23. Adquirir nova criatura

**Prioridade:** Média · **Estado:** Implementado

**Descrição:** O sistema deverá permitir que o aluno adquira outras criaturas do
catálogo além da inicial.

**Atores:** Aluno.

**Pré-condições:** Aluno autenticado com `criaturas.acquire`.

**Fluxo principal:**
1. O aluno abre a tela da criatura e escolhe uma criatura do catálogo.
2. O sistema registra a posse, que começa no nível 1, e registra a aquisição na auditoria.

**Regras de negócio:**
- RN01: O aluno não pode possuir a mesma criatura duas vezes.
- RN02: A criatura nova começa no nível 1, mesmo numa conta com outras criaturas avançadas.

**Pós-condições:** Nova criatura na equipe do aluno.

**Critérios de aceite:**
- CA01: Dada uma criatura que o aluno já possui, quando ele tentar adquiri-la, então o sistema deverá recusar com `criatura_ja_possuida`.

**Fonte:** `backend/apps/gamificacao/views.py` (`AdquirirCriaturaView`), `backend/apps/gamificacao/services.py` (`adquirir_criatura`), `frontend/src/components/criatura/PainelCriatura.tsx`.

### RF24. Definir criatura ativa

**Prioridade:** Média · **Estado:** Implementado

**Descrição:** O sistema deverá permitir que o aluno escolha qual das suas criaturas
fica ativa e recebe o XP.

**Atores:** Aluno.

**Pré-condições:** Aluno autenticado com `criaturas.view` e dono da criatura escolhida.

**Fluxo principal:**
1. O aluno escolhe uma criatura da equipe.
2. O sistema a marca como ativa e desmarca a anterior.

**Regras de negócio:**
- RN01: No máximo uma criatura ativa por aluno, garantido por restrição no banco.

**Pós-condições:** XP das próximas conclusões direcionado à nova criatura ativa.

**Critérios de aceite:**
- CA01: Dada uma criatura que o aluno não possui, quando ele tentar ativá-la, então o sistema deverá recusar com `criatura_nao_possuida`.

**Fonte:** `backend/apps/gamificacao/views.py` (`CriaturaAtivaView`), `backend/apps/gamificacao/services.py` (`definir_criatura_ativa`), `frontend/src/components/criaturas/SeletorAtiva.tsx`.

### RF25. Evoluir criatura

**Prioridade:** Média · **Estado:** Implementado

**Descrição:** O sistema deverá permitir que o aluno evolua a criatura para o
próximo estágio (filhote, jovem, adulto) quando o nível dela permitir.

**Atores:** Aluno.

**Pré-condições:** Aluno autenticado com `criaturas.evolve`; a criatura atingiu o nível mínimo do próximo estágio.

**Fluxo principal:**
1. Ao concluir um exercício, a resposta indica `pode_evoluir`.
2. O aluno aciona a evolução quando quiser.
3. O sistema avança um estágio e registra a evolução na auditoria.
4. A tela exibe a animação de evolução.

**Regras de negócio:**
- RN01: A evolução não é automática; depende da ação do aluno.
- RN02: Avança um estágio por vez, mesmo que o nível permita dois.
- RN03: O estágio nunca regride.

**Pós-condições:** Criatura no novo estágio.

**Critérios de aceite:**
- CA01: Dada uma criatura abaixo do nível do próximo estágio, quando o aluno tentar evoluir, então o sistema deverá recusar.
- CA02: Dada uma criatura filhote com nível de adulto, quando o aluno evoluir uma vez, então ela deverá passar para jovem, não para adulto.

**Fonte:** `backend/apps/gamificacao/views.py` (`EvoluirCriaturaView`), `backend/apps/progressao/services.py` (`evoluir_criatura`), `frontend/src/components/gamificacao/TelaDeEvolucao.tsx`.

### RF26. Consultar criaturas e bônus de XP

**Prioridade:** Média · **Estado:** Implementado

**Descrição:** O sistema deverá apresentar o catálogo público de criaturas e, ao
aluno, suas criaturas com estágio e nível e os bônus de XP que valem para elas.

**Atores:** Visitante, Aluno.

**Pré-condições:** Nenhuma para o catálogo; `criaturas.view` para as rotas do aluno.

**Fluxo principal:**
1. O usuário consulta o catálogo, com os estágios de cada criatura.
2. O aluno consulta a própria equipe e os bônus aplicáveis.
3. A tela de trilhas exibe o selo de bônus nas trilhas do domínio da criatura.

**Regras de negócio:**
- RN01: Existe exatamente uma criatura por domínio de conhecimento.
- RN02: O bônus padrão semeado é XP em dobro na trilha do domínio da criatura (`seed_bonus_xp`).

**Pós-condições:** Informações apresentadas.

**Critérios de aceite:**
- CA01: Dado um aluno sem criaturas, quando consultar os bônus, então a resposta deverá ser uma lista vazia.

**Fonte:** `backend/apps/gamificacao/views.py` (`CatalogoCriaturasView`, `MeusBonusView`), `backend/apps/gamificacao/models/catalog.py`, `backend/apps/gamificacao/models/bonus.py`, `frontend/src/components/gamificacao/SeloBonusXp.tsx`.

### RF27. Apresentar desafios do dia

**Prioridade:** Baixa · **Estado:** Implementado

**Descrição:** O sistema deverá sugerir ao aluno, a cada dia, três exercícios
escolhidos do catálogo publicado, como atalho para as fases.

**Atores:** Aluno.

**Pré-condições:** Aluno autenticado com `trilhas.view`.

**Fluxo principal:**
1. O aluno abre "Desafio do dia".
2. A tela escolhe três exercícios publicados a partir da data local.
3. Cada cartão leva à fase correspondente.

**Regras de negócio:**
- RN01: A escolha é determinística pela data: no mesmo dia, a lista é a mesma.
- RN02: O desafio não dá XP extra; o crédito continua sendo o da conclusão da fase (RF18).

**Pós-condições:** Lista de desafios apresentada.

**Critérios de aceite:**
- CA01: Dada a mesma data, quando a lista for gerada duas vezes, então os três exercícios deverão ser os mesmos.

**Fonte:** `frontend/src/lib/desafios.ts`, `frontend/src/app/(app)/desafios/page.tsx`, `frontend/src/components/desafios/PainelDeDesafios.tsx`.

## 7. Privacidade e LGPD

### RF28. Consultar histórico da própria atividade

**Prioridade:** Média · **Estado:** Implementado

**Descrição:** O sistema deverá permitir que o titular consulte, de forma paginada,
os eventos da trilha de auditoria que dizem respeito a ele.

**Atores:** Aluno, Autor, Administrador.

**Pré-condições:** Usuário autenticado.

**Fluxo principal:**
1. O titular abre a seção de atividade nas configurações.
2. O sistema devolve as suas linhas da auditoria, cinco por página.

**Regras de negócio:**
- RN01: Cada titular vê apenas as próprias linhas.
- RN02: Ações administrativas (como a consulta à auditoria) não entram no histórico do titular.

**Pós-condições:** Histórico apresentado.

**Critérios de aceite:**
- CA01: Dado o usuário A, quando consultar a atividade, então nenhuma linha do usuário B deverá aparecer.

**Fonte:** `backend/apps/auditoria/views.py` (`MinhaAtividadeView`), `backend/apps/auditoria/models.py` (`ACOES_DO_TITULAR`), `frontend/src/components/configuracoes/SecaoAtividade.tsx`.

### RF29. Exportar dados pessoais

**Prioridade:** Alta · **Estado:** Implementado

**Descrição:** O sistema deverá entregar ao titular, em JSON, os seus dados pessoais:
perfil, aceites, trilhas iniciadas, eventos de XP, criaturas e atividade.

**Atores:** Aluno, Autor, Administrador.

**Pré-condições:** Usuário autenticado.

**Fluxo principal:**
1. O titular aciona a exportação na seção "Meus dados".
2. O sistema monta o pacote e o devolve em JSON.
3. O sistema registra `EXPORTACAO_DADOS` na auditoria.

**Regras de negócio:**
- RN01: O pacote contém apenas dados do próprio titular.
- RN02: Senha, tokens e segredos do 2FA não fazem parte do pacote.

**Pós-condições:** Arquivo entregue e exportação registrada.

**Critérios de aceite:**
- CA01: Dado um titular com dois eventos de XP, quando exportar, então o pacote deverá conter os dois eventos.
- CA02: Dado qualquer titular, quando exportar, então o pacote não deverá conter o hash da senha.

**Fonte:** `backend/apps/contas/views.py` (`ExportarDadosView`), `backend/apps/contas/lgpd.py` (`exportar_dados`), `frontend/src/components/configuracoes/SecaoMeusDados.tsx`.

### RF30. Renovar consentimento dos documentos legais

**Prioridade:** Média · **Estado:** Parcial

**Descrição:** O sistema deverá informar ao titular quando a versão vigente dos
Termos de Uso ou da Política de Privacidade mudar e registrar o novo aceite.

**Atores:** Aluno, Autor, Administrador.

**Pré-condições:** Usuário autenticado.

**Fluxo principal (previsto):**
1. O sistema compara a versão vigente de cada documento com a última aceita.
2. Havendo pendência, a interface apresenta o documento atualizado.
3. O titular aceita.
4. O sistema registra o aceite das versões pendentes, com data e IP, e o evento `CONSENTIMENTO_ACEITO`.

**Regras de negócio:**
- RN01: Só as versões ainda não aceitas são registradas.
- RN02: O histórico de aceites anteriores é preservado como prova.

**Pós-condições:** Aceite da versão vigente registrado.

**Critérios de aceite:**
- CA01: Dado um titular que aceitou a versão 1.1 e a vigente é 1.2, quando consultar os consentimentos, então o documento deverá aparecer como pendente.
- CA02: Dado o aceite das pendências, quando consultado de novo, então nenhum documento deverá aparecer como pendente.

**O que falta:** a API (`/auth/eu/consentimentos/` e `/aceitar/`) e as funções do
cliente em `frontend/src/lib/api.ts` existem, mas nenhuma tela as chama; o titular
não é avisado da nova versão na interface.

**Fonte:** `backend/apps/contas/views.py` (`ConsentimentosView`, `AceitarConsentimentosView`), `backend/apps/contas/documentos.py`, `backend/apps/contas/models.py` (`AceiteDeTermos.registrar_pendentes`).

### RF31. Excluir conta por anonimização

**Prioridade:** Alta · **Estado:** Implementado

**Descrição:** O sistema deverá permitir que o titular exclua a própria conta em dois
passos: pedido autenticado e confirmação por link enviado ao e-mail, com a senha.

**Atores:** Aluno, Autor, Administrador, Sistema.

**Pré-condições:** Usuário autenticado (passo 1) e de posse do link e da senha (passo 2).

**Fluxo principal:**
1. O titular pede a exclusão na zona de risco das configurações.
2. O sistema envia o link de confirmação e registra `EXCLUSAO_SOLICITADA`.
3. O titular abre o link e informa a senha.
4. O sistema encerra todas as sessões e anonimiza a conta na hora.

**Regras de negócio:**
- RN01: O link vale 30 minutos (`EXCLUSAO_TOKEN_MAX_AGE`) e deixa de valer se a senha mudar.
- RN02: A anonimização embaralha e-mail e nickname, inutiliza a senha e desativa a conta.
- RN03: São apagados também o e-mail guardado nos registros de auditoria e o IP dos aceites.
- RN04: Agregados (eventos de XP) e a prova de aceite dos termos são mantidos.
- RN05: A operação é atômica: se o registro `CONTA_ANONIMIZADA` não puder ser gravado, nada é anonimizado.
- RN06: A exclusão é definitiva e não tem prazo de arrependimento.

**Pós-condições:** Conta anonimizada e inativa, sem sessão.

**Critérios de aceite:**
- CA01: Dado o pedido do passo 1, quando o link ainda não foi confirmado, então a conta deverá continuar intacta.
- CA02: Dada a confirmação com senha correta, quando concluída, então o login com o e-mail antigo deverá falhar.
- CA03: Dada a confirmação, quando concluída, então nenhum registro de auditoria do titular deverá conter o e-mail original.

**Fonte:** `backend/apps/contas/views.py` (`SolicitarExclusaoView`, `ConfirmarExclusaoView`), `backend/apps/contas/exclusao.py`, `backend/apps/contas/lgpd.py` (`anonimizar_conta`), `backend/apps/contas/models.py` (`User.anonimizar`), `frontend/src/components/configuracoes/SecaoZonaRisco.tsx`, `frontend/src/app/confirmar-exclusao/page.tsx`.

## 8. Auditoria e administração

### RF32. Registrar eventos na trilha de auditoria

**Prioridade:** Alta · **Estado:** Implementado

**Descrição:** O sistema deverá registrar os eventos sensíveis com data, autor, IP,
navegador e metadados não sensíveis.

**Atores:** Sistema.

**Pré-condições:** Ocorrência de um evento sensível.

**Fluxo principal:**
1. Uma operação sensível é concluída (login, falha de login, cadastro, verificação, redefinição de senha, troca de e-mail, 2FA, exportação, consentimento, exclusão, criatura adquirida ou evoluída, mudança de nível de acesso, consulta à auditoria).
2. O sistema grava um registro com o código da ação.

**Regras de negócio:**
- RN01: Um registro gravado não pode ser alterado (append-only).
- RN02: Senhas, tokens e conteúdo sensível nunca são gravados.

**Pós-condições:** Evento registrado.

**Critérios de aceite:**
- CA01: Dado um registro existente, quando o código tentar alterá-lo, então o sistema deverá recusar a gravação.
- CA02: Dada uma falha de login, quando registrada, então os metadados não deverão conter a senha tentada.

**Fonte:** `backend/apps/auditoria/models.py` (`RegistroDeAuditoria`, `AcaoAuditoria`), `backend/apps/auditoria/services.py` (`registrar`).

### RF33. Consultar trilha de auditoria

**Prioridade:** Média · **Estado:** Parcial

**Descrição:** O sistema deverá permitir que usuários com a permissão
`auditoria.view` consultem toda a trilha de auditoria, com filtros por ação, autor
e período.

**Atores:** Administrador.

**Pré-condições:** Usuário autenticado com `auditoria.view`.

**Fluxo principal:**
1. O administrador consulta a auditoria, opcionalmente com os filtros `acao`, `actor`, `desde` e `ate`.
2. O sistema devolve os registros paginados (50 por página, até 200).
3. O sistema registra a própria consulta como `ACESSO_AUDITORIA`.

**Regras de negócio:**
- RN01: A consulta à auditoria também é auditada, com os filtros usados.

**Pós-condições:** Registros apresentados e consulta registrada.

**Critérios de aceite:**
- CA01: Dado um aluno, quando consultar a auditoria, então o sistema deverá responder 403.
- CA02: Dado o filtro `acao=LOGIN_FALHA`, quando aplicado, então só deverão vir falhas de login.

**O que falta:** a consulta existe só na API; o painel `/admin` não tem tela de auditoria.

**Fonte:** `backend/apps/auditoria/views.py` (`AuditoriaListView`).

### RF34. Suspender e reativar conta

**Prioridade:** Baixa · **Estado:** Planejado

**Descrição:** O sistema deverá permitir que um administrador suspenda e reative
contas de usuários.

**Atores:** Administrador.

**O que existe:** a permissão `usuarios.suspend` no catálogo do RBAC, o campo
`is_active` (conta inativa não autentica) e os códigos de auditoria
`CONTA_SUSPENSA` e `CONTA_REATIVADA`, reservados e sem uso. Não há rota nem tela
para suspender ou reativar; por isso pré-condições, fluxo e critérios de aceite
não são detalhados aqui.

**Fonte:** `backend/apps/contas/rbac.py`, `backend/apps/auditoria/models.py` (comentário de `AcaoAuditoria`).

## 9. Comunidade

### RF35. Gerenciar clãs

**Prioridade:** Média · **Estado:** Em desenvolvimento

**Descrição:** O sistema deverá permitir que alunos formem clãs (grupos) para
estudar juntos, criando, buscando, entrando e saindo de clãs, com papéis de
liderança e convites para clãs privados.

**Atores:** Aluno.

**Situação na `main`:** só existem as permissões `comunidades.create` e
`comunidades.join` no catálogo do RBAC, concedidas ao nível Aluno, sem rota nem
tela.

**Situação na branch `origin/feat/funcionalidade-cla`** (8 commits de Mauro
Junior, de 1 de outubro de 2026, ainda não integrados à `main`): app de backend
`clas` com modelos, serviços, rotas e testes para criar, consultar, editar,
buscar, entrar e sair de clã; gestão de membros com cargos (líder, co-líder e
membro), expulsão e transferência de liderança; link de convite para clã privado;
sucessão de liderança quando a conta do líder é excluída; auditoria, limites de
requisição, inclusão na exportação LGPD e filtro de palavras proibidas. A branch
não traz telas no frontend, só as imagens das bandeiras.

Fluxo, regras e critérios de aceite serão escritos quando a funcionalidade for
integrada à `main`, para descrever o comportamento revisado e não o de uma branch
em andamento.

**Fonte:** `backend/apps/contas/rbac.py` (`main`); `backend/apps/clas/` na branch `origin/feat/funcionalidade-cla`.
