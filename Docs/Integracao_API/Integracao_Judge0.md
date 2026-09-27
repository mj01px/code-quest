# Integração com o Judge0

Correção automática dos exercícios de código: o aluno escreve a solução na IDE
da plataforma, o servidor julga o código contra casos de teste cadastrados e só
credita XP quando ele passa em todos.

## Por que existe

Antes, `POST /exercicios/<trilha>/<exercicio>/concluir/` não lia corpo nenhum:
qualquer usuário autenticado ganhava XP sem resolver nada, bastava o DevTools.
Julgar a resposta exige executar o código do aluno, e executar código de
terceiro no processo do Django não tem versão segura. Daí a dependência externa.

O [Judge0](https://judge0.com) recebe código-fonte, stdin e limites; devolve
stdout, stderr, status, tempo e memória. Usamos o Judge0 CE pela RapidAPI, no
plano contratado, que tem cota diária. A instalação própria exige Linux com cgroup v1, Docker
privilegiado e cerca de 20 GB, o que não roda no ambiente de desenvolvimento nem
cabe na VPS de deploy.

## Como funciona

1. A IDE (Monaco) manda o código para `POST /executar/` ou `/concluir/`. O
   Django confere a permissão e a rajada de 5 por minuto.
2. O Django valida o pedido e roda a análise AST, localmente. Barrado aqui,
   responde 400 sem chamar o Judge0.
3. Se o mesmo código foi julgado nos últimos 10 minutos, reaproveita o veredito
   (cache) e pula para o passo 8.
4. Confere o teto diário do usuário e o disjuntor global. Estourado, responde
   429 ou 503.
5. Monta o programa (código do aluno mais harness) e as entradas, e chama o
   Judge0 pela RapidAPI.
6. Recebe stdout e status.
7. Compara a saída com o gabarito, no Django.
8. No Enviar aprovado, chama `creditar_exercicio` e o aluno ganha XP.

**O front nunca fala com o Judge0.** A chave viveria no navegador e o aluno
poderia forjar o veredito. O Django é o único que conhece a chave, o gabarito e
a decisão.

Como o Judge0 executa um programa e não sabe o que é função, o Django cola o
código do aluno com um **harness** (`harness.py`): um trecho que localiza a
função, lê as entradas do stdin, chama uma a uma e imprime o resultado em JSON,
prefixado por um marcador que o separa do que o aluno tenha imprimido.

Antes de qualquer chamada, o código passa por `ast.parse` no próprio Django
(`analise_ast.py`), que confere sintaxe, se a função existe e se o aluno
respeitou o que o exercício exige ou proíbe (`for`, `try`, `enumerate`). Barrado aí, a resposta é
imediata e sem custo. O AST é portão, não pontuação: quem prova correção são os
casos de teste.

## Modelo de dados

| Model | O que guarda | Relação |
|---|---|---|
| `EspecificacaoDeCodigo` | Linguagem, nome da função, código inicial e requisitos do AST | Uma por exercício (`OneToOne` com `Exercicio`) |
| `CasoDeTeste` | Ordem, argumentos, retorno esperado ou erro esperado, e se é visível | Vários por especificação; a ordem é única dentro dela |
| `Submissao` | Usuário, modo (Executar ou Enviar), código, hash, veredito, resultado completo, se veio do cache e data | Várias por usuário e por exercício |

Apagar o exercício apaga a especificação e os casos; as submissões ficam, com o
exercício nulo.

## Endpoints

Da plataforma, todos exigindo sessão e a permissão indicada:

| Método | Rota | Permissão | Uso |
|---|---|---|---|
| GET | `/api/v1/exercicios/{trilha}/{exercicio}/codigo/` | `submissoes.create` | A IDE busca função esperada, código inicial, requisitos, exemplos visíveis, limite de 10.000 caracteres e o último código aprovado do aluno |
| POST | `/api/v1/exercicios/{trilha}/{exercicio}/executar/` | `submissoes.create` | Executar: roda só os casos visíveis, mostra saída e erro, nunca credita XP |
| POST | `/api/v1/exercicios/{trilha}/{exercicio}/concluir/` | `exercicios.complete` e, com correção automática, `submissoes.create` | Enviar: roda todos os casos e credita XP se aprovado |

No Judge0, um só:

```
POST {JUDGE0_URL}/submissions/?base64_encoded=true&wait=true
```

Cabeçalhos escolhidos pela URL: `X-RapidAPI-Key` e `X-RapidAPI-Host` na
RapidAPI, `X-Auth-Token` em instância própria. Todas as requisições levam
`User-Agent: code-quest/1.0`; sem ele o Cloudflare da RapidAPI barra com
`error code: 1010`.

Corpo:

```json
{
  "language_id": 71,
  "source_code": "<base64 do código do aluno + harness>",
  "stdin": "<base64 do JSON com as entradas>",
  "cpu_time_limit": 2,
  "wall_time_limit": 5,
  "memory_limit": 128000,
  "max_file_size": 64,
  "enable_network": false
}
```

- **Unidades**: `cpu_time_limit` e `wall_time_limit` em segundos;
  `memory_limit` e `max_file_size` em KB (128.000 KB, cerca de 125 MB).
- **Só Python.** `language_id` 71 é o Python 3 do Judge0 CE, a única linguagem
  do projeto (`Linguagem.PYTHON`). A linguagem vem da especificação do
  exercício; o aluno não escolhe.
- **`enable_network: false` sempre.** No padrão do Judge0 a rede vem ligada; sem
  o campo, o código do aluno teria internet.
- **`wait=true`**: a RapidAPI aceita, e isso reduz o consumo a uma requisição por
  submissão.
- **`expected_output` não é usado**: mandar o gabarito seria entregá-lo a um
  terceiro. A comparação é feita no Django, sobre JSON, com tolerância em float
  e sem depender da ordem das chaves.

Resposta, na mesma chamada por causa do `wait=true`, com os campos que
`judge0.py` lê. Valores ilustrativos, de um exercício `soma(a, b)` com as
entradas `[[2, 3], [10, -4]]`:

```json
{
  "status": { "id": 3, "description": "Accepted" },
  "stdout": "QEBSRVNVTFRBRE9AQFt7Im9rIjogdHJ1ZSwgInZhbG9yIjogNX0sIHsib2siOiB0cnVlLCAidmFsb3IiOiA2fV0K",
  "stderr": null,
  "compile_output": null,
  "message": null,
  "time": "0.021",
  "memory": 3316
}
```

O `stdout` decodificado é
`@@RESULTADO@@[{"ok": true, "valor": 5}, {"ok": true, "valor": 6}]`: o harness
separa essa linha pelo marcador, e o Django compara cada `valor` com o
esperado. `time` vem em segundos e `memory` em KB; os demais campos que o
Judge0 devolve são ignorados.

## Casos ocultos

Cada exercício tem casos visíveis, que aparecem como exemplo, e ocultos, que
barram a solução decorada. Como no Enviar o stdin carrega as entradas ocultas, o
código do aluno poderia imprimi-las; por isso a resposta traz dos ocultos apenas
`ordem`, `visivel` e `passou`, sem saída nem traceback. O resultado completo
fica na tabela `Submissao`.

## Vereditos e erros

| Status do Judge0 | Resultado |
|---|---|
| 3 Accepted | compara o JSON: `APROVADO` ou `RESPOSTA_ERRADA` |
| 5 Time Limit Exceeded | `TEMPO_ESGOTADO` |
| 6, 7 a 12, 14, ou saída sem o marcador | `ERRO_DE_EXECUCAO` |
| 13 Internal Error, HTTP 4xx/5xx, timeout | `Judge0Error` |

| Situação | Resposta |
|---|---|
| Judge0 fora do ar ou sem configuração | 503 `corretor_indisponivel` |
| Disjuntor da cota diária global | 503 `limite_diario` |
| Teto diário do usuário | 429 `limite_do_usuario` |
| Rajada acima de 5/min | 429 `throttled` |
| Portão AST e validação | 400 `validacao`, com o motivo em `details[].code`: `erro_de_sintaxe`, `funcao_ausente`, `requisito_exigido`, `requisito_proibido`, `codigo_vazio`, `codigo_grande`, `conta_inativa`, `exercicio_nao_publicado`, `sem_correcao_automatica` |

Nos 429 e 503, o código da tabela vem direto em `error.code`; nos 400,
`error.code` é sempre `validacao`.

Falha do juiz nunca aprova: em 503, nenhum XP é creditado e o aluno tenta de
novo. Não há nova tentativa automática: a tentativa é gravada antes da chamada
paga e conta na cota mesmo quando falha (timeout, 5xx), então repetir gastaria
cota sem garantia de resposta.

## Custo

Cada submissão que chega ao Judge0 gasta a cota diária do plano. Os freios, do
mais barato ao mais caro:

- **Portão AST**: código barrado não chega à API.
- **Cache por hash, por 10 minutos**: a chave junta a versão do harness, a
  linguagem, a função, os casos (com a visibilidade de cada um) e o código
  normalizado (sem espaço no fim de linha nem linhas em branco nas bordas), no
  mesmo modo, Executar ou Enviar. Repetir o mesmo código nesse prazo
  reaproveita o veredito; os 10 minutos contam da chamada paga.
- **Rajada**: 5/min por usuário, no escopo `judge0`, com `executar/` e o envio
  do `concluir/` dividindo o mesmo balde.
- **Teto diário por usuário**: `JUDGE0_LIMITE_POR_USUARIO`, padrão 10.
- **Disjuntor global**: para em 90% de `JUDGE0_LIMITE_DIARIO` e libera na
  meia-noite de `America/Sao_Paulo`. A cota da RapidAPI, porém, renova no
  horário da assinatura, não à meia-noite: com as janelas desalinhadas, dois
  dias do CodeQuest podem somar mais que a cota numa janela da RapidAPI, e o
  disjuntor não evita o 429 do próprio serviço, que chega ao aluno como 503
  `corretor_indisponivel`. Registrado como pendente em
  `Docs/Arthur/CHANGELOG.md`.

Os dois tetos diários contam no banco e só chamadas pagas: acerto de cache e
código barrado antes da chamada não entram.

## Configuração

```
JUDGE0_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_TOKEN=
JUDGE0_TIMEOUT=15
JUDGE0_LIMITE_DIARIO=50
JUDGE0_LIMITE_POR_USUARIO=10
```

Cada integrante cria a própria chave na RapidAPI. Com `JUDGE0_URL` ou
`JUDGE0_TOKEN` vazios, o projeto sobe normalmente: só as rotas de correção
respondem 503.

Para cadastrar os casos de teste: `py manage.py seed_trilhas` e depois
`py manage.py seed_correcao`, que é idempotente e cadastra 14 exercícios da
trilha de Python.

## Testes

Os testes do módulo ficam em `apps/correcao/tests/` e **nenhum chama a API**:
onde é preciso executar código, entra um executor local; onde é preciso simular
falha, entram clientes falsos. A suíte roda sem internet e sem chave
configurada.

Um deles executa a solução de referência de cada exercício contra todos os seus
casos: se alguém alterar um gabarito e deixar um caso desatualizado, a suíte
acusa.

## Privacidade

O código escrito pelo aluno é enviado ao Judge0 CE, via RapidAPI, para ser
executado. Só o código e as entradas do exercício são enviados: nenhum dado da
conta (e-mail, nickname ou identificador) acompanha a requisição. Não há
confirmação documentada de onde nem por quanto tempo o Judge0 retém a
submissão.

Toda tentativa também fica na tabela `Submissao`, com o código, o veredito e o
resultado: Executar, Enviar, reprovada e até a chamada que falhou no Judge0,
que é gravada antes de sair.

## Glossário

- **RBAC**: cada rota exige uma permissão (ex.: `submissoes.create`), que vem do nível de acesso do usuário.
- **Escopo `judge0`**: balde de limite do DRF, 5 requisições por minuto por usuário, dividido entre `executar/` e o envio do `concluir/`.
- **Disjuntor**: trava que suspende as chamadas ao Judge0 para todos quando o dia chega a 90% da cota.
- **Envelope de erro**: formato único das falhas da API, `{ error: { code, message, details } }`.
- **Harness**: trecho que o Django cola no código do aluno para chamar a função e imprimir o resultado.

## O que ficou de fora

Exercícios que dependem de arquivo no sandbox, a trilha de banco de dados (SQL
precisa de outro corretor, que compare esquema e linhas) e os exercícios
teóricos, que são discursivos e devem virar múltipla escolha. Esses seguem com a
conclusão auto-declarada, registrado como limitação reconhecida.
