# Política de Privacidade

**Versão 1.2, vigente desde 26/09/2026.**

> **Origem deste texto.** Extraído de `frontend/src/app/privacidade/page.tsx`
> na branch `ArthurMain`, versão 1.2. A versão e a data de vigência vêm de
> `backend/apps/contas/documentos.py`, e os dados do controlador e do
> encarregado vêm de `frontend/src/lib/dadosLegais.ts`. O conteúdo é o que a
> página `/privacidade` exibe, convertido para Markdown, sem cláusula
> acrescentada nem removida.

O que a CodeQuest coleta, por que coleta, com quem compartilha, por quanto tempo
guarda e como você exerce seus direitos como titular.

## 1. Quem trata seus dados

O controlador dos dados tratados na CodeQuest é Mauro Junior, RGM 11231100402.

O encarregado pelo tratamento de dados pessoais, previsto no art. 41 da LGPD, é
Julio Franz, e o canal para falar com ele é juliofranz@codequest.com.br. É esse
o endereço para qualquer pedido relacionado aos seus dados.

## 2. Quais dados guardamos e por quê

Esta é a lista completa do que fica registrado no nosso servidor. Nenhum outro
dado seu é coletado: não pedimos CPF, telefone, endereço, documento nem foto.

| Dado | Para que serve | Base legal |
|---|---|---|
| E-mail | Identifica sua conta e é como você entra na plataforma. | Execução de contrato (art. 7º, V) |
| Nickname | Seu nome público, exibido no perfil e no ranking. | Execução de contrato (art. 7º, V) |
| Senha | Guardada apenas como hash Argon2. Não temos como ler sua senha, nem para te ajudar. | Execução de contrato (art. 7º, V) |
| Data de nascimento | Confirmar a idade mínima de 16 anos no cadastro. Não aparece no seu perfil nem no ranking. | Execução de contrato (art. 7º, V) |
| Nível de acesso | Define o que você pode acessar dentro da plataforma. | Execução de contrato (art. 7º, V) |
| Data de criação, de atualização e do último acesso | Manutenção da conta e apuração de uso indevido. | Legítimo interesse (art. 7º, IX) |
| Registro de aceite: qual documento, qual versão, data e IP de origem | Comprovar que você teve acesso aos Termos e a esta Política antes de criar a conta. | Exercício regular de direitos (art. 7º, VI) |
| Data em que você confirmou o e-mail | Comprovar que o endereço é válido e é seu, e liberar o login. | Execução de contrato (art. 7º, V) |
| Tentativas de login falhas e prazo de bloqueio | Barrar ataque de força bruta contra a sua conta. | Legítimo interesse (art. 7º, IX) |
| Criatura escolhida, estágio atual e datas de aquisição e evolução | Fazer a gamificação funcionar e mostrar seu avanço. | Execução de contrato (art. 7º, V) |
| Verificação em duas etapas, se você ativar: método escolhido, chave do aplicativo autenticador e códigos de recuperação (guardados só como hash) | Pedir o segundo fator no login e permitir recuperar o acesso. | Execução de contrato (art. 7º, V) |
| XP recebido por exercício, com data, trilhas iniciadas e nível | Mostrar seu progresso, evoluir a criatura e montar o ranking. | Execução de contrato (art. 7º, V) |
| Código-fonte enviado nos exercícios, com a data, o veredito e o resultado da execução | Corrigir o exercício, mostrar o resultado, reabrir no editor o último código aprovado e contar o limite diário de correções. | Execução de contrato (art. 7º, V) |
| Registro de ações sensíveis (login, troca de senha ou de e-mail, 2FA, exportação e exclusão de dados), com data, IP e navegador de origem | Detectar acesso indevido à sua conta e mostrar sua atividade recente. | Legítimo interesse (art. 7º, IX) |
| Identificador dos tokens de sessão emitidos, com data de criação e de expiração | Manter você conectado e permitir invalidar sessões. | Legítimo interesse (art. 7º, IX) |

## 3. O que fica só no seu navegador

A CodeQuest não grava nada no armazenamento local do seu navegador. Seu
progresso nas trilhas fica na sua conta, no servidor, e acompanha você em
qualquer aparelho. O único dado guardado no navegador são os cookies descritos
na seção 4.

## 4. Cookies

Usamos quatro cookies, todos indispensáveis para a plataforma funcionar. Nenhum
deles serve para publicidade ou para acompanhar você por outros sites:

- **cq_access** e **cq_refresh**: mantêm você conectado. São marcados como
  HttpOnly, ou seja, o JavaScript da página não consegue lê-los, nem um script
  malicioso que fosse injetado.
- **cq_sessao**: avisa à interface que provavelmente existe sessão, para saber
  o que desenhar. Não é credencial e não abre a conta de ninguém.
- **csrftoken**: impede que outro site dispare ações na sua conta usando o seu
  navegador.

Não há rastreador de terceiros, pixel de publicidade nem ferramenta de análise
de audiência. É por isso que você não vê banner de cookies aqui: cookie
estritamente necessário ao serviço não depende de consentimento, e nenhum outro
tipo existe nesta plataforma.

