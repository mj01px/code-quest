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

Base da verificação: branch `main` no commit `e0fd532` (15 de novembro de 2026).
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
(`backend/apps/contas/rbac.py:L13` e `NivelDeAcesso` em `backend/apps/contas/models.py:L356`).

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
| RF15 | Controlar fluxo editorial do conteúdo | Média | Implementado |
| RF16 | Consultar solução de referência | Baixa | Implementado |
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
| RF30 | Renovar consentimento dos documentos legais | Média | Implementado |
| RF31 | Excluir conta por anonimização | Alta | Implementado |
| RF32 | Registrar eventos na trilha de auditoria | Alta | Implementado |
| RF33 | Consultar trilha de auditoria | Média | Implementado |
| RF34 | Suspender e reativar conta | Baixa | Implementado |
| RF35 | Gerenciar clãs | Média | Implementado |
| RF36 | Consultar ranking | Média | Implementado |
| RF37 | Consultar perfil público | Baixa | Implementado |

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
- RN01: A idade mínima é de 18 anos completos, calculada no servidor a partir da data de nascimento, que não é armazenada.
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

**Fonte:** `backend/apps/contas/views.py:L72` (`RegistrarView`), `backend/apps/contas/serializers.py:L122` (`RegistroSerializer`), `backend/apps/contas/validators.py:L13` (`IDADE_MINIMA_ANOS`, `calcular_idade` em `:L16`, `PasswordComplexityValidator` em `:L105`), `backend/apps/contas/cadastro_alerta.py:L28` (`avisar_tentativa_de_cadastro`), `frontend/src/app/cadastro/page.tsx:L11` (`PaginaCadastro`), `frontend/src/components/auth/FormularioCadastro.tsx:L50` (`FormularioCadastro`).

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

**Fonte:** `backend/apps/contas/views.py:L100` (`VerificarEmailView`), `backend/apps/contas/views.py:L122` (`ReenviarVerificacaoView`), `backend/apps/contas/verificacao.py:L55` (`enviar_verificacao`), `frontend/src/app/verificar-email/page.tsx:L15` (`PaginaVerificarEmail`), `frontend/src/app/confirmar-email/page.tsx:L15` (`PaginaConfirmarEmail`), `frontend/src/components/auth/PainelVerificarEmail.tsx:L48` (`PainelVerificarEmail`).

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

**Fonte:** `backend/apps/contas/views.py:L154` (`LoginView`), `backend/apps/contas/serializers.py:L228` (`LoginSerializer`), `backend/apps/contas/models.py:L267` (`registrar_falha_de_login`), `backend/apps/contas/cookies.py:L18` (`gravar_sessao`), `frontend/src/app/entrar/page.tsx:L11` (`PaginaEntrar`), `frontend/src/components/auth/FormularioLogin.tsx:L33` (`FormularioLogin`).

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

**Fonte:** `backend/apps/contas/views.py:L452` (`LoginMfaView`), `backend/apps/contas/mfa.py:L45` (`_hash`), `frontend/src/components/auth/FormularioLogin.tsx:L106` (passo de 2FA em `FormularioLogin`).

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

**Fonte:** `backend/apps/contas/views.py:L489` (`MfaIniciarView`), `backend/apps/contas/views.py:L518` (`MfaConfirmarView`), `backend/apps/contas/views.py:L555` (`MfaDesativarIniciarView`), `backend/apps/contas/views.py:L577` (`MfaDesativarView`), `backend/apps/contas/mfa.py:L45` (`_hash`), `frontend/src/components/configuracoes/SecaoSeguranca.tsx:L35` (`SecaoSeguranca`).

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

**Fonte:** `backend/apps/contas/views.py:L186` (`RenovarView`), `backend/apps/contas/views.py:L212` (`SairView`), `backend/config/settings.py:L216` (`SIMPLE_JWT`), `frontend/src/lib/api.ts:L254` (`renovarSessao`).

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

**Fonte:** `backend/apps/contas/views.py:L313` (`SenhaEsquecidaView`), `backend/apps/contas/views.py:L333` (`RedefinirSenhaView`), `backend/apps/contas/senha.py:L60` (`enviar_redefinicao`), `frontend/src/app/recuperar-senha/page.tsx:L11` (`PaginaRecuperarSenha`), `frontend/src/app/redefinir-senha/page.tsx:L15` (`PaginaRedefinirSenha`), `frontend/src/components/auth/FormularioSenhaEsquecida.tsx:L17` (`FormularioSenhaEsquecida`).

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

**Fonte:** `backend/apps/contas/views.py:L232` (`EuView`), `frontend/src/components/configuracoes/PainelConfiguracoes.tsx:L21` (`PainelConfiguracoes`), `frontend/src/components/configuracoes/SecaoPerfil.tsx:L30` (`SecaoPerfil`).

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

**Fonte:** `backend/apps/contas/views.py:L250` (`TrocarEmailView`), `backend/apps/contas/views.py:L274` (`ConfirmarTrocaEmailView`), `backend/apps/contas/troca_email.py:L85` (`enviar_troca_email`), `frontend/src/components/configuracoes/PainelConfiguracoes.tsx:L133` (`PainelConfiguracoes`), `frontend/src/components/__tests__/ConfirmarTrocaEmail.test.tsx:L22` (`PainelConfirmarEmail`).

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

