"use client";

import { useEffect, useState } from "react";

import { EVENTO_LIMITE } from "@/lib/limite";

export const TEMPO_DO_AVISO = 6000;

export function mensagemDeLimite(segundos: number): string {
  if (!Number.isFinite(segundos) || segundos <= 0) {
    return "Muitas requisições. Aguarde alguns segundos e tente de novo.";
  }
  const n = Math.ceil(segundos);
  return `Muitas requisições. Aguarde ${n} ${n === 1 ? "segundo" : "segundos"} e tente de novo.`;
}

// Objeto novo a cada evento: um segundo 429 reinicia a contagem do aviso.
export function AvisoDeLimite() {
  const [aviso, setAviso] = useState<{ segundos: number } | null>(null);

  useEffect(() => {
    function aoLimitar(evento: Event) {
      setAviso({ segundos: (evento as CustomEvent<number>).detail });
    }
    window.addEventListener(EVENTO_LIMITE, aoLimitar);
    return () => window.removeEventListener(EVENTO_LIMITE, aoLimitar);
  }, []);

  useEffect(() => {
    if (aviso === null) return;
    const fim = setTimeout(() => setAviso(null), TEMPO_DO_AVISO);
    return () => clearTimeout(fim);
  }, [aviso]);

  if (aviso === null) return null;

  return (
    <div
      role="alert"
      className="pointer-events-none fixed right-0 bottom-28 z-50 flex justify-end px-4 sm:px-6"
    >
      <p className="pointer-events-auto max-w-[360px] border-2 border-brand-light bg-panel-deep px-5 py-4 font-body text-base leading-[1.3] tracking-[1px] text-ink-body shadow-[0_8px_0_0_var(--color-void),0_0_24px_rgba(0,0,0,0.6)]">
        {mensagemDeLimite(aviso.segundos)}
      </p>
    </div>
  );
}
