# Rastreabilidade das Regras de Negócio do CodeQuest

Mapa de cada regra de negócio (RN) escrita em `Docs/Requisitos/requisitos-funcionais.md` para o ponto do código onde a trava está, com caminho e número de linha conferidos lendo o arquivo.

- **Base da verificação:** branch `ArthurMain`, commit `0d0207b` (14 de novembro de 2026).
- **Nome da regra:** `RFnn-RNmm` é a regra `RNmm` dentro do requisito `RFnn`. Na documentação de requisitos cada RF numera as próprias RNs a partir de 01, então `RN01` sozinha não identifica nada.
- **Caminhos:** os do backend são relativos a `backend/` (`apps/...`, `config/...`); os do frontend, a `frontend/` (`src/...`).
- **Linha (`:Lnn`):** aponta a linha que contém a trava (a condição, a restrição do banco, o filtro ou a configuração), não só a declaração da classe.
- **Camada:** "Banco" é restrição criada na migração e imposta pelo PostgreSQL; "Servidor" é código Python no backend; "Interface" é código do frontend. Onde há mais de um ponto, o principal vem primeiro.
- **Cobertura:** RF01 a RF33 têm RNs escritas (93 regras). RF34 (suspender e reativar conta) e RF35 (gerenciar clãs) não têm RN numerada na documentação de requisitos, e RF36 e RF37 só existem na monografia. Para esses quatro não há o que mapear aqui; os pontos de código deles estão em `Docs/Rastreabilidade_Requisitos.md`.

## Como ler as divergências

Quando o código faz algo diferente do que a RN escreve, ou a regra existe só por convenção ou por ausência de código, a linha da tabela avisa na coluna "Regra e observação" (marcas **Divergência**, **Atenção** ou "regra por ausência"). São sete pontos, repetidos em "Pontos que a banca pode explorar" no fim do arquivo.

## RF01 Cadastrar conta

| RN | Regra e observação | Onde está a trava | Camada |
|---|---|---|---|
| RF01-RN01 | Idade mínima de 16 anos, calculada no servidor. | `apps/contas/serializers.py:L159` (`validate_data_nascimento`), com a constante em `apps/contas/validators.py:L13` e o cálculo em `apps/contas/validators.py:L16` | Servidor |
| RF01-RN02 | Aceite dos dois documentos, com a versão vigente; versão velha é recusada. | `apps/contas/serializers.py:L180` (aceite obrigatório), `apps/contas/serializers.py:L189` (compara com a versão vigente), `apps/contas/documentos.py:L37` (`versao_vigente`) | Servidor |
| RF01-RN03 | Nickname de 3 a 20 caracteres, sem acento, único sem diferenciar caixa e fora das palavras reservadas. | Tamanho em `apps/contas/validators.py:L8` e `apps/contas/validators.py:L9`; formato em `apps/contas/validators.py:L33`; reservadas em `apps/contas/validators.py:L97`; unicidade sem caixa em `apps/contas/models.py:L179` (restrição do banco) e `apps/contas/serializers.py:L173` (mensagem amigável) | Servidor e Banco |
| RF01-RN04 | A senha segue a política do RNF01. | `apps/contas/validators.py:L105` (`PasswordComplexityValidator`), chamado em `apps/contas/serializers.py:L207` e ligado em `config/settings.py:L330` | Servidor |
| RF01-RN05 | E-mail já cadastrado não cria conta nova, avisa o dono e responde igual ao sucesso. | `apps/contas/views.py:L83` (ramo do e-mail existente) e `apps/contas/views.py:L89` (corrida resolvida pelo `IntegrityError`); a resposta idêntica sai em `apps/contas/views.py:L94` | Servidor |
| RF01-RN06 | Papel de autor ou administrador nunca é escolhido no cadastro. | O serializer não expõe `role` nem nível: `apps/contas/serializers.py:L146` (lista fechada de campos) e `apps/contas/serializers.py:L217` (`create_user` sem papel) | Servidor |

## RF02 Verificar e-mail da conta