**Fonte:** `backend/apps/contas/views_rbac.py:L71` (`NivelListCreateView`), `backend/apps/contas/views_rbac.py:L91` (`NivelDetailView`), `backend/apps/contas/rbac.py:L13` (`CATALOG`), `backend/apps/core/permissions.py:L18` (`HasPerm`), `frontend/src/components/admin/GestaoNiveis.tsx:L25` (`GestaoNiveis`).

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

**Fonte:** `backend/apps/contas/views_rbac.py:L159` (`UsuarioListView`), `backend/apps/contas/views_rbac.py:L247` (`UsuarioNivelView`), `backend/apps/contas/models.py:L212` (`has_perm`), `frontend/src/components/admin/ModalAtribuirNivel.tsx:L35` (`ModalAtribuirNivel`).

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

**Fonte:** `backend/apps/trilhas/views.py:L43` (`TrilhaListView`), `frontend/src/app/(app)/trilhas/page.tsx:L12` (`TrilhasPage`), `frontend/src/components/trilhas/PainelDeTrilhas.tsx:L101` (`PainelDeTrilhas`), `frontend/src/components/trilhas/ListaDeTrilhas.tsx:L30` (`ListaDeTrilhas`).

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

**Fonte:** `backend/apps/trilhas/views.py:L77` (`TrilhaDetailView`), `backend/apps/trilhas/models.py:L238` (`Aula.clean`), `frontend/src/app/(app)/trilhas/[trilhaSlug]/page.tsx:L57` (`TrilhaPage`), `frontend/src/components/trilhas/MapaDeFases.tsx:L12` (`MapaDeFases`), `frontend/src/components/trilhas/CartaoDestaque.tsx:L16` (`CartaoDestaque`).

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

**Fonte:** `backend/apps/trilhas/views.py:L101` (`ExercicioDetailView`), `backend/apps/trilhas/serializers.py:L116` (`ExercicioDetalheSerializer`), `frontend/src/app/(foco)/trilhas/[trilhaSlug]/exercicios/[exercicioSlug]/page.tsx:L78` (`ExercicioPage`).

### RF15. Controlar fluxo editorial do conteúdo

**Prioridade:** Média · **Estado:** Implementado

**Descrição:** O sistema deverá permitir que o autor crie conteúdo e o conduza pelos
estados RASCUNHO → REVISAO → APROVADO → PUBLICADO (trilhas, aulas, exercícios, e
dentro da aula, flashcards e questões de múltipla escolha), de modo que somente
conteúdo publicado chegue ao aluno, e que edições em conteúdos aprovados ou publicados
guardem a versão anterior, retornem à revisão e exibam o diff para o revisor.

**Atores:** Autor, Revisor, Administrador.

**Pré-condições:** Usuário autenticado com a permissão da etapa. Quem ainda não é
autor pede acesso em `/ser-autor` e o administrador aprova o pedido.

**Fluxo principal:**
1. O usuário solicita autoria em `/ser-autor`; o administrador aprova ou rejeita a solicitação.
2. O autor cria o conteúdo em `/autoria/novo`: trilha, aula e exercício, com flashcards e questões de múltipla escolha dentro da aula. Tudo nasce em rascunho, com ele como autor.
3. Em `/autoria`, o autor acompanha na aba "Meus Conteúdos" tudo o que criou com o status atual, edita rascunhos, aprovados ou publicados e envia rascunhos para revisão.
4. Quando um conteúdo em `APROVADO` ou `PUBLICADO` é editado com alteração efetiva de texto, o sistema salva a versão anterior em `conteudo_anterior` e reabre o item em `REVISAO`.
5. O revisor abre a fila de revisão, consulta o conteúdo e o diff de alterações no modal e aprova (regra dos quatro olhos) ou devolve ao rascunho informando o parecer obrigatório.
6. Quem possui a permissão `trilhas.publish` (administrador) vê a lista de aprovados e publica o conteúdo.

**Regras de negócio:**
- RN01: A API pública só devolve conteúdo PUBLICADO.
- RN02: Cada transição exige a permissão correspondente (`trilhas.create`, `trilhas.submit_review`, `trilhas.review`, `trilhas.publish`); a publicação exige exclusivamente `trilhas.publish` e a aprovação exige pessoa distinta do autor (quatro olhos).
- RN03: A edição é permitida em `RASCUNHO`, `APROVADO` e `PUBLICADO` pelo dono (ou administrador), mas bloqueada em `REVISAO` ou quando a trilha ou aula pai está em revisão; se o conteúdo aprovado ou publicado mudar, ele volta para `REVISAO` guardando `conteudo_anterior`. A exclusão pelo autor vale apenas para rascunho inédito (`ja_foi_ao_ar` impede excluir item que já foi publicado).
- RN04: Aula, exercício, flashcard e questão só entram em pai do próprio autor (salvo administrador); flashcard e questão só são editados em aula em rascunho.
- RN05: Autor, status e slug não vêm do corpo da requisição: o servidor define. Na devolução para rascunho, o parecer do revisor é obrigatório.

