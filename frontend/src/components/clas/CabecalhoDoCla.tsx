"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";

import { LIMITE_MEMBROS, bandeira, formatarData } from "@/lib/clas";
import type { Cla } from "@/lib/types";

import { IconeCopiar } from "./icones";

export function CabecalhoDoCla({
  cla,
  acoes,
  cta,
}: {
  cla: Cla;
  acoes?: ReactNode;
  cta?: ReactNode;
}) {
  const [copiado, setCopiado] = useState(false);
  const info = bandeira(cla.bandeira);

  async function copiarTag() {
    try {
      await navigator.clipboard.writeText(`#${cla.tag}`);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <section
      aria-labelledby="nome-cla"
      className="relative flex flex-col border-[3px] border-brand bg-panel shadow-frame"
    >
      {acoes ? (
        <div className="absolute top-4 right-4 z-10 flex gap-2">{acoes}</div>
      ) : null}
      <div className="flex flex-wrap items-center gap-7 border-b-2 border-edge bg-[#15101f] p-8">
        <span className="flex h-[120px] w-[120px] shrink-0 items-center justify-center border-2 border-brand-shadow bg-void shadow-[0_0_0_4px_rgba(168,85,247,0.22)]">
          <Image
            src={info.src}
            alt={`Bandeira de ${cla.nome}`}
            width={104}
            height={104}
            className="block h-[104px] w-[104px]"
          />
        </span>
        <div className="flex min-w-0 flex-1 basis-80 flex-col gap-3.5">
          <span className="self-start border-2 border-brand-shadow bg-void px-3 py-1.5 font-label text-[11px] tracking-[2px] text-brand-light">
            CLÃ {cla.tipo_rotulo.toUpperCase()} · {cla.total_membros}/
            {LIMITE_MEMBROS} MEMBROS
          </span>
          <h1
            id="nome-cla"
            className="titulo m-0 font-display text-2xl leading-[1.7] text-balance text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)]"
          >
            {cla.nome}
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-label text-[12px] tracking-[2px] text-ink-body">
              #{cla.tag}
            </span>
            <button
              type="button"
              onClick={copiarTag}
              aria-label="Copiar tag"
              className="inline-flex items-center gap-1.5 border-2 border-edge-soft px-2 py-1 font-label text-[10px] tracking-[2px] text-ink-muted hover:text-ink-soft"
            >
              <IconeCopiar size={14} /> {copiado ? "COPIADO" : "COPIAR"}
            </button>
          </div>
        </div>
        {cta}
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4 bg-panel-deep px-8 py-5">
        <p className="m-0 flex-1 basis-80 font-body text-base leading-[1.6] text-ink-body">
          {cla.descricao || "Este clã ainda não tem descrição."}
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center border-2 border-brand px-2.5 py-1 font-label text-[10px] tracking-[2px] text-brand-light uppercase">
            Nível mín. {cla.nivel_minimo}
          </span>
          <span className="inline-flex items-center border-2 border-edge-soft px-2.5 py-1 font-label text-[10px] tracking-[2px] text-ink-muted uppercase">
            Desde {formatarData(cla.criado_em)}
          </span>
        </div>
      </div>
    </section>
  );
}
