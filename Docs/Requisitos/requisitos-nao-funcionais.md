# Requisitos Não Funcionais do CodeQuest

Documento de requisitos não funcionais do Projeto Final de Curso (PFC) CodeQuest.
O guia da disciplina ("Guia de apoio: como descrever requisitos funcionais para um
projeto de software", Prof. Alessandro Aparecido da Silva, UMC) trata apenas de
requisitos funcionais. Para manter a mesma rastreabilidade, este documento
adapta a estrutura do guia: identificação no padrão `RNFXX`, nome, descrição,
critério de aceite verificável no formato "Dado..., quando..., então..." e as
recomendações SMART do guia (específico, mensurável, atingível, relevante e,
quando fizer sentido, com prazo ou limite de tempo).

Cada requisito traz:

| Campo | Significado |
|---|---|
| Categoria | Segurança, Privacidade (LGPD), Desempenho, Confiabilidade, Portabilidade, Manutenibilidade, Usabilidade ou Compatibilidade |
| Stakeholder | Quem é atendido ou afetado pelo requisito |
| Prioridade | Alta, Média ou Baixa |
| Estado | `Implementado`, `Parcial`, `Planejado` ou `Em desenvolvimento`, com o mesmo critério do documento de requisitos funcionais |
| Critério mensurável | O limite ou a condição objetiva que comprova o atendimento |
| Fonte | Onde o requisito está no código (caminhos relativos à raiz do repositório) |

Base da verificação: branch `main` no commit `9ebd18a` (2 de outubro de 2026).
Os valores citados são os padrões do código; os que vêm de variável de ambiente
estão indicados pelo nome da variável.

## Quadro resumo

| ID | Nome | Categoria | Prioridade | Estado |
|---|---|---|---|---|
| RNF01 | Armazenamento e política de senha | Segurança | Alta | Implementado |
| RNF02 | Sessão em cookies protegidos | Segurança | Alta | Implementado |
| RNF03 | Proteção contra CSRF e origens não autorizadas | Segurança | Alta | Implementado |
| RNF04 | Bloqueio por tentativas de login | Segurança | Alta | Implementado |
| RNF05 | Limitação de taxa de requisições | Segurança | Alta | Parcial |
| RNF06 | Proteção dos segredos do segundo fator | Segurança | Alta | Implementado |
| RNF07 | Autorização por permissão em cada rota | Segurança | Alta | Implementado |
| RNF08 | Não exposição de gabaritos e casos ocultos | Segurança | Alta | Implementado |
| RNF09 | Respostas que não revelam contas existentes | Segurança | Média | Implementado |
| RNF10 | Isolamento da execução de código do aluno | Segurança | Alta | Implementado |
| RNF11 | Política de segurança de conteúdo no navegador | Segurança | Média | Parcial |
| RNF12 | Trilha de auditoria imutável | Privacidade (LGPD) | Alta | Implementado |
| RNF13 | Retenção e descarte da auditoria | Privacidade (LGPD) | Média | Parcial |
| RNF14 | Anonimização na exclusão de conta | Privacidade (LGPD) | Alta | Implementado |
| RNF15 | Consentimento versionado e idade mínima | Privacidade (LGPD) | Alta | Implementado |
| RNF16 | Reaproveitamento de correções idênticas | Desempenho | Média | Implementado |
| RNF17 | Cotas e disjuntor da correção automática | Desempenho | Alta | Implementado |
| RNF18 | Consultas ao banco com número constante | Desempenho | Média | Implementado |
| RNF19 | Integridade da progressão e da posse de criaturas | Confiabilidade | Alta | Implementado |
| RNF20 | Suíte de testes automatizados | Confiabilidade | Alta | Implementado |
| RNF21 | Evolução versionada do banco de dados | Confiabilidade | Alta | Implementado |
| RNF22 | Degradação controlada sem o Judge0 | Confiabilidade | Média | Implementado |
| RNF23 | Configuração por variáveis de ambiente | Portabilidade | Alta | Implementado |
| RNF24 | Versões de dependências e de runtime fixadas | Portabilidade | Média | Parcial |
| RNF25 | Implantação em servidor próprio (VPS) | Portabilidade | Média | Planejado |
| RNF26 | Análise estática e tipagem | Manutenibilidade | Média | Parcial |
| RNF27 | Integração contínua | Manutenibilidade | Média | Planejado |
| RNF28 | Documentação da API e padrão de erro | Manutenibilidade | Média | Implementado |
| RNF29 | Identidade visual e tema escuro | Usabilidade | Média | Implementado |
| RNF30 | Acessibilidade | Usabilidade | Média | Parcial |
| RNF31 | Idioma e fuso horário brasileiros | Usabilidade | Alta | Implementado |
| RNF32 | Navegadores suportados | Compatibilidade | Média | Parcial |
| RNF33 | Plataforma tecnológica | Compatibilidade | Alta | Implementado |

---

## 1. Segurança

### RNF01. Armazenamento e política de senha

**Categoria:** Segurança · **Stakeholder:** Usuários · **Prioridade:** Alta · **Estado:** Implementado

**Descrição:** As senhas deverão ser armazenadas apenas como hash Argon2 e seguir
uma política mínima de composição.

**Critério mensurável:** senha entre 8 e 128 caracteres, com ao menos uma letra
maiúscula, uma minúscula, um número e um caractere especial; recusa de senhas
comuns, puramente numéricas ou parecidas com o e-mail ou o nickname; hasher
padrão `Argon2PasswordHasher`.

**Critérios de aceite:**
- CA01: Dada a senha `abcdefgh`, quando usada no cadastro, então o sistema deverá recusá-la.
- CA02: Dada uma conta recém-criada, quando o campo de senha for lido no banco, então deverá começar com o prefixo `argon2`.

**Fonte:** `backend/config/settings.py` (`PASSWORD_HASHERS`, `AUTH_PASSWORD_VALIDATORS`), `backend/apps/contas/validators.py` (`PasswordComplexityValidator`, `SENHA_MAX_LENGTH`).

### RNF02. Sessão em cookies protegidos

**Categoria:** Segurança · **Stakeholder:** Usuários · **Prioridade:** Alta · **Estado:** Implementado

**Descrição:** Os tokens de sessão deverão trafegar apenas em cookies inacessíveis
ao JavaScript, com vida curta e rotação.

**Critério mensurável:** cookies `cq_access` e `cq_refresh` com `HttpOnly`,
`SameSite=Lax` e `Secure` fora do modo de depuração (`AUTH_COOKIE_SECURE`); token
de acesso de 15 minutos; token de renovação de 7 dias, restrito ao caminho
`/api/v1/auth/`, trocado a cada uso e invalidado após a troca. O cookie
`cq_sessao` é apenas um sinalizador sem credencial.

**Critérios de aceite:**
- CA01: Dado um login bem-sucedido, quando os cabeçalhos da resposta forem inspecionados, então `cq_access` e `cq_refresh` deverão ter `HttpOnly` e `SameSite=Lax`.
- CA02: Dado um token de renovação já usado, quando reapresentado, então o sistema deverá recusá-lo.

**Fonte:** `backend/apps/contas/cookies.py`, `backend/apps/contas/autenticacao.py`, `backend/config/settings.py` (`SIMPLE_JWT`).

### RNF03. Proteção contra CSRF e origens não autorizadas

**Categoria:** Segurança · **Stakeholder:** Usuários · **Prioridade:** Alta · **Estado:** Implementado

**Descrição:** Requisições que alteram estado deverão exigir token CSRF, e apenas
as origens configuradas poderão fazer requisições com credenciais.

**Critério mensurável:** `CsrfViewMiddleware` ativo, cookie CSRF com
`SameSite=Lax`; origens permitidas apenas as listadas em `CSRF_TRUSTED_ORIGINS` e
`CORS_ALLOWED_ORIGINS` (padrão: `localhost:3000` e `127.0.0.1:3000`).

**Critérios de aceite:**
- CA01: Dada uma origem fora de `CORS_ALLOWED_ORIGINS`, quando o navegador fizer uma requisição com credenciais, então a resposta não deverá autorizar essa origem.

**Fonte:** `backend/config/settings.py` (`MIDDLEWARE`, `CSRF_*`, `CORS_*`), `backend/apps/contas/views.py` (`CsrfView`).

### RNF04. Bloqueio por tentativas de login

**Categoria:** Segurança · **Stakeholder:** Usuários · **Prioridade:** Alta · **Estado:** Implementado

**Descrição:** Tentativas seguidas de senha errada deverão bloquear temporariamente
a conta.

**Critério mensurável:** 5 falhas seguidas (`LOGIN_MAX_TENTATIVAS`) bloqueiam a
conta por 15 minutos (`LOGIN_BLOQUEIO_SEGUNDOS`). O contador fica no banco, então
vale para todos os processos do servidor. A senha errada na troca de e-mail conta
no mesmo bloqueio.

**Critérios de aceite:**
- CA01: Dada uma conta com 5 falhas seguidas, quando a senha correta for informada antes de 15 minutos, então o login deverá ser recusado.
- CA02: Dado um login bem-sucedido, quando concluído, então o contador de falhas deverá voltar a zero.

**Fonte:** `backend/apps/contas/models.py` (`registrar_falha_de_login`, `esta_bloqueado`), `backend/apps/contas/serializers.py` (`LoginSerializer`, `TrocaEmailSerializer`).

### RNF05. Limitação de taxa de requisições

**Categoria:** Segurança · **Stakeholder:** Equipe de operação · **Prioridade:** Alta · **Estado:** Parcial

**Descrição:** As rotas deverão limitar o volume de requisições por cliente, com
limites próprios para as rotas sensíveis.

**Critério mensurável:** limites padrão por minuto: anônimo 60, usuário 600,
autenticação 20, verificação e links por e-mail 5, conclusão 30, catálogo 60
(`THROTTLE_CATALOGO`), progresso 120 (`THROTTLE_EU_PROGRESSO`), solução de
referência 30 (`THROTTLE_AUTORIA`) e correção de código 5. O cliente é
identificado pelo endereço da conexão (`NUM_PROXIES = 0`), não pelo cabeçalho
`X-Forwarded-For`. Acima do limite, a resposta é 429.

**Critérios de aceite:**
- CA01: Dado um cliente que fez 20 tentativas de login no mesmo minuto, quando fizer a 21ª, então o sistema deverá responder 429.

**O que falta:** os contadores ficam no `LocMemCache`, que é por processo. Com
vários workers o teto real se multiplica, e reiniciar o servidor zera os
contadores. O próprio `settings.py` registra que o limite exato depende de um
cache compartilhado (Redis), que o projeto ainda não usa.

**Fonte:** `backend/config/settings.py` (`REST_FRAMEWORK`, `CACHES`), `throttle_scope` nas views de cada app.

### RNF06. Proteção dos segredos do segundo fator

**Categoria:** Segurança · **Stakeholder:** Usuários · **Prioridade:** Alta · **Estado:** Implementado

**Descrição:** Os códigos do 2FA deverão ter vida curta e ser guardados de forma
que um vazamento do banco não os revele.

**Critério mensurável:** código por e-mail de 6 dígitos, gerado com `secrets`,
válido por 10 minutos (`MFA_EMAIL_CODIGO_MAX_AGE`) e guardado só em hash SHA-256;
8 códigos de recuperação de uso único, também só em hash; comparação em tempo
constante (`hmac.compare_digest`); TOTP com tolerância de uma janela.

**Critérios de aceite:**
- CA01: Dada a ativação do 2FA, quando a tabela de códigos de recuperação for lida, então nenhum código deverá aparecer em texto puro.

**Fonte:** `backend/apps/contas/mfa.py`, `backend/apps/contas/models.py` (`ConfiguracaoMFA`, `CodigoRecuperacaoMFA`).

### RNF07. Autorização por permissão em cada rota

**Categoria:** Segurança · **Stakeholder:** Administradores, usuários · **Prioridade:** Alta · **Estado:** Implementado

**Descrição:** Toda rota deverá exigir sessão por padrão, e cada capacidade deverá
ser autorizada pela permissão granular correspondente do nível de acesso.

**Critério mensurável:** permissão padrão `IsAuthenticated` em toda a API; rotas
públicas declaram `AllowAny` explicitamente; capacidades protegidas por
`HasPerm(<codename>)` com códigos do catálogo de 21 permissões; papel e
`is_superuser` não concedem atalho; conta inativa não tem permissão nenhuma.
Nenhum modelo é registrado no admin do Django.

**Critérios de aceite:**
- CA01: Dado um usuário sem `exercicios.complete`, quando tentar concluir um exercício, então o sistema deverá responder 403.
- CA02: Dado o admin do Django, quando consultado, então nenhum modelo do projeto deverá estar registrado.

**Fonte:** `backend/config/settings.py` (`DEFAULT_PERMISSION_CLASSES`), `backend/apps/core/permissions.py`, `backend/apps/contas/rbac.py`, `backend/apps/contas/models.py` (`has_perm`).

### RNF08. Não exposição de gabaritos e casos ocultos

**Categoria:** Segurança · **Stakeholder:** Alunos, autores · **Prioridade:** Alta · **Estado:** Implementado

**Descrição:** A solução de referência e os dados dos casos de teste ocultos não
deverão aparecer em nenhuma resposta pública.

**Critério mensurável:** serializers com lista explícita de campos, sem
`solucao_autor`; casos ocultos respondidos apenas como aprovado ou reprovado; a
rota de solução responde com `Cache-Control: private, no-store`.

**Critérios de aceite:**
- CA01: Dada qualquer resposta das rotas públicas de trilhas, quando inspecionada, então não deverá conter `solucao_autor`.

**Fonte:** `backend/apps/trilhas/serializers.py`, `backend/apps/autoria/views.py`, `backend/apps/correcao/serializers.py`.

### RNF09. Respostas que não revelam contas existentes

**Categoria:** Segurança · **Stakeholder:** Usuários · **Prioridade:** Média · **Estado:** Implementado

**Descrição:** As rotas públicas de conta deverão responder da mesma forma exista
ou não a conta informada.

**Critério mensurável:** cadastro com e-mail existente, pedido de recuperação de
senha e reenvio de verificação devolvem o mesmo status e o mesmo corpo nos dois
casos; o login usa a mesma mensagem para senha errada, conta inexistente e conta
bloqueada.

**Critérios de aceite:**
- CA01: Dados um e-mail cadastrado e um não cadastrado, quando cada um pedir recuperação de senha, então as duas respostas deverão ser 204 sem corpo.

**Fonte:** `backend/apps/contas/views.py` (`RegistrarView`, `SenhaEsquecidaView`, `ReenviarVerificacaoView`), `backend/apps/contas/serializers.py` (`LoginSerializer`).

### RNF10. Isolamento da execução de código do aluno

**Categoria:** Segurança · **Stakeholder:** Equipe de operação · **Prioridade:** Alta · **Estado:** Implementado

**Descrição:** O código enviado pelo aluno deverá ser executado fora do servidor da
aplicação, sem rede e com limites de recursos.

**Critério mensurável:** execução no Judge0 com rede desligada, 2 s de CPU, 5 s
de tempo total, 128 MB de memória; código limitado a 10.000 caracteres; análise
da AST antes de qualquer chamada; tempo limite de 15 s na chamada ao Judge0
(`JUDGE0_TIMEOUT`).

**Critérios de aceite:**
- CA01: Dado um código com laço infinito, quando executado, então o resultado deverá indicar tempo esgotado sem afetar o servidor da API.

**Fonte:** `backend/apps/correcao/judge0.py`, `backend/apps/correcao/services.py` (`LIMITE_DE_CARACTERES`), `backend/apps/correcao/analise_ast.py`.

### RNF11. Política de segurança de conteúdo no navegador

**Categoria:** Segurança · **Stakeholder:** Usuários · **Prioridade:** Média · **Estado:** Parcial

**Descrição:** O frontend deverá restringir de onde a página pode carregar scripts,
estilos, imagens e fontes, e impedir que seja embutido em outros sites.

**Critério mensurável:** cabeçalho `Content-Security-Policy` em toda rota, com
`default-src 'self'`, `object-src 'none'` e `frame-ancestors 'none'`; a única
origem externa permitida é a CDN do editor de código.

**Critérios de aceite:**
- CA01: Dada qualquer página do frontend, quando os cabeçalhos forem inspecionados, então deverá existir `Content-Security-Policy` com `frame-ancestors 'none'`.

**O que falta:** `script-src` aceita `'unsafe-inline'`, porque o Next injeta
scripts inline e as páginas estáticas não usam nonce. A política barra scripts de
outras origens, mas não scripts inline injetados.

**Fonte:** `frontend/next.config.ts`.

## 2. Privacidade (LGPD)

### RNF12. Trilha de auditoria imutável

**Categoria:** Privacidade (LGPD) · **Stakeholder:** Titulares, administradores · **Prioridade:** Alta · **Estado:** Implementado

**Descrição:** Os registros de auditoria deverão ser imutáveis depois de gravados e
não deverão conter dados sensíveis.

**Critério mensurável:** o `save()` recusa qualquer alteração de registro
existente; metadados nunca incluem senha, token nem código do 2FA.

**Critérios de aceite:**
- CA01: Dado um registro gravado, quando o código tentar alterá-lo, então deverá ocorrer erro e o registro deverá permanecer igual.

**Fonte:** `backend/apps/auditoria/models.py` (`RegistroDeAuditoria.save`), `backend/apps/auditoria/services.py`.

### RNF13. Retenção e descarte da auditoria

**Categoria:** Privacidade (LGPD) · **Stakeholder:** Titulares · **Prioridade:** Média · **Estado:** Parcial

**Descrição:** Os registros de auditoria deverão ser descartados ao fim do prazo de
retenção.

**Critério mensurável:** prazo de 180 dias (`AUDITORIA_RETENCAO_DIAS`); o comando
`purgar_logs_antigos` remove os registros mais antigos e aceita `--dry-run`.

**Critérios de aceite:**
- CA01: Dado um registro com 181 dias, quando o comando for executado, então o registro deverá ser removido.

**O que falta:** o comando existe e foi feito para rodar por agendamento (cron),
mas o agendamento não está versionado no repositório. Sem ele, o descarte só
acontece quando alguém executa o comando.

**Fonte:** `backend/apps/auditoria/management/commands/purgar_logs_antigos.py`, `backend/config/settings.py` (`AUDITORIA_RETENCAO_DIAS`).

### RNF14. Anonimização na exclusão de conta

**Categoria:** Privacidade (LGPD) · **Stakeholder:** Titulares · **Prioridade:** Alta · **Estado:** Implementado

**Descrição:** A exclusão de conta deverá remover os dados pessoais de forma
atômica, preservando apenas o necessário para agregados e prova de consentimento.

**Critério mensurável:** numa única transação, e-mail e nickname substituídos por
valores aleatórios, senha inutilizada, conta desativada, e-mail apagado dos
registros de auditoria e IP apagado dos aceites; falha ao gravar o registro
`CONTA_ANONIMIZADA` desfaz toda a operação.

**Critérios de aceite:**
- CA01: Dada uma conta anonimizada, quando os registros de auditoria do titular forem lidos, então o campo `actor_email_snapshot` deverá estar vazio em todos.

**Fonte:** `backend/apps/contas/lgpd.py` (`anonimizar_conta`), `backend/apps/contas/models.py` (`User.anonimizar`).

### RNF15. Consentimento versionado e idade mínima

**Categoria:** Privacidade (LGPD) · **Stakeholder:** Titulares · **Prioridade:** Alta · **Estado:** Implementado

**Descrição:** Cada aceite dos documentos legais deverá ser guardado como prova, com
a versão aceita, e o cadastro deverá respeitar a idade mínima.

**Critério mensurável:** registro por documento com versão, data e IP, único por
usuário, documento e versão; versão vigente 1.2 dos Termos de Uso e da Política de
Privacidade (desde 26/09/2026); idade mínima de 16 anos completos, conferida no
servidor.

**Critérios de aceite:**
- CA01: Dado um cadastro com versão de documento diferente da vigente, quando enviado, então o sistema deverá recusar com `versao_desatualizada`.

**Fonte:** `backend/apps/contas/documentos.py` (`VIGENTES`), `backend/apps/contas/models.py` (`AceiteDeTermos`), `backend/apps/contas/validators.py` (`IDADE_MINIMA_ANOS`), `Docs/Termos_de_Aceite/`.

## 3. Desempenho

### RNF16. Reaproveitamento de correções idênticas

**Categoria:** Desempenho · **Stakeholder:** Alunos, equipe de operação · **Prioridade:** Média · **Estado:** Implementado

**Descrição:** Um código idêntico já corrigido recentemente para o mesmo exercício
não deverá gerar nova chamada ao Judge0.

**Critério mensurável:** janela de 10 minutos; a comparação usa o hash do código
normalizado junto com a especificação e os casos de teste.

**Critérios de aceite:**
- CA01: Dado um código corrigido há 5 minutos, quando o mesmo código for enviado de novo, então o resultado deverá vir do registro guardado e a cota não deverá diminuir.

**Fonte:** `backend/apps/correcao/services.py` (`CACHE_DE_SUBMISSAO`, `_hash`).

### RNF17. Cotas e disjuntor da correção automática

**Categoria:** Desempenho · **Stakeholder:** Equipe de operação · **Prioridade:** Alta · **Estado:** Implementado

**Descrição:** O uso do Judge0 deverá ficar dentro da cota contratada, sem que um
único aluno consuma a cota de todos.

**Critério mensurável:** até 10 chamadas pagas por aluno por dia
(`JUDGE0_LIMITE_POR_USUARIO`), respondendo 429 acima disso; disjuntor global que
interrompe novas chamadas ao atingir 90% da cota diária (`JUDGE0_LIMITE_DIARIO`,
padrão 50), respondendo 503; rajada de 5 chamadas por minuto por aluno. A
contagem diária fica no banco.

**Critérios de aceite:**
- CA01: Dado um aluno com 10 chamadas pagas no dia, quando enviar a 11ª, então o sistema deverá responder 429 sem chamar o Judge0.
- CA02: Dadas 45 chamadas pagas no dia com cota de 50, quando qualquer aluno enviar código novo, então o sistema deverá responder 503.

**Fonte:** `backend/apps/correcao/services.py` (`DISJUNTOR`, `_checar_cota_diaria`), `backend/apps/correcao/excecoes.py`, `backend/config/settings.py` (`JUDGE0_*`).

### RNF18. Consultas ao banco com número constante

**Categoria:** Desempenho · **Stakeholder:** Usuários · **Prioridade:** Média · **Estado:** Implementado

**Descrição:** As listagens principais não deverão fazer uma consulta ao banco por
item listado.

**Critério mensurável:** catálogo e detalhe de trilhas, lista de exercícios
concluídos e crédito de XP com número de consultas fixo, verificado por testes
que contam as consultas; contagens feitas com agregação no banco; conexões
reaproveitadas por 60 s (`DB_CONN_MAX_AGE`) com verificação de saúde.

**Critérios de aceite:**
- CA01: Dada uma trilha com 26 exercícios, quando o detalhe for consultado, então o número de consultas ao banco deverá ser o mesmo de uma trilha com 1 exercício.

**Fonte:** `backend/apps/trilhas/views.py` (`annotate`, `Prefetch`), `backend/apps/trilhas/tests/test_views.py`, `backend/apps/progressao/tests/test_api_exercicios_concluidos.py`, `backend/apps/progressao/tests/test_credito_xp.py`, `backend/config/settings.py` (`DATABASES`).

## 4. Confiabilidade

### RNF19. Integridade da progressão e da posse de criaturas

**Categoria:** Confiabilidade · **Stakeholder:** Alunos · **Prioridade:** Alta · **Estado:** Implementado

**Descrição:** XP e posse de criaturas deverão permanecer corretos mesmo sob
requisições simultâneas.

**Critério mensurável:** soma de XP feita no banco (`F()`) com a linha travada
(`select_for_update`); restrições de unicidade no banco para: uma posse por
criatura e usuário, no máximo uma criatura inicial, no máximo uma ativa, uma
criatura por domínio e uma conclusão creditada por exercício.

**Critérios de aceite:**
- CA01: Dadas duas conclusões simultâneas para a mesma criatura, quando processadas, então o XP final deverá ser a soma das duas.

**Fonte:** `backend/apps/progressao/services.py` (`creditar_exercicio`), `backend/apps/gamificacao/models/ownership.py`, `backend/apps/gamificacao/models/catalog.py`, `backend/apps/progressao/models.py`.

### RNF20. Suíte de testes automatizados

**Categoria:** Confiabilidade · **Stakeholder:** Equipe de desenvolvimento · **Prioridade:** Alta · **Estado:** Implementado

**Descrição:** O comportamento do sistema deverá ser verificado por testes
automatizados executáveis localmente, sem depender de serviços externos.

**Critério mensurável:** backend com 668 funções de teste (pytest e
pytest-django), incluindo casos negativos de segurança; frontend com cerca de
280 casos (Jest e React Testing Library); nos testes o Judge0 é substituído por
um executor local; cobertura medida com `pytest-cov` e `jest --coverage`.

**Critérios de aceite:**
- CA01: Dado o repositório na `main`, quando `pytest` (backend) e `npm test` (frontend) forem executados, então todos os testes deverão passar.

**Observação:** a cobertura é medida, mas não há percentual mínimo obrigatório
configurado (`fail_under` ou `coverageThreshold`).

**Fonte:** `backend/apps/*/tests/`, `backend/pyproject.toml`, `frontend/jest.config.ts`, `frontend/src/**/__tests__/`.

### RNF21. Evolução versionada do banco de dados

**Categoria:** Confiabilidade · **Stakeholder:** Equipe de desenvolvimento · **Prioridade:** Alta · **Estado:** Implementado

**Descrição:** Toda mudança de esquema e os dados de referência (catálogo de
permissões, níveis de sistema) deverão ser aplicados por migrations versionadas.

**Critério mensurável:** 34 arquivos de migration versionados no repositório; o
catálogo de permissões é semeado por migração de dados.

**Critérios de aceite:**
- CA01: Dado um banco vazio, quando `python manage.py migrate` for executado, então o esquema completo deverá ser criado sem passos manuais.

**Fonte:** `backend/apps/*/migrations/`.

### RNF22. Degradação controlada sem o Judge0

**Categoria:** Confiabilidade · **Stakeholder:** Alunos · **Prioridade:** Média · **Estado:** Implementado

**Descrição:** A indisponibilidade do serviço de correção não deverá derrubar o
restante da plataforma.

**Critério mensurável:** sem `JUDGE0_URL` e `JUDGE0_TOKEN`, ou com erro do
serviço, apenas executar e enviar código respondem 503; catálogo, conta,
progresso e exercícios teóricos continuam funcionando.

**Critérios de aceite:**
- CA01: Dado o Judge0 não configurado, quando um aluno concluir um exercício teórico, então o XP deverá ser creditado normalmente.

**Fonte:** `backend/apps/correcao/judge0.py` (`obter_cliente`), `backend/apps/correcao/excecoes.py` (`CorretorIndisponivel`).

## 5. Portabilidade

### RNF23. Configuração por variáveis de ambiente

**Categoria:** Portabilidade · **Stakeholder:** Equipe de operação · **Prioridade:** Alta · **Estado:** Implementado

**Descrição:** Banco, segredos, e-mail, prazos e limites deverão ser configurados
por variáveis de ambiente, sem alterar o código.

**Critério mensurável:** banco PostgreSQL definido em `DATABASE_URL`; chave,
hosts, e-mail, Judge0, prazos e limites lidos do `.env`; arquivo
`backend/.env.example` documenta as variáveis sem valores reais; sem credenciais
de SMTP, o e-mail é impresso no console.

**Critérios de aceite:**
- CA01: Dado um `DATABASE_URL` apontando para outro servidor PostgreSQL, quando a aplicação iniciar, então ela deverá usar esse banco sem mudança de código.

**Fonte:** `backend/config/settings.py`, `backend/.env.example`, `frontend/.env.example`.

### RNF24. Versões de dependências e de runtime fixadas

**Categoria:** Portabilidade · **Stakeholder:** Equipe de desenvolvimento · **Prioridade:** Média · **Estado:** Parcial

**Descrição:** As versões de dependências e de runtime deverão ser fixadas para que
qualquer máquina reproduza o mesmo ambiente.

**Critério mensurável:** dependências Python fixadas com `==` em
`requirements.txt`; dependências do frontend travadas em `package-lock.json`;
Next 16.3.3 e React 19.2.8 com versão exata.

**Critérios de aceite:**
- CA01: Dado um clone novo, quando `pip install -r requirements.txt` e `npm ci` forem executados, então as mesmas versões deverão ser instaladas.

**O que falta:** não há `.nvmrc` nem campo `engines` no `package.json`, então a
versão do Node não é fixada; a versão do Python (3.14) aparece só na configuração
do ruff e do mypy, sem arquivo de runtime.

**Fonte:** `backend/requirements.txt`, `backend/pyproject.toml`, `frontend/package.json`, `frontend/package-lock.json`.

### RNF25. Implantação em servidor próprio (VPS)

**Categoria:** Portabilidade · **Stakeholder:** Equipe de operação · **Prioridade:** Média · **Estado:** Planejado

**Descrição:** O sistema deverá rodar numa VPS (DigitalOcean), com Nginx como proxy
reverso e TLS, Django servido por gunicorn, Next.js por `next start` e o
PostgreSQL na mesma máquina.

**O que existe:** a arquitetura está descrita no `README.md`. Não há no
repositório configuração de Nginx, de gunicorn (o pacote nem está no
`requirements.txt`), de serviço do sistema nem roteiro de implantação. Quando houver
proxy na frente, `NUM_PROXIES` precisa passar a refletir o número de proxies
(RNF05).

**Fonte:** `README.md` (seção `~/deploy`).

## 6. Manutenibilidade

### RNF26. Análise estática e tipagem

**Categoria:** Manutenibilidade · **Stakeholder:** Equipe de desenvolvimento · **Prioridade:** Média · **Estado:** Parcial

**Descrição:** O código deverá passar por verificação automática de estilo e de
tipos.

**Critério mensurável:** `ruff check` sem erros no backend (regras E, F, W, I, N,
UP); `mypy --strict` sem erros nos apps `trilhas` e `autoria`; ESLint e
`tsc --noEmit` sem erros no frontend.

**Critérios de aceite:**
- CA01: Dado o repositório na `main`, quando `ruff check .` e `mypy` forem executados no backend, então nenhum erro deverá ser reportado.

**O que falta:** o modo estrito do mypy cobre 2 dos 9 apps; `contas`,
`auditoria`, `gamificacao`, `progressao`, `core` e `config` estão com
`ignore_errors`.

**Fonte:** `backend/pyproject.toml` (`[tool.ruff]`, `[tool.mypy]`), `frontend/eslint.config.mjs`, `frontend/tsconfig.json`.

### RNF27. Integração contínua

**Categoria:** Manutenibilidade · **Stakeholder:** Equipe de desenvolvimento · **Prioridade:** Média · **Estado:** Planejado

**Descrição:** Cada pull request deverá rodar automaticamente testes, lint e
verificação de tipos antes do merge.

**O que existe:** os comandos de verificação estão documentados (RNF20 e RNF26),
mas não há pipeline de CI no repositório (nenhum diretório `.github/workflows`).

**Fonte:** ausência de configuração de CI na raiz do repositório.

### RNF28. Documentação da API e padrão de erro

**Categoria:** Manutenibilidade · **Stakeholder:** Equipe de desenvolvimento · **Prioridade:** Média · **Estado:** Implementado

**Descrição:** A API deverá ter documentação gerada do próprio código e responder
erros sempre no mesmo formato.

**Critério mensurável:** schema OpenAPI em `/api/schema/` e Swagger UI em
`/api/docs/` (drf-spectacular); toda falha responde no envelope
`{ "error": { "code", "message", "details" } }`; rotas versionadas sob `/api/v1/`.

**Critérios de aceite:**
- CA01: Dada uma requisição inválida a qualquer rota, quando respondida com erro, então o corpo deverá ter a chave `error` com `code` e `message`.

**Fonte:** `backend/config/urls.py`, `backend/apps/core/exceptions.py`, `Docs/Integracao_API/integracao-api.md`.

## 7. Usabilidade

### RNF29. Identidade visual e tema escuro

**Categoria:** Usabilidade · **Stakeholder:** Alunos · **Prioridade:** Média · **Estado:** Implementado

**Descrição:** A interface deverá seguir uma identidade visual única de estilo
retrô (pixel art), em tema escuro, definida por tokens de cor e tipografia.

**Critério mensurável:** cores definidas como variáveis CSS (`--color-*`) em
`globals.css`; quatro fontes servidas pelo próprio projeto, sem CDN (Press Start
2P, Silkscreen e VT323 para títulos e rótulos, Inter para texto corrido).

**Critérios de aceite:**
- CA01: Dada qualquer tela, quando inspecionada, então as cores deverão vir das variáveis `--color-*` e as fontes de `frontend/src/fontes/`.

**Observação:** há apenas o tema escuro; não existe tema claro nem alternância.

**Fonte:** `frontend/src/app/globals.css`, `frontend/src/app/layout.tsx`, `frontend/src/fontes/`.

### RNF30. Acessibilidade

**Categoria:** Usabilidade · **Stakeholder:** Alunos · **Prioridade:** Média · **Estado:** Parcial

**Descrição:** A interface deverá ser utilizável por teclado e por leitores de tela
e respeitar a preferência por menos movimento.

**Critério mensurável:** documento com `lang="pt-BR"`; atributos `aria-*`,
`role` e textos `sr-only` nos componentes (cerca de 200 ocorrências); animações
reduzidas sob `prefers-reduced-motion`; contorno de foco visível (`:focus-visible`)
em todos os elementos focáveis.

**Critérios de aceite:**
- CA01: Dado o card de uma trilha em andamento, quando lido por um leitor de tela, então deverá ser anunciada a situação "Em andamento", e não apenas o percentual.
- CA02: Dado o sistema operacional com redução de movimento ativada, quando uma tela com animação for aberta, então a animação deverá ser reduzida.

**O que falta:** não há auditoria formal de acessibilidade (WCAG 2.1 nível AA) nem
teste automatizado com ferramenta como axe; o contraste das cores e a navegação
completa por teclado não foram medidos.

**Fonte:** `frontend/src/app/layout.tsx`, `frontend/src/app/globals.css`, `frontend/src/components/trilhas/TrilhaCard.tsx`.

### RNF31. Idioma e fuso horário brasileiros

**Categoria:** Usabilidade · **Stakeholder:** Alunos · **Prioridade:** Alta · **Estado:** Implementado

**Descrição:** Interface, mensagens de erro e e-mails deverão estar em português do
Brasil, com datas no fuso de São Paulo.

**Critério mensurável:** `LANGUAGE_CODE = 'pt-br'`, `TIME_ZONE =
'America/Sao_Paulo'`; mensagens de validação e e-mails escritos em português.

**Critérios de aceite:**
- CA01: Dado um cadastro com senha fraca, quando recusado, então a mensagem deverá estar em português.

**Fonte:** `backend/config/settings.py`, `backend/apps/contas/validators.py`, `backend/apps/contas/templates/`.

## 8. Compatibilidade

### RNF32. Navegadores suportados

**Categoria:** Compatibilidade · **Stakeholder:** Alunos · **Prioridade:** Média · **Estado:** Parcial

**Descrição:** O frontend deverá funcionar nas versões atuais dos navegadores
modernos (Chrome, Edge, Firefox e Safari).

**Critério mensurável:** vale o conjunto de navegadores suportado por padrão pelo
Next.js 16 e pelo React 19.

**Critérios de aceite:**
- CA01: Dadas as versões estáveis atuais de Chrome, Edge, Firefox e Safari, quando o fluxo de login e resolução de exercício for executado, então deverá concluir sem erros.

**O que falta:** não há `browserslist` próprio nem teste em vários navegadores; o
CA01 ainda não foi executado de forma sistemática.

**Fonte:** `frontend/package.json`.

### RNF33. Plataforma tecnológica

**Categoria:** Compatibilidade · **Stakeholder:** Equipe de desenvolvimento · **Prioridade:** Alta · **Estado:** Implementado

**Descrição:** O sistema deverá ser construído e mantido sobre a pilha definida pela
equipe.

**Critério mensurável:** backend em Python 3.14, Django 6.0.8, Django REST
Framework 3.18 e SimpleJWT 5.5; banco PostgreSQL (driver psycopg 3); frontend em
Next.js 16.3.3 (App Router), React 19.2.8, TypeScript 5 e Tailwind CSS 4.

**Critérios de aceite:**
- CA01: Dados `requirements.txt` e `package.json`, quando conferidos, então as versões deverão corresponder às listadas acima.

**Fonte:** `backend/requirements.txt`, `backend/pyproject.toml`, `frontend/package.json`.