| RN | Regra e observação | Onde está a trava | Camada |
|---|---|---|---|
| RF02-RN01 | O link vale 24 horas (`VERIFICACAO_EMAIL_MAX_AGE`). | `config/settings.py:L289` (valor) e `apps/contas/verificacao.py:L35` (`max_age` na leitura do token) | Servidor |
| RF02-RN02 | Sem e-mail verificado, o login é recusado. | `apps/contas/serializers.py:L279` (`email_verificado`) | Servidor |
| RF02-RN03 | O reenvio responde igual, exista a conta ou não. | `apps/contas/views.py:L132` (só reenvia se a conta existe e não foi verificada) e `apps/contas/views.py:L140` (sempre 204) | Servidor |
| RF02-RN04 | Abrir de novo o link de conta verificada é sucesso, sem registrar duas vezes. | `apps/contas/serializers.py:L328` (marca `ja_verificado`) e `apps/contas/views.py:L114` (só audita se ainda não estava verificada) | Servidor |

## RF03 Autenticar usuário

| RN | Regra e observação | Onde está a trava | Camada |
|---|---|---|---|
| RF03-RN01 | Cinco falhas seguidas bloqueiam a conta por 15 minutos. | `apps/contas/models.py:L267` (`registrar_falha_de_login`), `apps/contas/models.py:L275` (compara com o limite), `config/settings.py:L294` e `config/settings.py:L295` (valores) | Servidor |
| RF03-RN02 | Conta bloqueada, senha errada e e-mail inexistente recebem a mesma mensagem. | `apps/contas/serializers.py:L27` (`CREDENCIAL_INVALIDA`), usada em `apps/contas/serializers.py:L253` (bloqueada) e `apps/contas/serializers.py:L268` (senha errada ou e-mail inexistente) | Servidor |
| RF03-RN03 | Conta inativa ou anonimizada não autentica. | `apps/contas/serializers.py:L256` (o `super().validate` do simplejwt recusa usuário inativo) e `apps/contas/models.py:L310` (a anonimização põe `is_active` em falso) | Servidor |
| RF03-RN04 | Sucesso e falha vão para a auditoria, sem guardar a senha tentada. | `apps/contas/serializers.py:L261` (falha, sem a senha e sem e-mail de conta inexistente) e `apps/contas/serializers.py:L299` (sucesso) | Servidor |

## RF04 Autenticar com segundo fator (2FA)

| RN | Regra e observação | Onde está a trava | Camada |
|---|---|---|---|
| RF04-RN01 | O `mfa_token` vale 5 minutos. | `config/settings.py:L308` (valor) e `apps/contas/mfa.py:L194` (`max_age` na leitura) | Servidor |
| RF04-RN02 | O código por e-mail vale 10 minutos. | `config/settings.py:L307` (valor), `apps/contas/mfa.py:L117` (grava a expiração) e `apps/contas/mfa.py:L150` (recusa depois dela) | Servidor |
| RF04-RN03 | Cada código de recuperação vale uma vez. | `apps/contas/mfa.py:L176` (`UPDATE` condicionado a `usado_em` nulo, seguro contra duas requisições juntas) | Servidor |
| RF04-RN04 | `LOGIN_OK` só depois do segundo fator. | `apps/contas/serializers.py:L298` (pula o registro quando há 2FA) e `apps/contas/views.py:L466` (registra no passo 2) | Servidor |

## RF05 Ativar e desativar o 2FA

| RN | Regra e observação | Onde está a trava | Camada |
|---|---|---|---|
| RF05-RN01 | Só um método ativo por vez. | `apps/contas/models.py:L497` (`OneToOneField`: cada usuário tem uma única configuração, com um único `metodo`) | Banco |
| RF05-RN02 | Com o 2FA ativo, trocar de método exige desativar antes, o que pede código. | `apps/contas/views.py:L504` (recusa `mfa_ja_ativo`) e `apps/contas/mfa.py:L280` (`desativar` verifica o código) | Servidor |
| RF05-RN03 | Códigos de recuperação só em hash. | `apps/contas/mfa.py:L171` (grava `_hash(c)`) e `apps/contas/mfa.py:L45` (SHA-256) | Servidor |
| RF05-RN04 | Ativar e desativar vão para a auditoria. | `apps/contas/views.py:L542` (`MFA_ATIVADO`) e `apps/contas/views.py:L598` (`MFA_DESATIVADO`) | Servidor |

## RF06 Renovar e encerrar sessão