## 5. Com quem compartilhamos

Não vendemos, não alugamos e não cedemos seus dados para publicidade. O
compartilhamento se limita à infraestrutura necessária para a plataforma
existir:

- **Hospedagem**: DigitalOcean, em servidor fora do Brasil, o que caracteriza
  transferência internacional nos termos do art. 33 da LGPD.
- **Envio de e-mail**: Brevo, que entrega os e-mails da plataforma
  (confirmação de conta e de troca de e-mail, redefinição de senha, código de
  verificação em duas etapas e confirmação de exclusão). O processamento ocorre
  em servidores na União Europeia, e fora do Brasil isso caracteriza
  transferência internacional nos termos do art. 33 da LGPD.
- **Correção de código**: provedor terceiro do serviço de execução de código
  (Judge0 CE, via RapidAPI), que executa e corrige o código dos exercícios.
  Recebe o código que você envia, a linguagem do exercício e as entradas de
  teste. Nenhum outro dado da sua conta vai junto.

Também podemos compartilhar dados para cumprir ordem judicial ou requisição de
autoridade competente. Se isso acontecer e a lei permitir, avisamos você.

## 6. Por quanto tempo guardamos

Enquanto sua conta existir, mantemos os dados da seção 2. O registro de ações
sensíveis é a exceção: cada linha é apagada depois de 180 dias.

Quando você pede a exclusão, enviamos um link de confirmação para o seu e-mail.
Ao confirmar, a exclusão é imediata e não tem volta: não existe prazo para
desistir. Os dados que identificam você diretamente (e-mail, nickname e senha)
são anonimizados na hora, e a conta não pode mais ser acessada. Continuam
guardados, ligados a um identificador aleatório no lugar do seu e-mail e
nickname: a data de nascimento, o XP, as trilhas iniciadas e as criaturas, o
código enviado nos exercícios, com vereditos e resultados, e a configuração da
verificação em duas etapas (chave do aplicativo e códigos de recuperação), se
existir.

O registro de ações sensíveis também continua, com IP e navegador de origem,
mas sem o seu e-mail, e segue o prazo de 180 dias acima. Isso é
pseudonimização, não anonimização: o vínculo direto com você some, mas esses
dados, combinados com outra informação, ainda poderiam levar até você. Fora o
registro de ações sensíveis, eles não têm hoje prazo automático de exclusão.

O registro de aceite dos documentos é mantido por 5 anos, mesmo após a exclusão
da conta, porque é a prova de que a relação existiu e foi consentida. O IP
associado a ele é apagado no momento da exclusão.

## 7. Seus direitos

O art. 18 da LGPD garante a você, sobre os seus dados:

- confirmar que existe tratamento e acessar os dados;
- corrigir dado incompleto, inexato ou desatualizado;
- pedir anonimização, bloqueio ou eliminação de dado desnecessário ou
  excessivo;
- pedir a portabilidade dos dados para outro fornecedor de serviço;
- saber com quais entidades públicas e privadas compartilhamos seus dados;
- revogar o consentimento e pedir a eliminação dos dados tratados com base
  nele;
- se opor a um tratamento que você considere irregular, e pedir revisão de
  decisão automatizada.

> Para exercer qualquer um desses direitos, escreva para
> juliofranz@codequest.com.br. Respondemos em até 15 dias. Você também pode
> baixar uma cópia dos seus dados e excluir sua conta sozinho, na tela de
> Configurações (`/configuracoes`).

## 8. Como protegemos seus dados

Senhas são guardadas com Argon2, o algoritmo recomendado hoje para essa
finalidade, e nunca em texto legível. O acesso à plataforma é feito por conexão
cifrada. Dentro do sistema, cada papel enxerga só o que precisa, e o acesso à
sua conta exige token com validade curta. Você pode ainda ativar a verificação
em duas etapas, por aplicativo autenticador ou por e-mail.

Nenhum sistema é imune. Se acontecer um incidente de segurança capaz de causar
risco relevante a você, comunicamos você e a ANPD, como manda o art. 48 da
LGPD.

## 9. Crianças e adolescentes

A CodeQuest é destinada a pessoas com **16 anos ou mais**. No cadastro pedimos
a data de nascimento e confirmamos a idade na hora: quem ainda não completou 16
anos não consegue criar conta. O tratamento de dados de adolescentes segue o
art. 14 da LGPD e é feito sempre no melhor interesse deles.

Se identificarmos uma conta de alguém com menos de 16 anos, suspendemos a conta
e apagamos os dados. Se você é responsável e quiser pedir isso, use o contato
da seção 1.

## 10. Mudanças nesta Política

Este documento tem versão e data de vigência, mostradas no topo desta página.
Uma versão nova passa a valer na data de vigência dela, e o seu aceite fica
registrado quando você confirmar a versão nova.

As regras de uso da plataforma estão nos [Termos de Uso](termos-de-uso.md)
(página `/termos`). Dúvidas de qualquer natureza, inclusive sobre esta
Política, na página de suporte (`/suporte`).
