import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { TelaBase } from "@/components/layout/TelaBase";
import type { DocumentoVigente } from "@/lib/types";

interface Props {
  titulo: ReactNode;
  resumo: string;
  documento?: DocumentoVigente | null;
  children: ReactNode;
}

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function PaginaLegal({ titulo, resumo, documento, children }: Props) {
  return (
    <TelaBase>
      <AppHeader />

      <main className="mx-auto w-full max-w-3xl min-w-0 flex-1 px-5 py-10 sm:px-8 sm:py-12">
        <header className="flex flex-col gap-5 border-b-2 border-edge pb-8">
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
              <span>VIGENTE DESDE {formatarData(documento.vigente_desde)}</span>
            </p>
          ) : null}
        </header>

        <div className="flex flex-col gap-10 pt-10">{children}</div>
      </main>
    </TelaBase>
  );
}