**Pós-condições:** Conteúdo no novo estado editorial, versão anterior preservada quando reaberto para revisão e ação registrada na auditoria.

**Critérios de aceite:**
- CA01: Dado um exercício em APROVADO, quando a API pública for consultada, então ele não deverá aparecer.
- CA02: Dado um autor sem `trilhas.publish`, quando tentar publicar um conteúdo aprovado, então o sistema deverá recusar com 403.
- CA03: Dado um autor, quando tentar editar o conteúdo de outro autor, então o sistema deverá recusar com 403.
- CA04: Dado um conteúdo em `PUBLICADO`, quando o autor alterar seu texto e salvar, então o sistema deverá gravar a versão anterior em `conteudo_anterior`, mudar o status para `REVISAO` e exibir o diff no modal de revisão.

**O que existe:** os quatro estados no modelo, o filtro de publicados em todas as
rotas públicas, as permissões no catálogo do RBAC, o comando de carga
idempotente (`seed_trilhas`) e as rotas de transição (`SubmeterRevisaoView`,
`AprovarView`, `DevolverView` com parecer obrigatório e `PublicarView` restrita a
`trilhas.publish`) para trilhas, aulas e exercícios. A edição de itens em
`APROVADO` e `PUBLICADO` (`EDITAVEIS` em `backend/apps/autoria/versoes.py:L28`) preserva a versão
anterior em `conteudo_anterior` (`backend/apps/trilhas/models.py:L124`, `:L206` e `:L451`) e
reabre o conteúdo em `REVISAO` (`reabrir_se_mudou` em `backend/apps/autoria/versoes.py:L98`), com
cálculo de diff por linha via `difflib` (`diff_editorial` em `backend/apps/autoria/versoes.py:L143`,
exposto em `DiffEditorialView` em `backend/apps/autoria/views.py:L723` e exibido por `DiffDaEdicao` em
`frontend/src/components/autoria/ModalVisualizacao.tsx:L205`). A aba "Meus Conteúdos" (`frontend/src/components/autoria/MeusConteudos.tsx:L30` e
`MeusConteudosView` em `backend/apps/autoria/views.py:L670`) lista todas as criações do autor logado.
O quiz de múltipla escolha da aula é corrigido no servidor (`ConcluirQuizView` em
`backend/apps/progressao/views.py:L342`).

**Fonte:** `backend/apps/autoria/views.py:L140` (`TransicaoEditorialView`, `SubmeterRevisaoView` em `:L151`, `AprovarView` em `:L156`, `DevolverView` em `:L162`, `PublicarView` em `:L183`, `MeusConteudosView` em `:L670`, `DiffEditorialView` em `:L723`), `backend/apps/autoria/services.py:L31` (`TRANSICOES`, `transicionar` em `:L434`, quatro olhos em `:L464`, `exigir_excluivel` em `:L535`), `backend/apps/autoria/versoes.py:L28` (`EDITAVEIS`, `antes_da_edicao` em `:L78`, `reabrir_se_mudou` em `:L98`, `diff_editorial` em `:L143`, `conteudos_do_autor` em `:L192`), `backend/apps/autoria/serializers.py:L138` (`AulaEditorialSerializer`), `backend/apps/trilhas/models.py:L9` (`StatusEditorial`, `Trilha.conteudo_anterior` em `:L124`, `Aula.conteudo_anterior` em `:L206`, `Flashcard` em `:L252`, `Questao` em `:L309`, `Exercicio.conteudo_anterior` em `:L451`), `backend/apps/contas/rbac.py:L13` (`CATALOG`), `frontend/src/app/(app)/autoria/novo/page.tsx:L12` (`PaginaNovoConteudo`), `frontend/src/app/(app)/ser-autor/page.tsx:L10` (`PaginaSerAutor`), `frontend/src/components/autoria/PainelAutoria.tsx:L66` (`PainelAutoria`), `frontend/src/components/autoria/MeusConteudos.tsx:L30` (`MeusConteudos`), `frontend/src/components/autoria/ModalVisualizacao.tsx:L205` (`DiffDaEdicao`), `frontend/src/components/autoria/EditorDeConteudo.tsx:L80` (`EditorDeConteudo`), `frontend/src/components/trilhas/QuizQuestao.tsx:L12` (`QuizQuestao`).

### RF16. Consultar solução de referência

**Prioridade:** Baixa · **Estado:** Implementado

**Descrição:** O sistema deverá permitir que autores e administradores consultem a
solução de referência de um exercício, publicado ou não, por uma rota própria e
pelo painel do mascote na tela do exercício.

**Atores:** Autor, Administrador.

**Pré-condições:** Usuário autenticado com a permissão `trilhas.view_solution`.

**Fluxo principal:**
1. O autor pede a solução de um exercício pelo par trilha e exercício na tela do exercício (`PetDoExercicio`).
2. O sistema confere a permissão `trilhas.view_solution` e devolve a solução com cabeçalho `Cache-Control: private, no-store`.

**Regras de negócio:**
- RN01: A resposta não pode ser guardada em cache intermediário (`Cache-Control: private, no-store`).
- RN02: A rota tem limite de taxa próprio de 30 requisições por minuto.

