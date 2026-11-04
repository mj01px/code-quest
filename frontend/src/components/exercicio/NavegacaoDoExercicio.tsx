"use client";

import Link from "next/link";

import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { estaConcluida } from "@/lib/progresso";

export function PlacarDoModulo({
  trilhaSlug,
  fases,
}: {
  trilhaSlug: string;
  fases: string[];
}) {
  const { chaves } = useProgresso();
  const feitas = fases.filter((slug) => estaConcluida(chaves, trilhaSlug, slug)).length;

  return (
    <span className="font-label text-[10px] tracking-[2px] text-brand-light uppercase sm:text-[11px]">
      {feitas} / {fases.length} concluídos
    </span>
  );
}

export function AcoesDoExercicio({
  trilhaSlug,
  exercicioSlug,
  proximoHref,
}: {
  trilhaSlug: string;
  exercicioSlug: string;
  proximoHref: string;
}) {
  const { chaves } = useProgresso();
  const concluido = estaConcluida(chaves, trilhaSlug, exercicioSlug);

  return (
    <div className="flex justify-end border-t-[3px] border-edge bg-panel-deep px-4 py-3 sm:px-6">
      {concluido ? (
        <Link
          href={proximoHref}
          className="inline-flex items-center gap-2 border-[3px] border-brand-light bg-brand-deep px-6 py-3.5 font-display text-[11px] leading-[1.7] tracking-[1px] text-ink uppercase shadow-[0_0_0_3px_var(--color-brand-void),4px_4px_0_rgba(0,0,0,0.7)] hover:bg-brand-strong"
        >
          Próximo &gt;
        </Link>
      ) : (
        <button
          type="button"
          aria-disabled="true"
          title="Conclua o exercício para avançar"
          className="inline-flex cursor-not-allowed items-center gap-2 border-[3px] border-edge-soft bg-panel px-6 py-3.5 font-display text-[11px] leading-[1.7] tracking-[1px] text-ink-dim uppercase"
        >
          Próximo &gt;
        </button>
      )}
    </div>
  );
}