| RN | Regra e observação | Onde está a trava | Camada |
|---|---|---|---|
| RF06-RN01 | Acesso vale 15 minutos e renovação 7 dias. | `config/settings.py:L217` e `config/settings.py:L218` | Servidor |
| RF06-RN02 | Cada renovação gera token novo e bloqueia o anterior. | `config/settings.py:L219` (`ROTATE_REFRESH_TOKENS`) e `config/settings.py:L220` (`BLACKLIST_AFTER_ROTATION`) | Servidor |
| RF06-RN03 | Redefinir a senha e excluir a conta encerram todas as sessões. | `apps/contas/views.py:L54` (`_encerrar_sessoes`), usada em `apps/contas/views.py:L361` (redefinição); na exclusão, `apps/contas/lgpd.py:L137` (bloqueia todos os tokens pendentes) | Servidor |

## RF07 Recuperar senha

| RN | Regra e observação | Onde está a trava | Camada |
|---|---|---|---|
| RF07-RN01 | O link vale 30 minutos e é de uso único. | Prazo em `config/settings.py:L290` e `apps/contas/senha.py:L43`; uso único porque a marca do token deriva do hash da senha: `apps/contas/senha.py:L32` e `apps/contas/senha.py:L52` | Servidor |
| RF07-RN02 | O pedido responde igual, exista a conta ou não. | `apps/contas/views.py:L329` (sempre 204) | Servidor |
| RF07-RN03 | A nova senha segue a política do RNF01. | `apps/contas/serializers.py:L493` (`validate_password`) | Servidor |

## RF08 Consultar e editar perfil

| RN | Regra e observação | Onde está a trava | Camada |
|---|---|---|---|
| RF08-RN01 | O novo nickname segue as regras do cadastro. | `apps/contas/serializers.py:L111` (`validate_nickname` do perfil) e a restrição `apps/contas/models.py:L179` | Servidor e Banco |
| RF08-RN02 | A troca de nickname vai para a auditoria. | `apps/contas/views.py:L244` (`NICKNAME_ALTERADO`) | Servidor |

## RF09 Trocar e-mail da conta

| RN | Regra e observação | Onde está a trava | Camada |
|---|---|---|---|
| RF09-RN01 | Até a segunda confirmação, tudo segue no e-mail atual. | `apps/contas/views.py:L263` (o novo endereço fica em `email_pendente`) e `apps/contas/views.py:L300` a `apps/contas/views.py:L303` (só a segunda confirmação troca `email`) | Servidor |
| RF09-RN02 | Senha atual errada conta como falha de login. | `apps/contas/serializers.py:L42` (`exigir_senha_atual`), com `apps/contas/serializers.py:L57` (chama `registrar_falha_de_login`) e usada em `apps/contas/serializers.py:L357` | Servidor |
| RF09-RN03 | Os links valem 30 minutos. | `config/settings.py:L292` e `apps/contas/troca_email.py:L67` | Servidor |
| RF09-RN04 | Redefinir a senha cancela a troca pendente. | `apps/contas/views.py:L350` (`email_pendente` volta a vazio) | Servidor |

## RF10 Gerenciar níveis de acesso

| RN | Regra e observação | Onde está a trava | Camada |
|---|---|---|---|
| RF10-RN01 | Níveis de sistema não podem ser removidos. | `apps/contas/views_rbac.py:L122` (recusa `nivel_sistema`); nível em uso também não sai, em `apps/contas/views_rbac.py:L131` | Servidor |
| RF10-RN02 | Só as permissões do catálogo de `rbac.py` são concedíveis. | `apps/contas/serializers_rbac.py:L18` (campo `permissoes` aceita só `codename` existente) e `apps/contas/rbac.py:L54` (`ALL_CODENAMES`), validado na carga em `apps/contas/rbac.py:L117` | Servidor |
| RF10-RN03 | O acesso ao painel vem da marca `acesso_admin` do nível, não do papel. | `apps/contas/models.py:L209` (`is_platform_admin` lê `nivel_de_acesso.acesso_admin`) e o campo em `apps/contas/models.py:L382` | Servidor |

## RF11 Atribuir nível de acesso a usuário