**Pós-condições:** Solução entregue apenas a quem tem a permissão.

**Critérios de aceite:**
- CA01: Dado um aluno, quando pedir a solução, então o sistema deverá responder 403.
- CA02: Dado um autor, quando pedir a solução de um exercício em rascunho, então o sistema deverá devolvê-la.

**Fonte:** `backend/apps/autoria/views.py:L94` (`SolucaoAutorView`), `backend/apps/autoria/urls.py:L77` (rota `solucao-autor`), `frontend/src/components/exercicio/PetDoExercicio.tsx:L30` (`PetDoExercicio`).

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

**Fonte:** `backend/apps/progressao/views.py:L137` (`IniciarTrilhaView`), `backend/apps/progressao/services.py:L258` (`iniciar_trilha`), `frontend/src/components/trilhas/BotaoIniciarTrilha.tsx:L23` (`BotaoIniciarTrilha`).

### RF18. Concluir exercício e creditar XP

**Prioridade:** Alta · **Estado:** Implementado

**Descrição:** O sistema deverá registrar a conclusão de um exercício e creditar XP
à criatura ativa do aluno, conforme a dificuldade e o bônus da trilha.

**Atores:** Aluno, Sistema.

**Pré-condições:** Aluno autenticado com `exercicios.complete`, exercício publicado e uma criatura ativa.

**Fluxo principal:**
1. O aluno conclui a fase: no exercício teórico, pelo botão de conclusão; no de código, digitando a solução no editor (com colagem bloqueada pelo aviso do Warden) e obtendo aprovação no envio (RF21).
2. O sistema calcula o XP: 50 (iniciante), 100 (intermediário) ou 200 (avançado), multiplicado pelo bônus da criatura na trilha, se houver.
3. O sistema soma o XP à criatura ativa e recalcula o nível.
4. A resposta informa o XP ganho, o novo nível e se a criatura já pode evoluir.

**Regras de negócio:**
- RN01: O valor do XP é sempre calculado no servidor; nenhuma rota aceita XP vindo do cliente.
- RN02: Cada exercício credita XP uma única vez por conta; repetir responde `ja_concluido` sem somar.
- RN03: Só a criatura ativa recebe XP.
- RN04: Em exercício com correção automática, só o envio aprovado conclui, e o editor de código bloqueia a colagem (`Ctrl+V`/`Cmd+V` e evento `paste`) exibindo o modal `"WARDEN.EXE"`.

**Pós-condições:** Evento de XP gravado, XP e nível da criatura atualizados.

**Critérios de aceite:**
- CA01: Dado um exercício intermediário sem bônus, quando concluído pela primeira vez, então a criatura ativa deverá ganhar 100 XP.
- CA02: Dado um exercício já concluído, quando concluído de novo, então o XP não deverá mudar e a resposta deverá trazer `ja_concluido`.
- CA03: Dadas duas conclusões simultâneas de exercícios diferentes, quando processadas, então o XP final deverá somar as duas.
- CA04: Dado um exercício de código, quando o envio for reprovado, então nenhum XP deverá ser creditado.

**Fonte:** `backend/apps/progressao/views.py:L183` (`ConcluirExercicioView`), `backend/apps/progressao/services.py:L545` (`creditar_exercicio`, `XP_POR_DIFICULDADE` em `:L37`), `backend/apps/progressao/models.py:L77` (`EventoXP`), `frontend/src/components/exercicio/PainelDeCodigo.tsx:L160` (`PainelDeCodigo`), `frontend/src/components/exercicio/EditorDeCodigo.tsx:L112` (`EditorDeCodigo`, `AvisoDoWarden` em `:L60`, bloqueio em `:L144` e `:L157`), `frontend/src/components/exercicio/useRespostaEscrita.ts:L19` (`useRespostaEscrita`).

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

**Fonte:** `backend/apps/progressao/views.py:L70` (`MeuProgressoView`), `backend/apps/progressao/views.py:L165` (`MinhasTrilhasIniciadasView`), `backend/apps/progressao/views.py:L286` (`MeusExerciciosConcluidosView`), `frontend/src/components/progresso/ProvedorProgresso.tsx:L82` (`ProvedorProgresso`), `frontend/src/lib/progresso.ts:L11` (`chaveDaFase`).

## 5. Correção automática de código

### RF20. Executar código contra casos visíveis

**Prioridade:** Alta · **Estado:** Implementado

**Descrição:** O sistema deverá permitir que o aluno digite e execute sua solução
contra os casos de teste visíveis do exercício, recebendo saída e erros para
depurar, sem ganhar XP, bloqueando a colagem de código pronto no editor.

**Atores:** Aluno, Judge0.

**Pré-condições:** Aluno autenticado com `submissoes.create`; exercício publicado com especificação de código.

**Fluxo principal:**
1. O aluno abre o exercício e recebe a especificação: função esperada, código inicial, requisitos e casos visíveis.
2. O aluno digita o código no editor (tentativas de colar via `Ctrl+V`/`Cmd+V` ou menu de contexto são interceptadas e abrem o aviso do `"WARDEN.EXE"`) e aciona "Executar".
3. O sistema analisa a AST (sintaxe, função esperada, construções exigidas ou proibidas).
4. Se a análise passar, o sistema envia o código ao Judge0 com o harness dos casos visíveis.
5. O sistema devolve o resultado de cada caso, a saída e o erro.

