# Relatório de Acompanhamento: entrega de 16/11/2026

**Projeto:** CodeQuest, plataforma web gamificada para o ensino de programação.
**Equipe:** Arthur Sabino da Silva, Julio Franz Moura e Mauro Aparecido Gonçalves de Campos Junior.
**Orientadora:** Profa. Viviane Guimarães Ribeiro.
**Período coberto:** de 09/11/2026 (entrega anterior) a 15/11/2026.

## 1. Repositório e sistema no ar

| Item | Valor |
|---|---|
| Repositório | https://github.com/mj01px/code-quest |
| Branch | `main` |
| Commit desta entrega | `46af66f` (15/11/2026) |
| Sistema em produção | https://codequest.dev.br/ |
| Instruções para testar | `Docs/Instrucoes_Execucao.md` |

No período foram 52 commits, integrados pelos pull requests #77 a #87.

## 2. Situação dos requisitos

| Indicador | Em 09/11 | Em 15/11 |
|---|---|---|
| Requisitos funcionais implementados | 30 de 35 documentados | 37 de 37 |
| Requisitos não funcionais implementados | 24 de 33 | 32 de 33 |
| Testes do backend (pytest) | | 1.413, todos aprovados, 98% de cobertura |
| Testes do frontend (Jest) | | 638 em 88 suítes, todos aprovados |
| Exercícios de código com correção automática | | 56 |

Entre as duas datas, oito RNFs passaram a implementados: RNF05, RNF11, RNF13, RNF24, RNF25, RNF27, RNF30 e RNF32. O único RNF ainda parcial é o RNF26 (análise estática e tipagem): a verificação estrita do mypy ainda não cobre os módulos `contas`, `progressao` e `clas`.

## 3. O que foi desenvolvido desde 09/11

### 3.1 Autoria de conteúdo

- **Aba "Meus Conteúdos":** o autor vê tudo o que criou, em qualquer estado. A lista é filtrada pelo usuário da sessão, e a edição confere o dono no servidor.
- **Trava de revisão:** ao editar um conteúdo aprovado ou publicado, o servidor guarda a versão anterior e devolve o conteúdo para revisão. A versão nova nunca vai ao ar sem ser revisada.
- **Diff de alterações:** o revisor vê o que mudou desde a última versão aprovada, com o texto incluído em verde e o removido em vermelho riscado. O diff cobre também as aulas e exercícios editados dentro da trilha.
- **Publicação restrita ao administrador:** o autor envia para revisão; publicar exige a permissão `trilhas.publish`, que só o administrador tem.
- **Editor de seções da aula:** a aula é montada em seções tituladas, com prévia de como o aluno vai ler.

### 3.2 Correção automática

- A correção dos exercícios de Python e de Lógica foi ampliada, e a de SQL foi concluída. O comando do aluno é validado e executado em SQLite em memória dentro do Judge0.
- O catálogo chegou a 56 exercícios de código com correção: 22 de Lógica de Programação, 16 de Python, 13 de Banco de Dados e 5 de Desafios do Dia.
- Exercícios de código sem correção configurada deixaram de creditar XP.
- O cache da correção passou a usar o código exato do aluno na chave.
- O corretor Python recusa resultados duplicados.
- **Warden:** o editor de código bloqueia a colagem e mostra um aviso pedindo que o aluno digite a solução.

### 3.3 Segurança

Foi feita uma auditoria de invasão sobre as 98 rotas da API, acessando cada uma como aluno, autor, administrador e anônimo, com corpos e parâmetros maliciosos. Nenhuma rota de administração abriu para aluno ou autor. Os achados foram corrigidos, cada um com teste de regressão:

- **Byte nulo (`%00`) na URL:** o middleware `RecusarNul` responde 400 no formato padrão. Antes, a requisição chegava ao PostgreSQL e a rota respondia 500.
- **API navegável:** em produção (`DEBUG=False`) a API responde só JSON. A interface HTML do Django REST Framework existe apenas no desenvolvimento.
- **Página 404:** está em português, com o visual do CodeQuest.
- **Dependência:** o Django REST Framework subiu de 3.18.0 para 3.18.2, versão de correção de segurança.
- **Configuração de produção:**
  - a documentação Swagger fica desligada;
  - o banco publica a porta só em `127.0.0.1`;
  - testes automatizados reprovam o projeto se essas condições forem quebradas.

Além disso, a limitação de requisições passou a usar o `DatabaseCache`, com contadores no PostgreSQL compartilhados entre os processos. A política de segurança de conteúdo (CSP) passou a usar nonce por requisição.

### 3.4 Infraestrutura, implantação e CI/CD

- **Implantação:** Docker Compose com quatro contêineres (Nginx, Next.js, Django com Gunicorn e PostgreSQL 18), numa VPS da DigitalOcean.
- **Acesso:** HTTPS com Nginx atrás da Cloudflare, no domínio `codequest.dev.br`.
- **Gunicorn:** 2 workers com 4 threads cada, para que esperas pelo Judge0 não bloqueiem o restante do site.
- **Administrador inicial:** comando `criar_admin` para criá-lo no primeiro deploy.
- **Integração contínua (GitHub Actions):** os testes unitários, os testes de integração e o linter rodam em jobs separados, e o build do frontend só roda se os três passarem.

