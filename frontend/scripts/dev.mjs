// Impede que o `next dev` gere AGENTS.md e CLAUDE.md na raiz do frontend a
// cada execucao (o Next faz isso via @vercel/detect-agent, que ativa a
// escrita ao detectar variaveis de ambiente de agentes, como as listadas
// abaixo). Esses arquivos sao instrucoes de ferramenta, nao fazem parte do
// CodeQuest e nao devem poluir o ambiente de trabalho nem o repositorio.
// Isto e higiene do ambiente, nao ocultacao: o uso de IA no desenvolvimento
// deste projeto e reconhecido e documentado em Docs/Arthur quando aplicavel.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const VARIAVEIS_DE_AGENTE = [
  "AI_AGENT",
  "ANTIGRAVITY_AGENT",
  "AUGMENT_AGENT",
  "CLAUDECODE",
  "CLAUDE_CODE",
  "CLAUDE_CODE_IS_COWORK",
  "CODEX_CI",
  "CODEX_SANDBOX",
  "CODEX_THREAD_ID",
  "COPILOT_ALLOW_ALL",
  "COPILOT_GITHUB_TOKEN",
  "COPILOT_MODEL",
  "CURSOR_AGENT",
  "CURSOR_EXTENSION_HOST_ROLE",
  "CURSOR_TRACE_ID",
  "GEMINI_CLI",
  "OPENCODE_CLIENT",
  "REPL_ID",
];

const ambiente = { ...process.env };
for (const nome of VARIAVEIS_DE_AGENTE) delete ambiente[nome];

const require = createRequire(import.meta.url);
const next = require.resolve("next/dist/bin/next");

const servidor = spawn(
  process.execPath,
  [next, "dev", ...process.argv.slice(2)],
  { stdio: "inherit", env: ambiente },
);

servidor.on("exit", (codigo, sinal) => {
  if (sinal) {
    process.kill(process.pid, sinal);
    return;
  }
  process.exit(codigo ?? 0);
});