**Regras de negócio:**
- RN01: A única linguagem suportada hoje é Python.
- RN02: O código tem no máximo 10.000 caracteres.
- RN03: Código barrado pela análise da AST não consome chamada ao Judge0.
- RN04: Valem os limites de uso do RNF17.
- RN05: O editor de código bloqueia colagem (`onKeyDownCapture` para `Ctrl+V`/`Cmd+V` e `onPasteCapture`) e exibe o modal pedagógico `"WARDEN.EXE"` (`AvisoDoWarden`).

**Pós-condições:** Submissão do modo executar registrada; nenhum XP creditado.

**Critérios de aceite:**
- CA01: Dado um código com erro de sintaxe, quando executado, então o sistema deverá apontar o erro sem chamar o Judge0.
- CA02: Dado um código que não define a função esperada, quando executado, então o sistema deverá recusar com a mensagem correspondente.
- CA03: Dado o Judge0 sem configuração, quando o aluno executar, então o sistema deverá responder 503.
- CA04: Dado o editor de código aberto, quando o aluno tentar colar texto (`Ctrl+V`, `Cmd+V` ou evento `paste`), então a colagem deverá ser impedida e o aviso `"WARDEN.EXE"` deverá ser exibido.

**Fonte:** `backend/apps/correcao/views.py:L62` (`EspecificacaoView`), `backend/apps/correcao/views.py:L81` (`ExecutarCodigoView`), `backend/apps/correcao/services.py:L536` (`executar_codigo`), `backend/apps/correcao/analise_ast.py:L134` (`verificar`), `backend/apps/correcao/harness.py:L117` (`montar_programa`), `frontend/src/components/exercicio/PainelDeCodigo.tsx:L136` (`PainelDeCodigo`), `frontend/src/components/exercicio/AreaDeResolucao.tsx:L27` (`AreaDeResolucao`), `frontend/src/components/exercicio/EditorDeCodigo.tsx:L112` (`EditorDeCodigo`, `AvisoDoWarden` em `:L60`, `onKeyDownCapture` em `:L144`, `onPasteCapture` em `:L157`).

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
- RN03: Assim como na execução (RF20), a digitação no editor tem colagem bloqueada pelo aviso do `"WARDEN.EXE"`.

**Pós-condições:** Submissão registrada com o veredito; exercício concluído se aprovado.

**Critérios de aceite:**
- CA01: Dado um código que passa nos visíveis e falha num oculto, quando enviado, então o veredito deverá ser reprovado e a resposta não deverá conter os argumentos do caso oculto.
- CA02: Dado um código aprovado, quando enviado, então o exercício deverá constar entre os concluídos do aluno.

**Fonte:** `backend/apps/progressao/views.py:L183` (`ConcluirExercicioView`, chamada de `corrigir_envio` em `:L247`), `backend/apps/correcao/services.py:L540` (`corrigir_envio`), `backend/apps/correcao/judge0.py:L19` (`LIMITES`), `frontend/src/components/exercicio/ResultadoDosCasos.tsx:L82` (`ResultadoDosCasos`), `frontend/src/components/exercicio/EditorDeCodigo.tsx:L112` (`EditorDeCodigo`, `AvisoDoWarden` em `:L60`).

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

**Fonte:** `backend/apps/gamificacao/views.py:L60` (`MinhasCriaturasView`), `backend/apps/gamificacao/services.py:L39` (`select_starter_creature`), `backend/apps/gamificacao/models/ownership.py:L8` (`UserCreature`, `UniqueConstraint` em `:L58`), `frontend/src/app/escolher-criatura/page.tsx:L11` (`PaginaEscolherCriatura`), `frontend/src/components/criaturas/SeletorCriatura.tsx:L10` (`SeletorCriatura`).

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

**Fonte:** `backend/apps/gamificacao/views.py:L99` (`AdquirirCriaturaView`), `backend/apps/gamificacao/services.py:L77` (`adquirir_criatura`), `frontend/src/components/criatura/PainelCriatura.tsx:L51` (`PainelCriatura`).

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

**Fonte:** `backend/apps/gamificacao/views.py:L122` (`CriaturaAtivaView`), `backend/apps/gamificacao/services.py:L118` (`definir_criatura_ativa`), `frontend/src/components/criaturas/SeletorAtiva.tsx:L96` (`SeletorAtiva`).

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

**Fonte:** `backend/apps/gamificacao/views.py:L152` (`EvoluirCriaturaView`), `backend/apps/progressao/services.py:L219` (`evoluir_criatura`), `frontend/src/components/gamificacao/TelaDeEvolucao.tsx:L148` (`TelaDeEvolucao`).

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

**Fonte:** `backend/apps/gamificacao/views.py:L45` (`CatalogoCriaturasView`), `backend/apps/gamificacao/views.py:L198` (`MeusBonusView`), `backend/apps/gamificacao/models/catalog.py:L41` (`Creature`), `backend/apps/gamificacao/models/bonus.py:L10` (`XpBonus`), `frontend/src/components/gamificacao/SeloBonusXp.tsx:L14` (`SeloBonusXp`).