| RN | Regra e observação | Onde está a trava | Camada |
|---|---|---|---|
| RF11-RN01 | O usuário passa a ter exatamente as permissões do novo nível, administrador inclusive. | `apps/contas/models.py:L215` a `apps/contas/models.py:L219` (`has_perm` sem atalho por papel) e `apps/contas/models.py:L229` (permissões lidas do nível); o cache é invalidado em `apps/contas/views_rbac.py:L287` | Servidor |
| RF11-RN02 | Conceder autoria é atribuir o nível Autor, sem mudança de código. | `apps/contas/views_rbac.py:L278` (grava o nível) e, no fluxo de solicitação de autoria, `apps/autoria/services.py:L157` (`promover_a_autor`) | Servidor |

Trava extra do mesmo requisito, fora das RNs escritas: o admin não altera o próprio nível (`apps/contas/views_rbac.py:L265`).

## RF12 Consultar catálogo de trilhas

| RN | Regra e observação | Onde está a trava | Camada |
|---|---|---|---|
| RF12-RN01 | Só conteúdo PUBLICADO aparece e entra nas contagens. | `apps/trilhas/models.py:L33` (`publicados()`), usado em `apps/trilhas/views.py:L52`; as contagens filtram por publicado em `apps/trilhas/views.py:L50` e `apps/trilhas/views.py:L58` | Servidor |

## RF13 Consultar trilha e mapa de fases

| RN | Regra e observação | Onde está a trava | Camada |
|---|---|---|---|
| RF13-RN01 | O pré-requisito de uma aula é outra aula da mesma trilha. | `apps/trilhas/models.py:L226` (`Aula.clean`, recusa pré-requisito de outra trilha). Atenção: `clean` roda em formulário e `full_clean`, não em todo `save()` | Servidor |
| RF13-RN02 | Trilha não publicada responde 404. | `apps/trilhas/views.py:L98` (o detalhe só enxerga `publicados()`; o que não está no queryset vira 404 no `RetrieveAPIView`) | Servidor |
| RF13-RN03 | A retomada leva à primeira fase não concluída. | Interface decide o destino em `src/components/trilhas/BotaoIniciarTrilha.tsx:L53` (usa o `proximo` passo); a ordem e o estado de cada passo vêm do servidor em `apps/progressao/views.py:L386` (`PassosDaTrilhaView`) | Interface e Servidor |

## RF14 Consultar exercício

| RN | Regra e observação | Onde está a trava | Camada |
|---|---|---|---|
| RF14-RN01 | A solução de referência do autor nunca faz parte da resposta. | `apps/trilhas/serializers.py:L143` (lista fechada de campos, sem `solucao_autor`) e `apps/trilhas/views.py:L111` (só exercício publicado) | Servidor |
| RF14-RN02 | O slug do exercício é único dentro da trilha. | `apps/trilhas/models.py:L436` (restrição `exercicio_slug_unico_por_trilha`) | Banco |

## RF15 Controlar fluxo editorial do conteúdo

| RN | Regra e observação | Onde está a trava | Camada |
|---|---|---|---|
| RF15-RN01 | A API pública só devolve conteúdo PUBLICADO. | `apps/trilhas/models.py:L33` (`publicados()`), aplicado em `apps/trilhas/views.py:L52`, `apps/trilhas/views.py:L98` e `apps/trilhas/views.py:L111` | Servidor |
| RF15-RN02 | Cada transição exige a permissão correspondente. | `apps/autoria/views.py:L146` (`trilhas.submit_review`), `apps/autoria/views.py:L151` e `apps/autoria/views.py:L157` (`trilhas.review`), `apps/autoria/views.py:L180` (publicar). **Divergência:** publicar aceita `trilhas.publish` **ou** `trilhas.submit_review` (`HasAnyPerm`), então o autor publica o que ele criou depois de aprovado sem ter `trilhas.publish`; é escolha comentada em `apps/autoria/views.py:L174` | Servidor |
| RF15-RN03 | Editar e excluir só rascunho e só o dono (ou admin); excluir é recusado se um filho já saiu do rascunho. | `apps/autoria/services.py:L248` (`exigir_rascunho_do_dono`: dono antes do estado), `apps/autoria/services.py:L288` (`excluir_rascunho`), `apps/autoria/services.py:L243` (estados que excluem) e `apps/autoria/services.py:L245` (filhos que travam a exclusão). Nota: excluir também vale para o aprovado ainda não publicado, não só para rascunho | Servidor |
| RF15-RN04 | Aula, exercício, flashcard e questão só entram em pai do próprio autor (salvo admin); flashcard e questão só em aula em rascunho. | `apps/autoria/serializers.py:L277` (`_exigir_dono`), usada em `apps/autoria/serializers.py:L355` (aula) e `apps/autoria/serializers.py:L395` (exercício); flashcard e questão em `apps/autoria/views.py:L516` (`rascunho_editavel` da aula). **Atenção:** `_exigir_dono` também deixa passar quando pai e trilha já estão publicados (`apps/autoria/serializers.py:L284`), o que a RN escrita não menciona | Servidor |
| RF15-RN05 | Autor, status e slug não vêm do corpo da requisição. | `apps/autoria/views.py:L416` (`autor=self.request.user`); slug e id somente leitura em `apps/autoria/serializers.py:L341`, `apps/autoria/serializers.py:L352` e `apps/autoria/serializers.py:L392`; o status nasce rascunho e muda só por `apps/autoria/services.py:L501` (`_gravar_status`) | Servidor |

