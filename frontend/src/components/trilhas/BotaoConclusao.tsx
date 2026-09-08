"use client";

import { useSyncExternalStore } from "react";

import { IconeCheck } from "@/components/ui/Icone";
import {
  alternar,
  assinar,
  estaConcluida,
  instantaneo,
  instantaneoNoServidor,
} from "@/lib/progresso";

export function BotaoConclusao({
  trilhaSlug,
  faseSlug,
}: {
  trilhaSlug: string;
  faseSlug: string;
}) {
  // No servidor o instantâneo é vazio; o valor real entra na hidratação.
  const progresso = useSyncExternalStore(
    assinar,
    instantaneo,
    instantaneoNoServidor,
  );
  const concluida = estaConcluida(progresso, trilhaSlug, faseSlug);

  return (
    <div className="mt-6 flex flex-wrap items-center gap-4">
      <button
        type="button"
        aria-pressed={concluida}
        onClick={() => alternar(trilhaSlug, faseSlug)}
        className={`rotulo inline-flex cursor-pointer items-center gap-3 border px-6 py-3 transition-colors ${
          concluida
            ? "border-success text-success hover:border-edge-soft hover:text-ink-muted"
            : "border-brand-strong bg-brand-strong text-ink-soft hover:bg-brand"
        }`}
      >
        <IconeCheck className="h-3.5 w-3.5" />
        {concluida ? "Concluído" : "Marcar como concluído"}
      </button>

      <p className="rotulo text-ink-muted">
        Progresso guardado só neste navegador
      </p>
    </div>
  );
}