### RF27. Apresentar desafios do dia

**Prioridade:** Baixa · **Estado:** Implementado

**Descrição:** O sistema deverá sugerir ao aluno, a cada dia, desafios escolhidos de
forma determinística do catálogo publicado, como atalho para as fases.

**Atores:** Aluno.

**Pré-condições:** Aluno autenticado com `trilhas.view`.

**Fluxo principal:**
1. O aluno abre "Desafio do dia".
2. O sistema calcula o desafio do dia e os próximos no fuso `America/Sao_Paulo` a partir do catálogo publicado.
3. Cada cartão leva à fase correspondente.

**Regras de negócio:**
- RN01: A escolha é determinística pela data: no mesmo dia, o desafio é o mesmo para todos os alunos.
- RN02: O desafio usa os exercícios publicados e o crédito de XP segue a regra normal de conclusão da fase (RF18).

**Pós-condições:** Desafio do dia e fila de próximos desafios apresentados.

**Critérios de aceite:**
- CA01: Dada a mesma data, quando o desafio for consultado duas vezes, então o exercício retornado deverá ser o mesmo.

**Fonte:** `backend/apps/trilhas/views.py:L125` (`DesafiosView`), `backend/apps/trilhas/views.py:L137` (`DesafioDeHojeView`), `backend/apps/trilhas/desafios.py:L22` (`rodizio`), `frontend/src/lib/desafios.ts:L34` (`diaEmSaoPaulo`), `frontend/src/app/(app)/desafios/page.tsx:L17` (`DesafiosPage`), `frontend/src/components/desafios/PainelDeDesafios.tsx:L20` (`PainelDeDesafios`).

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

**Fonte:** `backend/apps/auditoria/views.py:L111` (`MinhaAtividadeView`), `backend/apps/auditoria/models.py:L82` (`ACOES_DO_TITULAR`), `frontend/src/components/configuracoes/SecaoAtividade.tsx:L25` (`SecaoAtividade`).

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

**Fonte:** `backend/apps/contas/views.py:L368` (`ExportarDadosView`), `backend/apps/contas/lgpd.py:L12` (`exportar_dados`), `frontend/src/components/configuracoes/SecaoMeusDados.tsx:L6` (`SecaoMeusDados`).

### RF30. Renovar consentimento dos documentos legais

**Prioridade:** Média · **Estado:** Implementado

**Descrição:** O sistema deverá informar ao titular quando a versão vigente dos
Termos de Uso ou da Política de Privacidade mudar e registrar o novo aceite.

**Atores:** Aluno, Autor, Administrador.

**Pré-condições:** Usuário autenticado.

**Fluxo principal:**
1. O sistema compara a versão vigente de cada documento com a última aceita pelo titular.
2. Havendo pendência, a interface apresenta o modal bloqueante com o documento atualizado (`AvisoConsentimento`).
3. O titular aceita.
4. O sistema registra o aceite das versões pendentes, com data e IP, e o evento `CONSENTIMENTO_ACEITO`.

**Regras de negócio:**
- RN01: Só as versões ainda não aceitas são registradas.
- RN02: O histórico de aceites anteriores é preservado como prova.

**Pós-condições:** Aceite da versão vigente registrado.

**Critérios de aceite:**
- CA01: Dado um titular que aceitou a versão 1.1 e a vigente é 1.2, quando consultar os consentimentos, então o documento deverá aparecer como pendente.
- CA02: Dado o aceite das pendências, quando consultado de novo, então nenhum documento deverá aparecer como pendente.

**Fonte:** `backend/apps/contas/views.py:L382` (`ConsentimentosView`), `backend/apps/contas/views.py:L394` (`AceitarConsentimentosView`), `backend/apps/contas/documentos.py:L23` (`VIGENTES`), `backend/apps/contas/models.py:L476` (`AceiteDeTermos.registrar_pendentes`), `frontend/src/components/legal/AvisoConsentimento.tsx:L15` (`AvisoConsentimento`).

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

**Fonte:** `backend/apps/contas/views.py:L415` (`SolicitarExclusaoView`), `backend/apps/contas/views.py:L432` (`ConfirmarExclusaoView`), `backend/apps/contas/exclusao.py:L67` (`enviar_confirmacao_exclusao`), `backend/apps/contas/lgpd.py:L108` (`anonimizar_conta`), `backend/apps/contas/models.py:L292` (`User.anonimizar`), `frontend/src/components/configuracoes/SecaoZonaRisco.tsx:L6` (`SecaoZonaRisco`), `frontend/src/app/confirmar-exclusao/page.tsx:L15` (`PaginaConfirmarExclusao`).

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

**Fonte:** `backend/apps/auditoria/models.py:L113` (`RegistroDeAuditoria`, `AcaoAuditoria` em `:L9`), `backend/apps/auditoria/services.py:L58` (`registrar`).

### RF33. Consultar trilha de auditoria

**Prioridade:** Média · **Estado:** Implementado

