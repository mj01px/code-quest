import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { TelaBase } from "@/components/layout/TelaBase";
import type { DocumentoVigente } from "@/lib/types";
import { idSecao } from "./Prosa";

export interface ItemIndice {
  numero: number;
  titulo: string;
}

interface Props {
  titulo: ReactNode;
  resumo: string;
  documento?: DocumentoVigente | null;
  indice?: ItemIndice[];
  children: ReactNode;
}

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function PaginaLegal({
  titulo,
  resumo,
  documento,
  indice,
  children,
}: Props) {
  const temIndice = Boolean(indice?.length);

  return (
    <TelaBase>
      <AppHeader />

      <main className="mx-auto w-full max-w-6xl min-w-0 flex-1 px-5 py-10 sm:px-8 sm:py-12">
        <div
          className={`grid gap-10 ${
            temIndice ? "lg:grid-cols-[240px_1fr] lg:gap-12" : ""
          }`}
        >
          {temIndice ? (
            <aside className="hidden lg:block">
              <nav
                className="sticky top-8 flex flex-col gap-3"
                aria-label="Neste documento"
              >
                <p className="rotulo text-ink-dim">NESTE DOCUMENTO</p>
                <ol className="flex list-none flex-col gap-2 p-0">
                  {indice?.map((item) => (
                    <li key={item.numero}>
                      <a
                        href={`#${idSecao(item.numero)}`}
                        className="flex gap-2 border-2 border-edge bg-panel px-3 py-2.5 font-label text-[10px] leading-[1.5] tracking-[0.15em] text-ink-muted hover:border-brand hover:text-brand-mist"
                      >
                        <span className="text-brand-light">
                          {String(item.numero).padStart(2, "0")}
                        </span>
                        <span className="min-w-0">
                          {item.titulo.toUpperCase()}
                        </span>
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>
          ) : null}

          <div className="min-w-0">
            <header className="flex flex-col gap-5 border-b-2 border-edge pb-8">
              <span className="font-label text-[11px] tracking-[0.2em] text-brand-light">
                {"// LEGAL"}
              </span>

              <h1 className="m-0 font-display text-[17px] leading-[1.7] tracking-[1px] text-ink [overflow-wrap:anywhere] [text-shadow:2px_2px_0_var(--color-brand-dark)] sm:text-[22px]">
                {titulo}
              </h1>

              <p className="m-0 max-w-[62ch] font-body text-lg leading-[1.8] tracking-[1px] text-ink-body text-pretty">
                {resumo}
              </p>

              {documento ? (
                <p className="m-0 flex flex-wrap items-center gap-2 font-label text-[10px] tracking-[2px] text-ink-muted">
                  <span className="border-2 border-brand-shadow bg-panel-soft px-2.5 py-1 text-brand-light">
                    VERSÃO {documento.versao}
                  </span>
                  <span>
                    VIGENTE DESDE {formatarData(documento.vigente_desde)}
                  </span>
                </p>
              ) : null}
            </header>

            <div className="flex flex-col gap-6 pt-10">{children}</div>
          </div>
        </div>
      </main>
    </TelaBase>
  );
}