Regra que a documentação chama de "quatro olhos", fora das cinco RNs numeradas: quem criou não aprova o próprio conteúdo, nem o admin (`apps/autoria/services.py:L464` a `apps/autoria/services.py:L465`).

## RF16 Consultar solução de referência

| RN | Regra e observação | Onde está a trava | Camada |
|---|---|---|---|
| RF16-RN01 | A resposta não pode ser guardada em cache intermediário (`private, no-store`). | `apps/autoria/views.py:L85` (`cache_control(private=True, no_store=True)` na `SolucaoAutorView`) | Servidor |
| RF16-RN02 | Limite de taxa próprio de 30 por minuto. | `apps/autoria/views.py:L91` (escopo `autoria`) e `config/settings.py:L156` (30 por minuto) | Servidor |

## RF17 Iniciar trilha

| RN | Regra e observação | Onde está a trava | Camada |
|---|---|---|---|
| RF17-RN01 | Idempotente: 201 na primeira chamada, 200 nas seguintes, mesmo corpo. | `apps/progressao/services.py:L270` (`get_or_create`, devolve se criou) e `apps/progressao/views.py:L157` (escolhe 201 ou 200) | Servidor |

## RF18 Concluir exercício e creditar XP

| RN | Regra e observação | Onde está a trava | Camada |
|---|---|---|---|
| RF18-RN01 | O XP é sempre calculado no servidor; nenhuma rota aceita XP do cliente. | `apps/progressao/services.py:L102` (`xp_do_exercicio`, por dificuldade) e `apps/progressao/services.py:L563` (valor final com o bônus); a view não lê XP do corpo (`apps/progressao/views.py:L188`) | Servidor |
| RF18-RN02 | Cada exercício credita XP uma vez por conta. | **Esta é a trava de "XP não duplica":** restrição única parcial no banco em `apps/progressao/models.py:L124` (restrição declarada na linha 124, com o nome `eventoxp_um_por_exercicio_por_usuario` na linha 127); o serviço trata o `IntegrityError` e responde `ja_concluido` em `apps/progressao/services.py:L577`; a gravação do evento está em `apps/progressao/services.py:L567` | Banco e Servidor |
| RF18-RN03 | Só a criatura ativa recebe XP. | `apps/progressao/services.py:L552` (busca a criatura ativa; sem ela, recusa em L554) | Servidor |
| RF18-RN04 | Em exercício com correção automática, só o envio aprovado conclui. | `apps/progressao/views.py:L255` (reprovado volta antes de `creditar_exercicio`, que é chamado em `apps/progressao/views.py:L260`) | Servidor |

Concorrência do mesmo requisito: o progresso é travado com `select_for_update` em `apps/progressao/services.py:L557` e a soma é um `UPDATE` com `F()` em `apps/progressao/services.py:L600`, para dois pedidos simultâneos não perderem XP (RNF19).

## RF19 Consultar progresso do aluno

| RN | Regra e observação | Onde está a trava | Camada |
|---|---|---|---|
| RF19-RN01 | Sem criatura ativa, a rota responde 204. | `apps/progressao/views.py:L78` e `apps/progressao/views.py:L79` | Servidor |
| RF19-RN02 | O progresso vive no servidor, não no navegador. | Calculado e devolvido por `apps/progressao/views.py:L81`; a interface só lê, em `src/components/progresso/ProvedorProgresso.tsx:L82` | Servidor e Interface |