**Descrição:** O sistema deverá permitir que usuários com a permissão
`auditoria.view` consultem toda a trilha de auditoria, com filtros por ação, autor
e período.

**Atores:** Administrador.

**Pré-condições:** Usuário autenticado com `auditoria.view`.

**Fluxo principal:**
1. O administrador consulta a auditoria no painel `/admin`, opcionalmente com os filtros `acao`, `actor`, `desde` e `ate`.
2. O sistema devolve os registros paginados (50 por página, até 200).
3. O sistema registra a própria consulta como `ACESSO_AUDITORIA`.

**Regras de negócio:**
- RN01: A consulta à auditoria também é auditada, com os filtros usados.

**Pós-condições:** Registros apresentados e consulta registrada.

**Critérios de aceite:**
- CA01: Dado um aluno, quando consultar a auditoria, então o sistema deverá responder 403.
- CA02: Dado o filtro `acao=LOGIN_FALHA`, quando aplicado, então só deverão vir falhas de login.

**Fonte:** `backend/apps/auditoria/views.py:L55` (`AuditoriaListView`), `backend/apps/progressao/views.py:L111` (`AdminLogsView`), `frontend/src/components/admin/GestaoAuditoria.tsx:L32` (`GestaoAuditoria`), `frontend/src/components/admin/LogsAuditoria.tsx:L17` (`LogsAuditoria`).

### RF34. Suspender e reativar conta

**Prioridade:** Baixa · **Estado:** Implementado

**Descrição:** O sistema deverá permitir que um administrador suspenda e reative
contas de usuários.

**Atores:** Administrador.

**Pré-condições:** Usuário autenticado num nível com `acesso_admin` e permissão `usuarios.suspend`.

**Fluxo principal:**
1. O administrador abre o modal de gestão do usuário no painel `/admin`.
2. O administrador aciona a suspensão (informando o motivo) ou a reativação da conta.
3. O sistema altera `is_active`, invalida as sessões ativas ao suspender e registra `CONTA_SUSPENSA` ou `CONTA_REATIVADA` na auditoria.

**Regras de negócio:**
- RN01: O administrador não pode suspender a própria conta.
- RN02: Conta anonimizada pela LGPD não pode ser reativada.
- RN03: Suspender uma conta encerra seus tokens de renovação ativos.

**Pós-condições:** Conta suspensa (impedida de autenticar) ou reativada, com registro na auditoria.

**Critérios de aceite:**
- CA01: Dado um administrador, quando tentar suspender a própria conta, então o sistema deverá recusar com 400.
- CA02: Dada uma conta suspensa, quando tentar autenticar ou renovar sessão, então o sistema deverá recusar.

**Fonte:** `backend/apps/contas/views_rbac.py:L295` (`UsuarioSituacaoView`), `backend/apps/contas/rbac.py:L50` (`usuarios.suspend`), `backend/apps/auditoria/models.py:L76` (`CONTA_SUSPENSA`, `CONTA_REATIVADA` em `:L77`), `frontend/src/components/admin/ModalAtribuirNivel.tsx:L125` (`alternarSituacao`, botão em `:L309`).

## 9. Comunidade

### RF35. Gerenciar clãs

**Prioridade:** Média · **Estado:** Implementado

**Descrição:** O sistema deverá permitir que alunos formem clãs (grupos) para
estudar juntos, criando, buscando, entrando e saindo de clãs, com papéis de
liderança (líder, co-líder e membro) e links de convite para clãs privados.

**Atores:** Aluno.

**Pré-condições:** Usuário autenticado com `comunidades.create` (para criar) e `comunidades.join` (para entrar).

**Fluxo principal:**
1. O aluno acessa `/clas` para buscar clãs existentes ou criar um novo clã (informando nome, descrição, bandeira, tipo aberto ou privado e nível mínimo).
2. Para clã aberto, o aluno que atende ao nível mínimo entra diretamente; para clã privado, entra por link de convite gerado pelo líder ou co-líder.
3. O líder e os co-líderes gerenciam os membros (promoção, rebaixamento, expulsão e transferência de liderança).
4. Ao sair do clã ou excluir a conta, se o usuário for o líder, a liderança passa ao membro mais antigo (co-líder primeiro) ou o clã é dissolvido se ficar vazio.

**Regras de negócio:**
- RN01: Cada usuário participa de no máximo um clã por vez (`OneToOneField` em `MembroDoCla`) e cada clã comporta até 50 membros.
- RN02: Criar clã exige nível mínimo 3 da criatura ativa (`NIVEL_MINIMO_CRIAR_CLA`).
- RN03: Nomes e descrições passam por validação contra palavras proibidas e a tag de 4 caracteres é gerada automaticamente.
- RN04: O token de convite para clã privado é armazenado apenas em hash SHA-256 e vale por 7 dias.

**Pós-condições:** Clã criado, atualizado ou dissolvido, ou vínculo de membro alterado, com registro na trilha de auditoria.

**Critérios de aceite:**
- CA01: Dado um aluno que já pertence a um clã, quando tentar criar ou entrar em outro clã, então o sistema deverá recusar com 409 (`ja_em_cla`).
- CA02: Dado um clã privado, quando um aluno tentar entrar sem link de convite válido, então o sistema deverá recusar com 403 (`cla_privado`).
- CA03: Dado um líder que sai de um clã com outros membros, quando a saída for concluída, então a liderança deverá ser transferida automaticamente ao sucessor elegível.

