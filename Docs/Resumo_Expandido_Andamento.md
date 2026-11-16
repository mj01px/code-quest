# Resumo Expandido (rascunho em andamento)

> **Nota para a equipe:** este arquivo é a fonte de texto. A versão formatada no modelo oficial (`MODELO_RESUMO_EXPANDIDO.docx`) é `E:\Downloads_Archive\Monografia CodeQuest\Resumo_Expandido_Final.docx`. Ela segue as seções do modelo:
>
> - INTRODUÇÃO;
> - OBJETIVO;
> - MATERIAL E MÉTODOS, que reúne Metodologia e Desenvolvimento;
> - RESULTADOS E DISCUSSÃO;
> - CONSIDERAÇÕES FINAIS;
> - REFERÊNCIAS.
>
> As citações são numeradas, no estilo Vancouver do modelo, e o resumo inicial com palavras-chave não entrou, porque o modelo não tem essa seção. Se mudar o texto aqui, refaça o .docx.
>
> **Fonte dos fatos:** a monografia revisada em 15/11/2026 (`[MONOGRAFIA] - CODEQUEST_atualizada.docx`) e o código na branch `main`, commit `46af66f`.

---

## CODEQUEST: PLATAFORMA WEB GAMIFICADA PARA O ENSINO DE PROGRAMAÇÃO COM EXECUÇÃO DE CÓDIGO EM AMBIENTE ISOLADO

**Autores:** Arthur Sabino da Silva; Julio Franz Moura; Mauro Aparecido Gonçalves de Campos Junior.
**Orientadora:** Profa. Viviane Guimarães Ribeiro.
**Curso:** Bacharelado em Engenharia de Software, Universidade de Mogi das Cruzes, 2026.

**Resumo:** O ensino de programação enfrenta altos índices de desistência nas primeiras semanas de estudo, agravados pela dificuldade de configurar um ambiente de desenvolvimento, pela falta de retorno imediato sobre os exercícios e pela pouca visibilidade do próprio progresso. Este trabalho apresenta o CodeQuest, plataforma web gamificada, em português e sem custo de acesso, na qual o progresso do estudante é representado pela evolução de um avatar. A solução reúne editor de código no navegador, execução do código em ambiente isolado por meio do Judge0 e correção automática por testes ocultos, complementada por análise estática em Python. Exercícios de SQL são executados com SQLite. A arquitetura combina Next.js, um monólito modular em Django REST Framework e PostgreSQL, com segurança tratada desde o projeto e conformidade com a LGPD. Como resultados, foram implementados os 37 requisitos funcionais e 32 dos 33 não funcionais, com 56 exercícios de código corrigidos automaticamente, 2.051 testes automatizados e a plataforma em produção em codequest.dev.br.

**Palavras-chave:** ensino de programação; gamificação; execução isolada de código; correção automática; aplicação web.

---

## 1. Introdução

A formação em programação é central na qualificação profissional em tecnologia, mas o início do percurso é o ponto mais frágil do aprendizado. Cursos online abertos, principal via de acesso gratuito ao conteúdo, registram evasão expressiva, e a queda de engajamento ocorre sobretudo nas primeiras semanas, antes que o estudante obtenha resultados concretos que sustentem sua motivação (PEREIRA, 2019).

Três obstáculos agravam esse quadro:

- configurar um ambiente de desenvolvimento local antes mesmo de escrever a primeira linha de código;
- a falta de retorno imediato sobre a correção dos exercícios, que impede o aluno de distinguir com rapidez o acerto do erro;
- a dificuldade de perceber a própria evolução, já que o progresso em programação é difuso e pouco visível no curto prazo.

Somam-se a eles as barreiras de acesso: as plataformas consolidadas do segmento são, em sua maioria, pagas e em língua inglesa, o que restringe o acesso do público brasileiro em início de formação.

A literatura sobre gamificação aponta efeitos positivos sobre a motivação. Esses efeitos, porém, variam conforme o contexto, e a maior parte das implementações se limita a pontos, medalhas e rankings (HAMARI; KOIVISTO; SARSA, 2014). Na execução de código enviado por terceiros, a escolha do mecanismo de isolamento é determinante para a segurança e o custo do sistema, e o problema já dispõe de soluções maduras (PEVELER; MAICUS; CUTLER, 2019).

A partir desse cenário, o CodeQuest reúne em uma única solução web, em português e gratuita:

- a execução de código no navegador;
- a correção automática com retorno imediato;
- uma gamificação na qual o progresso se materializa na evolução visual de um avatar.

## 2. Objetivos

### 2.1 Objetivo geral