## RF20 Executar código contra casos visíveis

| RN | Regra e observação | Onde está a trava | Camada |
|---|---|---|---|
| RF20-RN01 | A única linguagem suportada é Python. | **Divergência:** o mapa de linguagens do Judge0 tem Python e SQL (`apps/correcao/judge0.py:L12` a `apps/correcao/judge0.py:L15`), e a correção de SQL existe em `apps/correcao/services.py:L352` (`_julgar_sql`). A RN escrita está desatualizada | Servidor |
| RF20-RN02 | O código tem no máximo 10.000 caracteres. | `apps/correcao/services.py:L31` (constante) e `apps/correcao/services.py:L140` (recusa `codigo_grande`) | Servidor |
| RF20-RN03 | Código barrado pela análise da AST não consome chamada ao Judge0. | `apps/correcao/services.py:L443` a `apps/correcao/services.py:L453` (a análise roda e levanta erro), antes de `apps/correcao/services.py:L490` (`_reservar_chamada`); regras em `apps/correcao/analise_ast.py:L134` | Servidor |
| RF20-RN04 | Valem os limites de uso do RNF17. | `apps/correcao/services.py:L154` (`_checar_cota_diaria`: teto por usuário em L164 e disjuntor global em L169) e `apps/correcao/views.py:L35` (rajada por minuto) | Servidor |

## RF21 Enviar código para correção automática

| RN | Regra e observação | Onde está a trava | Camada |
|---|---|---|---|
| RF21-RN01 | Dos casos ocultos não saem argumentos nem resultado esperado. | `apps/correcao/services.py:L333` e `apps/correcao/services.py:L334` (caso oculto vira só `ordem`, `visivel` e `passou`), com o serializer de saída em `apps/correcao/serializers.py:L67` | Servidor |
| RF21-RN02 | Código idêntico corrigido nos últimos 10 minutos reaproveita o resultado. | `apps/correcao/services.py:L32` (janela de 10 minutos), `apps/correcao/services.py:L468` (chave) e `apps/correcao/services.py:L473` a `apps/correcao/services.py:L476` (busca da submissão idêntica) | Servidor |

## RF22 Escolher criatura inicial

| RN | Regra e observação | Onde está a trava | Camada |
|---|---|---|---|
| RF22-RN01 | No máximo uma criatura inicial por aluno, garantido no banco. | `apps/gamificacao/models/ownership.py:L63` (restrição única parcial `usercreature_uma_inicial_por_usuario`) | Banco |
| RF22-RN02 | A escolha é atômica: pedidos simultâneos não entregam duas iniciais. | `apps/gamificacao/services.py:L64` a `apps/gamificacao/services.py:L73` (cria dentro de `try` e converte o `IntegrityError` em erro de validação) | Servidor e Banco |
| RF22-RN03 | Só criaturas disponíveis podem ser escolhidas. | `apps/gamificacao/services.py:L51` (`is_available`, recusa `criatura_indisponivel`) | Servidor |

## RF23 Adquirir nova criatura

| RN | Regra e observação | Onde está a trava | Camada |
|---|---|---|---|
| RF23-RN01 | O aluno não possui a mesma criatura duas vezes. | `apps/gamificacao/models/ownership.py:L58` (restrição `usercreature_uma_vez_por_usuario`) e `apps/gamificacao/services.py:L107` (converte o `IntegrityError`) | Banco e Servidor |
| RF23-RN02 | A criatura nova começa no nível 1. | `apps/gamificacao/services.py:L105` (`stage_for_level(level=1)`) | Servidor |

## RF24 Definir criatura ativa

| RN | Regra e observação | Onde está a trava | Camada |
|---|---|---|---|
| RF24-RN01 | No máximo uma criatura ativa por aluno, garantido no banco. | `apps/gamificacao/models/ownership.py:L71` (restrição `usercreature_uma_ativa_por_usuario`); o serviço desliga a atual e liga a nova dentro de uma transação em `apps/gamificacao/services.py:L131` | Banco e Servidor |

## RF25 Evoluir criatura