**Fonte:** `backend/apps/clas/views.py:L70` (`ClasView`, `ClaDetalheView` em `:L109`, `EntrarNoClaView` em `:L133`, `SairDoClaView` em `:L157`, `MembroView` em `:L178`, `LiderancaView` em `:L206`, `ConviteView` em `:L225`, `AceitarConviteView` em `:L259`), `backend/apps/clas/services.py:L116` (`criar_cla`, `entrar_no_cla` em `:L241`, `sair_do_cla` em `:L251`), `backend/apps/clas/models.py:L47` (`Cla`, `MembroDoCla` em `:L139`, `ConviteDoCla` em `:L202`), `frontend/src/app/(app)/clas/page.tsx:L11` (`ClasPage`), `frontend/src/components/clas/PainelDeClas.tsx:L26` (`PainelDeClas`).

### RF36. Consultar ranking

**Prioridade:** Média · **Estado:** Implementado

**Descrição:** O sistema deverá apresentar o ranking mensal de alunos ordenado pelo
XP obtido em exercícios concluídos no mês corrente (no fuso `America/Sao_Paulo`),
destacando os 50 primeiros colocados e a posição do próprio aluno autenticado.

**Atores:** Aluno, Autor, Administrador.

**Pré-condições:** Usuário autenticado.

**Fluxo principal:**
1. O usuário acessa a tela `/ranking`.
2. O sistema agrega os eventos de XP do mês corrente das contas ativas e verificadas, ordenando por XP decrescente, data do primeiro XP no mês e nickname.
3. A tela exibe o pódio, a tabela dos 50 primeiros com criatura ativa e medalhas de pódios anteriores, e o cartão com a posição do usuário logado.

**Regras de negócio:**
- RN01: Entram no placar apenas contas ativas (`is_active=True`) e com e-mail verificado (`email_verified_at__isnull=False`).
- RN02: O desempate usa quem alcançou o XP primeiro no mês (`primeiro_xp`) e, persistindo o empate, a ordem alfabética do nickname.
- RN03: O fechamento mensal grava os 3 primeiros colocados em `PodioMensal` de forma idempotente.

**Pós-condições:** Placar mensal e posição individual apresentados.

**Critérios de aceite:**
- CA01: Dado um aluno com XP no mês corrente fora dos 50 primeiros, quando consultar o ranking, então sua posição e pontuação deverão aparecer em `minha_posicao`.
- CA02: Dada uma conta suspensa ou anonimizada, quando o ranking for calculado, então ela não deverá figurar no placar.

**Fonte:** `backend/apps/ranking/views.py:L16` (`RankingMensalView`), `backend/apps/ranking/services.py:L224` (`ranking_mensal`, `placar` em `:L135`, `fechar_mes` em `:L176`), `frontend/src/app/(app)/ranking/page.tsx:L10` (`RankingPage`), `frontend/src/components/ranking/PainelDeRanking.tsx:L54` (`PainelDeRanking`).

### RF37. Consultar perfil público

**Prioridade:** Baixa · **Estado:** Implementado

**Descrição:** O sistema deverá permitir que usuários autenticados consultem o
perfil público de outro aluno pelo nickname, exibindo criatura ativa, nível, XP
total, estatísticas de exercícios, medalhas de pódio, conquistas e progresso nas
trilhas publicadas, sem expor dados privados.

**Atores:** Aluno, Autor, Administrador.

**Pré-condições:** Usuário autenticado; conta consultada ativa e com e-mail verificado.

**Fluxo principal:**
1. O usuário clica num participante no ranking ou no clã, ou acessa `/perfil/<nickname>`.
2. O sistema busca a conta pelo nickname (sem diferenciar maiúsculas) e reúne criatura ativa, totais de XP e exercícios, pódios, conquistas desbloqueadas e bloqueadas e progresso por trilha publicada.
3. A tela apresenta o cartão do perfil público.

**Regras de negócio:**
- RN01: A busca por nickname é case-insensitive (`nickname__iexact`), e contas inativas ou sem e-mail verificado respondem 404.
- RN02: A resposta nunca inclui dados pessoais sensíveis (e-mail, data de nascimento, configurações de 2FA ou histórico de auditoria).

**Pós-condições:** Perfil público apresentado.

**Critérios de aceite:**
- CA01: Dado o nickname de uma conta ativa, quando consultado com qualquer combinação de maiúsculas, então o sistema deverá devolver os dados públicos do perfil.
- CA02: Dado o perfil público devolvido pela API, quando inspecionado, então o payload não deverá conter o campo `email` nem `birth_date`.

**Fonte:** `backend/apps/ranking/views.py:L34` (`PerfilPublicoView`), `backend/apps/ranking/services.py:L268` (`perfil_publico`), `frontend/src/app/(app)/perfil/[nickname]/page.tsx:L10` (`PerfilPage`), `frontend/src/components/perfil/PainelDePerfil.tsx:L25` (`PainelDePerfil`).
