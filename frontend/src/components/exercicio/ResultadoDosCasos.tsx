import type { Correcao, ResultadoDoCaso } from "@/lib/types";

const TITULO: Record<string, string> = {
  APROVADO: "Passou em todos os casos",
  RESPOSTA_ERRADA: "Alguns casos falharam",
  TEMPO_ESGOTADO: "O código demorou demais",
  ERRO_DE_EXECUCAO: "O código não chegou a rodar",
};

export function comoTexto(valor: unknown): string {
  if (valor === null) return "None";
  if (valor === true) return "True";
  if (valor === false) return "False";
  if (typeof valor === "string") return JSON.stringify(valor);
  return JSON.stringify(valor) ?? String(valor);
}

function chamada(caso: ResultadoDoCaso, funcao: string): string {
  const args = (caso.argumentos ?? []).map(comoTexto).join(", ");
  return `${funcao}(${args})`;
}

function Caso({ caso, funcao }: { caso: ResultadoDoCaso; funcao: string }) {
  const cor = caso.passou ? "text-success" : "text-danger";

  if (!caso.visivel) {
    return (
      <li className="flex items-center gap-2 font-body text-sm text-ink-muted">
        <span className={cor}>{caso.passou ? "✔" : "✘"}</span>
        Caso oculto {caso.ordem}
      </li>
    );
  }

  return (
    <li className="space-y-1 border-l-2 border-edge pl-3 font-body text-sm">
      <p className="text-ink-body">
        <span className={`mr-2 ${cor}`}>{caso.passou ? "✔" : "✘"}</span>
        {chamada(caso, funcao)}
      </p>
      {!caso.passou && (
        <p className="text-ink-muted">
          esperado {caso.erro_esperado || comoTexto(caso.esperado)}, obtido{" "}
          {caso.erro ? caso.erro : comoTexto(caso.obtido)}
        </p>
      )}
    </li>
  );
}

export function ResultadoDosCasos({
  correcao,
  funcao,
}: {
  correcao: Correcao;
  funcao: string;
}) {
  return (
    <section
      aria-live="polite"
      className="space-y-3 border-2 border-edge bg-panel-soft p-4"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3
          className={`font-label text-xs ${
            correcao.aprovado ? "text-success" : "text-ink-label"
          }`}
        >
          {TITULO[correcao.veredito] ?? correcao.veredito}
        </h3>
        <span className="font-body text-sm text-ink-muted">
          {correcao.aprovados} de {correcao.total}
        </span>
      </header>

      {correcao.casos.length > 0 && (
        <ul className="space-y-2">
          {correcao.casos.map((caso) => (
            <Caso key={caso.ordem} caso={caso} funcao={funcao} />
          ))}
        </ul>
      )}

      {correcao.saida && (
        <div className="space-y-1">
          <p className="font-label text-[0.65rem] text-ink-dim">saída</p>
          <pre className="overflow-x-auto bg-field p-3 font-body text-sm text-ink-body">
            {correcao.saida}
          </pre>
        </div>
      )}

      {correcao.erro && (
        <div className="space-y-1">
          <p className="font-label text-[0.65rem] text-ink-dim">erro</p>
          <pre className="overflow-x-auto bg-field p-3 font-body text-sm text-danger">
            {correcao.erro}
          </pre>
        </div>
      )}
    </section>
  );
}