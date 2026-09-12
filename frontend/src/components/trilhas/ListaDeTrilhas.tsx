"use client";

import { useId, useMemo, useState } from "react";

import { TrilhaCard } from "@/components/trilhas/TrilhaCard";
import { IconeLupa } from "@/components/ui/Icone";
import { plural } from "@/lib/derivados";
import type { TrilhaResumo } from "@/lib/types";

const VAZIO: ReadonlySet<string> = Object.freeze(new Set<string>());

const FILTROS = [
  { id: "todas", rotulo: "Todas" },
  { id: "andamento", rotulo: "Em andamento" },
  { id: "nao-iniciadas", rotulo: "Não iniciadas" },
  { id: "concluidas", rotulo: "Concluídas" },
] as const;

type Filtro = (typeof FILTROS)[number]["id"];

/** Normaliza o texto para busca sem acento. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function ListaDeTrilhas({
  trilhas,
  // Sem progresso da gamificação, todas contam como não iniciadas.
  progressoPorSlug = {},
  iniciadas = VAZIO,
}: {
  trilhas: TrilhaResumo[];
  progressoPorSlug?: Record<string, number>;
  iniciadas?: ReadonlySet<string>;
}) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const idBusca = useId();

  const visiveis = useMemo(() => {
    const termo = normalizar(busca.trim());

    return trilhas.filter((trilha) => {
      const progresso = progressoPorSlug[trilha.slug] ?? 0;
      const comecou = progresso > 0 || iniciadas.has(trilha.slug);

      if (filtro === "andamento" && !(comecou && progresso < 100)) {
        return false;
      }
      if (filtro === "nao-iniciadas" && comecou) return false;
      if (filtro === "concluidas" && progresso < 100) return false;

      if (!termo) return true;
      return normalizar(`${trilha.nome} ${trilha.descricao}`).includes(termo);
    });
  }, [trilhas, progressoPorSlug, iniciadas, busca, filtro]);

  return (
    <section aria-labelledby="lista-de-trilhas" className="mt-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2
          id="lista-de-trilhas"
          className="m-0 font-display text-[13px] leading-[1.7] tracking-[1px] text-ink"
        >
          Trilhas
        </h2>
        <p
          className="font-label text-[11px] tracking-[2px] text-ink-muted uppercase"
          aria-live="polite"
        >
          {plural(visiveis.length, "trilha", "trilhas")}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 basis-64">
          <label htmlFor={idBusca} className="sr-only">
            Buscar trilha
          </label>
          <IconeLupa className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-brand" />
          <input
            id={idBusca}
            type="search"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Buscar trilha..."
            className="w-full border-2 border-brand-strong bg-field py-3 pr-3 pl-9 font-label text-[12px] tracking-[1px] text-ink shadow-pixel uppercase placeholder:text-ink-muted/70"
          />
        </div>

        {FILTROS.map((opcao) => {
          const ativo = filtro === opcao.id;
          return (
            <button
              key={opcao.id}
              type="button"
              aria-pressed={ativo}
              onClick={() => setFiltro(opcao.id)}
              className={`cursor-pointer border-2 px-4 py-3 font-label text-[11px] tracking-[2px] uppercase shadow-pixel transition-colors ${
                ativo
                  ? "border-brand-light bg-brand-deep text-ink"
                  : "border-edge-soft bg-transparent text-ink-muted hover:border-brand hover:text-ink-soft"
              }`}
            >
              {opcao.rotulo}
            </button>
          );
        })}
      </div>

      {visiveis.length === 0 ? (
        <p className="mt-8 m-0 border-2 border-dashed border-edge-soft bg-panel p-6 font-body text-xl tracking-[1px] text-ink-muted">
          &gt; Nenhuma trilha encontrada. Tente outro termo.
        </p>
      ) : (
        <ul className="mt-8 m-0 flex list-none flex-col gap-4 p-0">
          {visiveis.map((trilha) => (
            <TrilhaCard
              key={trilha.id}
              trilha={trilha}
              progresso={progressoPorSlug[trilha.slug] ?? null}
              iniciada={iniciadas.has(trilha.slug)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
