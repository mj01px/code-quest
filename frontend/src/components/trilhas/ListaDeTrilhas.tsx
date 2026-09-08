"use client";

import { useId, useMemo, useState } from "react";

import { TrilhaCard } from "@/components/trilhas/TrilhaCard";
import { IconeLupa } from "@/components/ui/Icone";
import { plural } from "@/lib/derivados";
import type { TrilhaResumo } from "@/lib/types";

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
}: {
  trilhas: TrilhaResumo[];
  progressoPorSlug?: Record<string, number>;
}) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const idBusca = useId();

  const visiveis = useMemo(() => {
    const termo = normalizar(busca.trim());

    return trilhas.filter((trilha) => {
      const progresso = progressoPorSlug[trilha.slug] ?? 0;

      if (filtro === "andamento" && !(progresso > 0 && progresso < 100)) {
        return false;
      }
      if (filtro === "nao-iniciadas" && progresso > 0) return false;
      if (filtro === "concluidas" && progresso < 100) return false;

      if (!termo) return true;
      return normalizar(`${trilha.nome} ${trilha.descricao}`).includes(termo);
    });
  }, [trilhas, progressoPorSlug, busca, filtro]);

  return (
    <section aria-labelledby="lista-de-trilhas" className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="lista-de-trilhas" className="titulo text-lg text-ink-soft">
          Trilhas
        </h2>
        <p className="rotulo text-ink-muted" aria-live="polite">
          {plural(visiveis.length, "trilha", "trilhas")}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-64">
          <label htmlFor={idBusca} className="sr-only">
            Buscar trilha
          </label>
          <IconeLupa className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
          <input
            id={idBusca}
            type="search"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Buscar trilha..."
            className="rotulo w-full border border-edge-soft bg-panel py-2.5 pr-3 pl-9 text-ink-soft placeholder:text-ink-muted/70"
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
              className={`rotulo cursor-pointer border px-4 py-2.5 transition-colors ${
                ativo
                  ? "border-brand-strong bg-brand-strong text-ink-soft"
                  : "border-edge bg-panel-soft text-ink-muted hover:border-brand hover:text-ink-soft"
              }`}
            >
              {opcao.rotulo}
            </button>
          );
        })}
      </div>

      {visiveis.length === 0 ? (
        <p className="mt-6 border border-edge bg-panel p-6 text-xs text-ink-muted">
          Nenhuma trilha corresponde a esse filtro.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {visiveis.map((trilha) => (
            <TrilhaCard
              key={trilha.id}
              trilha={trilha}
              progresso={progressoPorSlug[trilha.slug] ?? null}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