| RN | Regra e observação | Onde está a trava | Camada |
|---|---|---|---|
| RF25-RN01 | A evolução não é automática. | A conclusão de exercício não evolui (`apps/progressao/services.py:L633`, comentário e retorno só informa `pode_evoluir`); só a ação do aluno chama `apps/gamificacao/views.py:L152` | Servidor |
| RF25-RN02 | Avança um estágio por vez. | `apps/progressao/services.py:L174` (o próximo estágio é sempre `atual + 1`) | Servidor |
| RF25-RN03 | O estágio nunca regride. | `apps/progressao/services.py:L244` (o `UPDATE` só grava o estágio seguinte e só se o estágio de partida ainda for o mesmo) | Servidor |

## RF26 Consultar criaturas e bônus de XP

| RN | Regra e observação | Onde está a trava | Camada |
|---|---|---|---|
| RF26-RN01 | Existe exatamente uma criatura por domínio. | `apps/gamificacao/models/catalog.py:L63` (campo `domain` com `unique=True`) | Banco |
| RF26-RN02 | O bônus padrão semeado é XP em dobro na trilha do domínio. | `apps/gamificacao/management/commands/seed_bonus_xp.py:L21` (`DOBRO`) e `apps/gamificacao/management/commands/seed_bonus_xp.py:L50` (grava o par criatura e trilha); um bônus por par fica garantido em `apps/gamificacao/models/bonus.py:L59` | Servidor e Banco |

## RF27 Apresentar desafios do dia

| RN | Regra e observação | Onde está a trava | Camada |
|---|---|---|---|
| RF27-RN01 | A escolha é determinística pela data. | `apps/trilhas/desafios.py:L35` (índice pela data ordinal módulo o número de desafios) | Servidor |
| RF27-RN02 | O desafio não dá XP extra. | Não existe código de XP próprio de desafio: a conclusão passa por `apps/progressao/services.py:L545` (`creditar_exercicio`), o mesmo caminho de qualquer exercício. É uma regra por ausência, não por uma linha de trava | Servidor |

## RF28 Consultar histórico da própria atividade

| RN | Regra e observação | Onde está a trava | Camada |
|---|---|---|---|
| RF28-RN01 | Cada titular vê apenas as próprias linhas. | `apps/auditoria/views.py:L125` (`actor=` o usuário da sessão) | Servidor |
| RF28-RN02 | Ações administrativas não entram no histórico do titular. | `apps/auditoria/views.py:L126` (`acao__in=ACOES_DO_TITULAR`), com a lista em `apps/auditoria/models.py:L82` | Servidor |

## RF29 Exportar dados pessoais

| RN | Regra e observação | Onde está a trava | Camada |
|---|---|---|---|
| RF29-RN01 | O pacote tem só dados do próprio titular. | `apps/contas/lgpd.py:L26` (criaturas), `apps/contas/lgpd.py:L44` (clã) e o restante filtrados por `user`; a rota usa o usuário da sessão em `apps/contas/views.py:L374` | Servidor |
| RF29-RN02 | Senha, tokens e segredos do 2FA não fazem parte do pacote. | `apps/contas/lgpd.py:L56` a `apps/contas/lgpd.py:L105` (o pacote é um dicionário de campos escolhidos um a um; hash de senha, tokens e segredo TOTP não são listados). Regra por lista fechada, sem filtro automático | Servidor |

## RF30 Renovar consentimento dos documentos legais

| RN | Regra e observação | Onde está a trava | Camada |
|---|---|---|---|
| RF30-RN01 | Só as versões ainda não aceitas são registradas. | `apps/contas/models.py:L480` (lê o que já foi aceito) e `apps/contas/models.py:L483` (cria só o que falta) | Servidor |
| RF30-RN02 | O histórico de aceites anteriores é preservado como prova. | `apps/contas/models.py:L448` (restrição única por usuário, documento e versão: cada versão é uma linha nova, nada é sobrescrito) e `apps/contas/models.py:L487` (`bulk_create`) | Banco e Servidor |

## RF31 Excluir conta por anonimização