Desenvolver uma plataforma web gamificada para o ensino de programação, na qual o progresso do estudante é representado pela evolução de um avatar, integrando execução e correção automática de código em ambiente computacional isolado e exercícios teóricos.

### 2.2 Objetivos específicos

a) Implementar a camada que encaminha as submissões de forma síncrona ao Judge0, com tratamento de falhas, limites de execução e controle de cota.

b) Implementar a correção automática de exercícios em Python e de atividades SQL executadas com SQLite, com casos de teste definidos para cada exercício.

c) Modelar e implementar o sistema de gamificação, com pontos de experiência, níveis, conquistas e evolução do avatar em três estágios.

d) Construir o módulo de gestão de conteúdo, com trilhas, aulas e exercícios, e controle de acesso pelos perfis de aluno, autor e administrador.

e) Implementar mecanismos de engajamento social: o ranking individual com apuração mensal e o perfil público do usuário.

## 3. Metodologia

O projeto adotou abordagem ágil com o método Kanban, com o quadro mantido no GitHub Projects e integrado ao repositório. O levantamento de requisitos foi colaborativo entre os três integrantes e organizado em um backlog priorizado, refinado ao longo do desenvolvimento. Os requisitos foram especificados com fluxos, regras de negócio e critérios de aceitação verificáveis, conforme o guia de requisitos do curso (HORAS, 2026).

A modelagem precedeu a implementação e incluiu:

- o diagrama entidade-relacionamento;
- os diagramas de classes;
- a modelagem dos processos de negócio em BPMN;
- a prototipação das telas.

O versionamento seguiu o fluxo de branches por funcionalidade, com revisão por pull request. A integração contínua no GitHub Actions executa, a cada pull request:

- os testes unitários;
- os testes de integração;
- a análise estática;
- por fim, o build da interface.

A validação combinou testes automatizados com a verificação manual das trilhas e exercícios antes da publicação. Na reta final, a equipe fez duas auditorias:

- uma auditoria de qualidade, que cruzou os requisitos não funcionais e as regras de negócio com o código;
- uma auditoria de invasão sobre as 98 rotas da API, acessando cada uma como aluno, autor, administrador e usuário anônimo.

A rastreabilidade de cada requisito foi documentada até o arquivo e a linha do código que o implementa.

## 4. Desenvolvimento

**Arquitetura.** A plataforma se organiza em quatro camadas: cliente, aplicação, persistência e serviços externos.

- **Cliente:** interface em Next.js.
- **Aplicação:** monólito modular em Django REST Framework, organizado em onze módulos, servido pelo Gunicorn com dois workers de quatro threads.
- **Persistência:** banco PostgreSQL.
- **Implantação:** os quatro serviços (Nginx, interface, API e banco) rodam em contêineres orquestrados pelo Docker Compose numa VPS da DigitalOcean, com HTTPS.
- **Infraestrutura enxuta:** não há fila nem cache externo. Os contadores de limitação de requisições e a cota diária de execução ficam no próprio PostgreSQL.

**Execução isolada e correção automática.** A execução do código do aluno foi delegada ao Judge0 (JUDGE0, 2026), sem acesso à rede e com limites de 2 segundos de CPU, 5 segundos de relógio e 128.000 KB de memória. A correção foi projetada em quatro níveis, dos quais dois estão implementados:

- **Nível 2, testes ocultos:** em Python, um programa próprio chama a função do aluno com os argumentos de cada caso e devolve o resultado em JSON. Em SQL, a aplicação valida o comando e o executa em SQLite em memória.
- **Nível 3, análise estática:** em Python, a árvore sintática verifica se o aluno usou a construção pedida e se evitou bibliotecas proibidas.

O aluno tem dois modos:

- **Rodar:** confere os casos visíveis e não dá XP.
- **Enviar:** corrige contra todos os casos; o resultado dos casos ocultos não é revelado.

A chamada ao serviço externo é protegida por:

- cota por usuário;
- disjuntor em 90% da cota diária;
- reaproveitamento de resultados idênticos por 10 minutos;
- degradação controlada, em que a indisponibilidade do Judge0 não derruba o restante da plataforma.

**Gamificação.** O XP é calculado pelo servidor conforme a dificuldade e creditado em transação, com restrição única no banco, de modo que um exercício nunca rende XP duas vezes. O XP vai para a criatura ativa, que evolui em três estágios por escolha do aluno. Completam a gamificação:

- conquistas;
- sequência de dias de estudo;
- desafio do dia;
- ranking mensal;
- clãs.

**Fluxo editorial.** Todo conteúdo segue os estados Rascunho, Em revisão, Aprovado e Publicado. As regras são:

