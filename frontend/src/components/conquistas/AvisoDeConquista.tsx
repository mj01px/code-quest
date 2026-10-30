"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { api, temSessao } from "@/lib/api";
import { EVENTO_CONQUISTAS, novasConquistas } from "@/lib/conquistas";
import type { Conquista } from "@/lib/types";

import { IconeConquista } from "./IconeConquista";

export const TEMPO_NA_TELA = 5000;
export const TEMPO_DA_SAIDA = 400;

export function AvisoDeConquista() {
  const { progresso } = useProgresso();
  const caminho = usePathname();

  const [fila, setFila] = useState<Conquista[]>([]);
  const [visivel, setVisivel] = useState(false);

  const mostradas = useRef(new Set<string>());
  const emVoo = useRef(false);
  const pendente = useRef(false);

  const verificar = useCallback(async () => {
    if (!temSessao()) return;
    if (emVoo.current) {
      pendente.current = true;
      return;
    }
    emVoo.current = true;
    try {
      do {
        pendente.current = false;
        const lista = await api.minhasConquistas();
        const novas = novasConquistas(lista).filter(
          (c): c is Conquista & { slug: string } =>
            c.slug !== null && !mostradas.current.has(c.slug),
        );
        if (novas.length > 0) {
          for (const c of novas) mostradas.current.add(c.slug);
          setFila((atual) => [...atual, ...novas]);
          await api.marcarConquistasVistas();
        }
      } while (pendente.current);
    } catch {
      pendente.current = false;
    } finally {
      emVoo.current = false;
    }
  }, []);

  useEffect(() => {
    void verificar();
  }, [verificar, progresso, caminho]);

  useEffect(() => {
    function aoAvisar() {
      void verificar();
    }
    window.addEventListener(EVENTO_CONQUISTAS, aoAvisar);
    return () => window.removeEventListener(EVENTO_CONQUISTAS, aoAvisar);
  }, [verificar]);

  const atual = fila[0] ?? null;

  useEffect(() => {
    if (atual === null) return;

    const entrada = requestAnimationFrame(() => setVisivel(true));
    const saida = setTimeout(() => setVisivel(false), TEMPO_NA_TELA);
    const fim = setTimeout(
      () => setFila((restante) => restante.slice(1)),
      TEMPO_NA_TELA + TEMPO_DA_SAIDA,
    );

    return () => {
      cancelAnimationFrame(entrada);
      clearTimeout(saida);
      clearTimeout(fim);
    };
  }, [atual]);

  if (atual === null) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed right-0 bottom-28 z-50 flex justify-end px-4 sm:px-6"
    >
      <Link
        href="/conquistas"
        className={`pointer-events-auto flex max-w-[360px] items-center gap-4 border-2 border-brand-light bg-panel-deep px-5 py-4 shadow-[0_8px_0_0_var(--color-void),0_0_24px_rgba(0,0,0,0.6)] transition-all duration-300 hover:border-brand-pale motion-reduce:transition-none ${
          visivel ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
        }`}
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-brand bg-brand-void text-brand-light">
          <IconeConquista icone={atual.icone} className="h-7 w-7" />
        </span>
        <span className="flex min-w-0 flex-col gap-1.5">
          <span className="font-label text-[9px] tracking-[3px] text-ink-muted">
            CONQUISTA DESBLOQUEADA
          </span>
          <span className="font-display text-[12px] leading-[1.5] text-brand-light">
            {atual.nome}
          </span>
          <span className="font-body text-base leading-[1.3] tracking-[1px] text-ink-body">
            {atual.descricao}
          </span>
        </span>
      </Link>
    </div>
  );
}