| RN | Regra e observação | Onde está a trava | Camada |
|---|---|---|---|
| RF31-RN01 | O link vale 30 minutos e deixa de valer se a senha mudar. | `config/settings.py:L303` (prazo), `apps/contas/exclusao.py:L50` (leitura com `max_age`) e `apps/contas/exclusao.py:L39` (marca derivada do hash da senha) | Servidor |
| RF31-RN02 | A anonimização embaralha e-mail e nickname, inutiliza a senha e desativa a conta. | `apps/contas/models.py:L303` (e-mail), `apps/contas/models.py:L305` (nickname) e `apps/contas/models.py:L310` (`is_active` em falso) | Servidor |
| RF31-RN03 | Apagam-se também o e-mail guardado na auditoria e o IP dos aceites. | `apps/contas/lgpd.py:L146` (zera snapshot de e-mail, IP e user agent da auditoria) e `apps/contas/lgpd.py:L149` (zera o IP dos aceites) | Servidor |
| RF31-RN04 | Agregados (XP) e a prova de aceite dos termos são mantidos. | `apps/contas/lgpd.py:L149` (aceites ficam, só o IP sai); `EventoXP` e demais agregados não são tocados na função inteira (`apps/contas/lgpd.py:L129` a `apps/contas/lgpd.py:L153`) | Servidor |
| RF31-RN05 | Operação atômica: se `CONTA_ANONIMIZADA` não for gravada, nada é anonimizado. | `apps/contas/lgpd.py:L129` (`transaction.atomic`) e `apps/contas/lgpd.py:L143` (gravação direta da prova, sem o `registrar()` que engole falha) | Servidor |
| RF31-RN06 | A exclusão é definitiva, sem prazo de arrependimento. | `apps/contas/lgpd.py:L139` (anonimiza na hora da confirmação). Regra por ausência: não existe agendamento nem estado de "exclusão pendente" depois do link | Servidor |

## RF32 Registrar eventos na trilha de auditoria

| RN | Regra e observação | Onde está a trava | Camada |
|---|---|---|---|
| RF32-RN01 | Um registro gravado não pode ser alterado (append-only). | `apps/auditoria/models.py:L237` (`save` recusa qualquer alteração depois de gravado). **Atenção:** a trava está no método `save` do modelo; `QuerySet.update` e `QuerySet.delete` não são bloqueados, e o código os usa de propósito na anonimização (`apps/contas/lgpd.py:L146`) e na retenção (`apps/auditoria/management/commands/limpar_auditoria.py:L20`) | Servidor |
| RF32-RN02 | Senhas, tokens e conteúdo sensível nunca são gravados. | **Atenção:** é convenção, não filtro. O contrato está escrito em `apps/auditoria/services.py:L11` e na docstring de `apps/auditoria/services.py:L71`, e cada chamada de `registrar` passa só metadados escolhidos (por exemplo `apps/contas/serializers.py:L261`). Não há código que varra o `metadata` em busca de segredos | Servidor |

## RF33 Consultar trilha de auditoria

| RN | Regra e observação | Onde está a trava | Camada |
|---|---|---|---|
| RF33-RN01 | A consulta à auditoria também é auditada, com os filtros usados. | `apps/auditoria/views.py:L92` (`registrar` dentro de `list`, com os filtros recebidos a partir de `apps/auditoria/views.py:L98`) | Servidor |

## Pontos que a banca pode explorar

1. **RF15-RN02, publicar.** O autor publica o que criou depois de aprovado, sem `trilhas.publish`, porque `PublicarView` aceita `trilhas.submit_review` (`apps/autoria/views.py:L180`). A regra dos quatro olhos continua valendo para aprovar (`apps/autoria/services.py:L464`).
2. **RF15-RN04, pai publicado.** `_exigir_dono` deixa qualquer autor com permissão de criar anexar aula ou exercício a trilha ou aula já publicada (`apps/autoria/serializers.py:L284`); o item novo nasce em rascunho.
3. **RF20-RN01, linguagens.** O código aceita Python e SQL (`apps/correcao/judge0.py:L12`); a RN diz só Python.
4. **RF32-RN01, imutabilidade.** Vale para `save()` do modelo; `update()` e `delete()` em lote existem e são usados na anonimização e na retenção.
5. **RF32-RN02, segredos na auditoria.** Convenção de código, sem filtro automático.
6. **RF13-RN01, pré-requisito.** A regra está em `Aula.clean`, que não roda em todo `save()` (`apps/trilhas/models.py:L218`).
7. **RF27-RN02 e RF31-RN06.** Regras por ausência: não existe código de XP de desafio nem prazo de arrependimento; a prova é a falta desses caminhos no código mostrado acima.