- quem criou o conteúdo não pode aprová-lo (regra dos quatro olhos);
- a publicação é exclusiva do administrador;
- editar um conteúdo já publicado o devolve à revisão;
- o revisor vê um diff das alterações em relação à última versão aprovada.

**Segurança e LGPD.** Os mecanismos de segurança implementados são:

- senhas com Argon2;
- sessão em cookies HttpOnly e proteção contra CSRF;
- autenticação em dois fatores;
- bloqueio após cinco tentativas de login;
- controle de acesso por permissão em cada rota, com 25 permissões;
- política de segurança de conteúdo com nonce por requisição;
- trilha de auditoria somente de inserção, com retenção de 180 dias.

Para a LGPD, o titular pode exportar seus dados e excluir a conta por anonimização. O consentimento dos documentos legais é versionado.

## 5. Resultados

> Dados de 15/11/2026. Atualize antes da entrega de 23/11 se o código mudar.

| Indicador | Resultado |
|---|---|
| Requisitos funcionais implementados | 37 de 37 (100%) |
| Requisitos não funcionais implementados | 32 de 33 (RNF26, tipagem estrita, parcial) |
| Regras de negócio | 104, sendo 100 implementadas e 4 parciais |
| Exercícios de código com correção automática | 56 (Lógica de Programação 22, Python 16, Banco de Dados 13, Desafios do Dia 5) |
| Testes do backend | 1.413 aprovados, com 98% de cobertura |
| Testes do frontend | 638 aprovados em 88 suítes |
| Total de testes automatizados | 2.051 |
| Migrações versionadas do banco | 65 |
| Disponibilidade | Em produção em https://codequest.dev.br/ |

As soluções de referência dos 56 exercícios foram aprovadas nos modos Rodar e Enviar em uma verificação com executor local. A auditoria de invasão encontrou dois problemas, ambos corrigidos com teste de regressão:

- **Byte nulo na URL:** respondia com erro 500; agora é recusado com resposta 400.
- **API navegável em produção:** aparecia em produção; agora a API responde só em JSON.

Nenhuma rota de administração ficou acessível para aluno ou autor.

<!-- PENDENTE PARA 23/11: se o modelo pedir, incluir aqui uma ou duas figuras (arquitetura em camadas e tela do exercício com o terminal) e um parágrafo de discussão comparando com as plataformas correlatas. -->

## 6. Considerações finais

O trabalho respondeu à evasão de estudantes iniciantes com uma plataforma que reúne execução de código no navegador, correção automática com retorno imediato e progresso visível pela evolução de um avatar. Duas decisões delimitam a contribuição:

- **Delegação da execução isolada a um serviço especializado:** deslocou o esforço de engenharia para a orquestração da chamada externa, para a correção que avalia a estrutura do código e para a consistência da recompensa.
- **Revisão humana obrigatória antes da publicação:** preserva a qualidade pedagógica das trilhas e o lastro da pontuação.

Como trabalhos futuros, ficam:

- o processamento assíncrono das submissões;
- a abstração do motor de execução;
- a ampliação do conteúdo às demais trilhas;
- o ranking de clãs;
- a avaliação empírica do efeito do avatar sobre a permanência dos estudantes.

## Referências

HAMARI, Juho; KOIVISTO, Jonna; SARSA, Harri. Does gamification work? A literature review of empirical studies on gamification. In: HAWAII INTERNATIONAL CONFERENCE ON SYSTEM SCIENCES, 47., 2014, Waikoloa. **Proceedings** [...]. Piscataway: IEEE, 2014. p. 3025-3034. DOI: https://doi.org/10.1109/HICSS.2014.377.

HORAS, Alessandro Aparecido da Silva. **Guia de apoio:** como descrever requisitos funcionais para um projeto de software. Mogi das Cruzes: Universidade de Mogi das Cruzes, [2026?]. Material de apoio do Projeto Final de Curso (PFC).

JUDGE0. **Judge0:** robust, scalable and open-source online code execution system. [S. l.], 2026. Disponível em: https://judge0.com. Acesso em: 19 ago. 2026.

PEREIRA, Fagner Coin. **Gamificação como forma de minimizar a evasão em cursos online e abertos**. 2019. 83 f. Dissertação (Mestrado Profissional em Informática na Educação) - Instituto Federal de Educação, Ciência e Tecnologia do Rio Grande do Sul, Porto Alegre, 2019.

PEVELER, Matthew; MAICUS, Evan; CUTLER, Barbara. Comparing jailed sandboxes vs containers within an autograding system. In: ACM TECHNICAL SYMPOSIUM ON COMPUTER SCIENCE EDUCATION, 50., 2019, Minneapolis. **Proceedings** [...]. New York: ACM, 2019. p. 139-145. DOI: https://doi.org/10.1145/3287324.3287507.
