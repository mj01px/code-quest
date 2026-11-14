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

export function arquivoDeExemplo(valor: unknown) {
  if (
    typeof valor === "object" && valor !== null &&
    "__cq_arquivo__" in valor && typeof valor.__cq_arquivo__ === "string" &&
    "conteudo" in valor && typeof valor.conteudo === "string"
  ) {
    return {
      nome: valor.__cq_arquivo__,
      conteudo: valor.conteudo,
      verificar: "verificar" in valor && valor.verificar === true,
    };
  }
  return null;
}

export function comoArgumento(valor: unknown): string {
  const arquivo = arquivoDeExemplo(valor);
  if (arquivo) return comoTexto(arquivo.nome);
  if (typeof valor === "object" && valor !== null && "__cq_objeto__" in valor && Object.keys(valor).length === 1) {
    const atributos = valor.__cq_objeto__;
    if (typeof atributos === "object" && atributos !== null && !Array.isArray(atributos)) {
      const argumentos = Object.entries(atributos).map(([nome, conteudo]) => (
        `${nome}=${comoTexto(conteudo)}`
      ));
      return `SimpleNamespace(${argumentos.join(", ")})`;
    }
  }
  return comoTexto(valor);
}

function chamada(caso: ResultadoDoCaso, funcao: string): string {
  const args = (caso.argumentos ?? []).map(comoArgumento).join(", ");
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
        {caso.descricao ?? chamada(caso, funcao)}
      </p>
      {!caso.passou && !caso.descricao && (
        <p className="text-ink-muted">
          {arquivoDeExemplo(caso.argumentos?.[0])?.verificar ? "linhas esperadas" : "esperado"}{" "}
          {caso.erro_esperado || comoTexto(caso.esperado)}, obtido{" "}
          {caso.erro ? caso.erro : comoTexto(caso.obtido)}
        </p>
      )}
    </li>
  );
}

export function ResultadoDosCasos({
  correcao,
  funcao,
  semContagem = false,
}: {
  correcao: Correcao;
  funcao: string;
  semContagem?: boolean;
}) {
  if (correcao.personalizado) {
    return (
      <p role="status" className="border-2 border-edge bg-panel-soft p-4 font-body text-sm text-ink-body">
        {correcao.aprovado
          ? "Execução concluída com suas entradas. Envie para validar com os testes oficiais."
          : "A execução com suas entradas falhou. Confira o erro no terminal."}
      </p>
    );
  }
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
        {semContagem ? null : (
          <span className="font-body text-sm text-ink-muted">
            {correcao.aprovados} de {correcao.total} {correcao.total === 1 ? "caso aprovado" : "casos aprovados"}
          </span>
        )}
      </header>

      {correcao.casos.length > 0 && (
        <ul className="space-y-2">
          {correcao.casos.map((caso) => (
            <Caso key={caso.ordem} caso={caso} funcao={funcao} />
          ))}
        </ul>
      )}
    </section>
  );
}
