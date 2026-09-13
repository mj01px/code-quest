import type { ReactNode } from "react";

const CORPO = "font-body text-lg leading-[1.8] tracking-[1px] text-ink-body";

export function idSecao(numero: number): string {
  return `secao-${String(numero).padStart(2, "0")}`;
}

export function Secao({
  numero,
  titulo,
  children,
}: {
  numero: number;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section
      id={idSecao(numero)}
      className="flex scroll-mt-24 flex-col gap-4 border-2 border-edge bg-panel p-6 shadow-pixel sm:p-7"
    >
      <h2 className="m-0 flex items-baseline gap-3 font-display text-[13px] leading-[1.8] tracking-[1px] text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)]">
        <span className="text-brand">{String(numero).padStart(2, "0")}</span>
        <span className="min-w-0">{titulo}</span>
      </h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

export function Paragrafo({ children }: { children: ReactNode }) {
  return <p className={`m-0 text-pretty ${CORPO}`}>{children}</p>;
}

export function Lista({ children }: { children: ReactNode }) {
  return <ul className="m-0 flex list-none flex-col gap-2 p-0">{children}</ul>;
}

export function Item({ children }: { children: ReactNode }) {
  return (
    <li className={`flex gap-3 ${CORPO}`}>
      <span
        aria-hidden="true"
        className="mt-[11px] h-1.5 w-1.5 shrink-0 bg-brand"
      />
      <span className="min-w-0">{children}</span>
    </li>
  );
}

export function Destaque({ children }: { children: ReactNode }) {
  return (
    <p
      className={`m-0 border-l-4 border-brand bg-panel-soft px-4 py-3 text-pretty ${CORPO}`}
    >
      {children}
    </p>
  );
}

export interface Linha {
  chave: string;
  celulas: ReactNode[];
}

export function Tabela({
  colunas,
  linhas,
}: {
  colunas: string[];
  linhas: Linha[];
}) {
  return (
    <div className="overflow-x-auto border-2 border-edge-soft">
      <table className="w-full min-w-[560px] border-collapse text-left">
        <thead>
          <tr className="bg-panel-soft">
            {colunas.map((coluna) => (
              <th
                key={coluna}
                scope="col"
                className="border-b-2 border-edge-soft px-3 py-2.5 font-label text-[10px] tracking-[2px] text-ink-label"
              >
                {coluna}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr key={linha.chave} className="border-b border-edge align-top">
              {linha.celulas.map((celula, indice) => (
                <td
                  key={colunas[indice] ?? indice}
                  className="px-3 py-2.5 font-body text-base leading-[1.6] tracking-wide text-ink-body"
                >
                  {celula}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