### 3.5 Experiência do aluno

- Aviso global quando o limite de requisições é atingido.
- Central de perguntas frequentes em `/faq`.
- Máscara de digitação na data de nascimento do cadastro.
- Correções no fluxo da aula: a leitura sem quiz leva aos exercícios, e o próximo módulo só aparece com o módulo atual completo.

### 3.6 Documentação

- **Manual do Usuário** (`Docs/Manual_do_Usuario.md`), com os perfis Aluno, Autor e Administrador.
- **Rastreabilidade de RFs, RNFs e regras de negócio** (`Docs/Rastreabilidade_Requisitos.md` e `Docs/Rastreabilidade_Regras_Negocio.md`), com arquivo e linha exatos no código.
- **Cheat Sheet da Banca** (`Docs/Cheat_Sheet_Banca.md`): perguntas prováveis, onde está a resposta no código, números do sistema, rotas e telas.
- **Monografia:** revisada em 15/11 contra o código, conforme a seção 4.

## 4. Apontamentos corrigidos

| Origem | Apontamento | Correção |
|---|---|---|
| Auditoria pré-banca (11/11) | RNFs ainda parciais ou planejados | Fechados oito RNFs (ver seção 2); testes dependentes de ordem isolados |
| Auditoria de invasão (14/11) | Byte nulo derrubava rotas com erro 500 | Middleware `RecusarNul` responde 400 |
| Auditoria de invasão (14/11) | API navegável do DRF exposta em produção | Só JSON com `DEBUG=False` |
| Auditoria de invasão (14/11) | Página 404 padrão do Next, em inglês | Página 404 própria em português |
| Auditoria de invasão (14/11) | Autor conseguia publicar o próprio conteúdo | Publicação só com `trilhas.publish` (administrador) |
| Auditoria de invasão (14/11) | Versão do DRF desatualizada | DRF 3.18.2 e testes que travam as rotas públicas |
| Julio (correção automática) | Chave do cache não usava o código exato | Corrigido |
| Julio (correção automática) | Exercício de código sem correção creditava XP | Bloqueado |
| Julio (correção automática) | Corretor Python aceitava resultados duplicados | Recusa os duplicados |
| Julio (correção automática) | Execução SQL sem proteção e terminal sumindo | Execução protegida e terminal visível |
| Mauro (implantação) | Swagger acessível em produção | Desligado em produção |
| Mauro (implantação) | Limite do catálogo atingido pelo próprio build do Next | Rede interna do Docker isenta do limite |
| Mauro (fluxo da aula) | Leitura sem quiz não levava a lugar nenhum | Leva aos exercícios |
| Mauro (fluxo da aula) | Próximo módulo aparecia antes da hora | Só aparece com o módulo completo |
| Julio (revisão da monografia, 15/11) | Divergências entre o texto e o código | 88 correções no texto: suporte a SQL, RF37 implementado, números de testes, perfil, painel do administrador, Warden e outras. Saiu do Resumo e do Abstract uma afirmação sem evidência no repositório. |

## 5. Pendências até 23/11

1. **Resumo Expandido:** já formatado no modelo oficial, em 4 páginas, e entregue nesta remessa junto com a monografia (`Resumo_Expandido_Final.docx`). Falta a revisão final da equipe e da orientação.
2. **Monografia:**
   - atualizar o Sumário;
   - inserir a imagem da Figura 32, que hoje só tem legenda;
   - trocar a captura da Figura 34;
   - avaliar o redesenho das Figuras 5, 6, 8, 15, 22 e 24, cujos diagramas são anteriores às últimas mudanças, embora o texto já descreva o comportamento atual.
3. **Slides e vídeo de apresentação**, previstos no cronograma para 17/11 a 23/11.
4. **Pendências técnicas conhecidas, registradas como trabalho futuro:**
   - RNF26 parcial;
   - rotina de backup do banco removida do deploy;
   - o quiz entrega `resposta_correta` ao navegador, embora a correção e a nota sejam feitas no servidor.

## 6. Dúvidas para a orientação

1. **Limites do Resumo Expandido:** a versão formatada no modelo oficial tem 4 páginas, como o exemplo do modelo. Há limite mínimo ou máximo de páginas?
2. **Conteúdo do Resumo Expandido:** o modelo de exemplo não traz um resumo inicial nem palavras-chave, e a versão da equipe segue essa estrutura. Esses itens são necessários? Cabe uma figura, como a da arquitetura, além da Tabela 1?
3. **Autoria e afiliação do Resumo Expandido:** a orientadora consta como coautora. O modelo pede o e-mail de cada autor na nota de afiliação: devemos incluí-lo?
4. **Entrega do Resumo Expandido:** em 23/11, em .docx ou em PDF?
5. **Vídeo:** qual é a duração e o formato esperados? Ele deve mostrar o sistema em produção ou também o código?
6. **Apresentação para a banca:** quanto tempo dura? Podemos fazer a demonstração ao vivo em `codequest.dev.br`?
7. **Cobertura de testes:** o cronograma previa 50% e hoje o backend está em 98%. Vale destacar esse número na monografia e na apresentação?
