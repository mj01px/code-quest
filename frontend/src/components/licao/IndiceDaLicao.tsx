"use client";

import { useEffect, useState } from "react";

import { rotuloDaSecao, type Secao } from "@/lib/licao";

export function useSecaoAtiva(secoes: Secao[]) {
  const [ativa, setAtiva] = useState<string | null>(secoes[0]?.id ?? null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const alvos = secoes
      .map((secao) => document.getElementById(secao.id))
      .filter((alvo): alvo is HTMLElement => alvo !== null);
    const observador = new IntersectionObserver(
      (entradas) => {
        const visivel = entradas.find((entrada) => entrada.isIntersecting);
        if (visivel) setAtiva(visivel.target.id);
      },
      { rootMargin: "0px 0px -70% 0px" },
    );
    alvos.forEach((alvo) => observador.observe(alvo));
    return () => observador.disconnect();
  }, [secoes]);

  return [ativa, setAtiva] as const;
}

export function IndiceDaLicao({
  secoes,
  ativa,
  aoSelecionar,
}: {
  secoes: Secao[];
  ativa: string | null;
  aoSelecionar: (id: string) => void;
}) {
  return (
    <nav aria-label="Nesta lição" className="flex flex-col gap-3">
      <span className="font-label text-[11px] tracking-[2px] text-ink-muted uppercase">
        Nesta lição
      </span>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {secoes.map((secao) => {
          const marcada = secao.id === ativa;
          return (
            <li key={secao.id}>
              <a
                href={`#${secao.id}`}
                aria-current={marcada ? "location" : undefined}
                onClick={() => aoSelecionar(secao.id)}
                className={`flex items-center gap-3 border-2 px-3 py-2.5 font-label text-[11px] tracking-[2px] uppercase ${
                  marcada
                    ? "border-brand-light bg-brand-deep text-ink"
                    : "border-edge text-ink-body hover:border-brand hover:text-ink-soft"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 shrink-0 ${marcada ? "bg-ink" : "bg-brand-shadow"}`}
                />
                <span className="min-w-0">{rotuloDaSecao(secao.titulo)}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
