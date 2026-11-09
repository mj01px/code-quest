"use client";

import type { ReactNode } from "react";

import { BarraDeFoco } from "@/components/layout/BarraDeFoco";
import { IndiceDaLicao, useSecaoAtiva } from "@/components/licao/IndiceDaLicao";
import type { Secao } from "@/lib/licao";

export function LeituraDaLicao({
  secoes,
  sobretitulo,
  titulo,
  minutos,
  rotaDeSaida,
  depoisDaLeitura,
  children,
}: {
  secoes: Secao[];
  sobretitulo: string;
  titulo: string;
  minutos: number;
  rotaDeSaida: string;
  depoisDaLeitura: string | null;
  children: ReactNode;
}) {
  const [ativa, setAtiva] = useSecaoAtiva(secoes);

  return (
    <div className="flex min-h-dvh flex-col">
      <BarraDeFoco
        sairHref={rotaDeSaida}
        placar={
          <span className="font-label text-[10px] tracking-[2px] text-brand-light uppercase sm:text-[11px]">
            Leitura · {minutos} min
          </span>
        }
      />

      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-4 py-10 sm:px-8 sm:py-14 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
          {secoes.length > 0 ? (
            <IndiceDaLicao secoes={secoes} ativa={ativa} aoSelecionar={setAtiva} />
          ) : null}
          {depoisDaLeitura ? (
            <div className="flex flex-col gap-2 border-2 border-brand-shadow bg-panel-deep p-4">
              <span className="font-label text-[10px] tracking-[2px] text-brand-light uppercase">
                Depois da leitura
              </span>
              <p className="m-0 font-body text-base leading-[1.6] tracking-[0.5px] text-ink-body">
                {depoisDaLeitura}
              </p>
            </div>
          ) : null}
        </aside>

        <article className="flex min-w-0 max-w-3xl flex-col gap-6">
          <header className="flex flex-col gap-4">
            <p className="m-0 font-label text-[11px] tracking-[2px] text-brand-light uppercase">
              {sobretitulo}
            </p>
            <h1 className="m-0 font-display text-[16px] leading-[1.7] tracking-[1px] text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)] sm:text-[20px]">
              {titulo}
            </h1>
          </header>

          {children}
        </article>
      </div>

    </div>
  );
}
