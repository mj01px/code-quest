"use client";

import { useEffect, useId, useRef } from "react";

import { BarraSegmentada } from "@/components/ui/BarraSegmentada";
import {
  formatarDataDaConquista,
  fracaoDoProgresso,
  rotuloDeRaridade,
  rotuloDoEstado,
} from "@/lib/conquistas";
import type { Conquista } from "@/lib/types";

import { BLOCO, estadoDa } from "./estilos";
import { IconeConquista } from "./IconeConquista";

const ROTULO_TOM = {
  desbloqueada: "text-success",
  bloqueada: "text-ink-muted",
  oculta: "text-brand-light",
} as const;

interface Props {
  conquista: Conquista;
  onFechar: () => void;
}

export function ModalConquista({ conquista, onFechar }: Props) {
  const painel = useRef<HTMLDivElement>(null);
  const tituloId = useId();
  const descricaoId = useId();
  const estado = estadoDa(conquista);
  const fracao = conquista.desbloqueada ? null : fracaoDoProgresso(conquista);

  useEffect(() => {
    const anterior = document.activeElement;
    painel.current?.focus();
    return () => {
      if (anterior instanceof HTMLElement) anterior.focus();
    };
  }, []);

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 p-4"
      onClick={onFechar}
    >
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={descricaoId}
        tabIndex={-1}
        onClick={(evento) => evento.stopPropagation()}
        className="relative flex w-full max-w-[440px] flex-col items-center gap-6 border-[3px] border-brand bg-panel px-7 pt-10 pb-8 text-center shadow-frame outline-none"
      >
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar"
          className="absolute top-3 right-3 flex h-11 w-11 items-center justify-center border-2 border-edge-soft text-ink-muted hover:text-ink-soft"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="square"
            aria-hidden="true"
          >
            <path d="M5 5l14 14M19 5L5 19" />
          </svg>
        </button>

        <div
          className={`flex h-[120px] w-[120px] items-center justify-center ${BLOCO[estado]}`}
        >
          <IconeConquista icone={conquista.icone} className="h-16 w-16" />
        </div>

        <div className="flex flex-col items-center gap-3">
          <span
            className={`font-label text-[11px] tracking-[3px] ${ROTULO_TOM[estado]}`}
          >
            {rotuloDoEstado(conquista)}
          </span>
          <h2
            id={tituloId}
            className="m-0 font-display text-[15px] leading-[1.6] text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)]"
          >
            {conquista.nome}
          </h2>
          <p
            id={descricaoId}
            className="m-0 max-w-[320px] font-body text-base leading-[1.5] text-ink-body text-pretty"
          >
            {conquista.descricao}
          </p>
        </div>

        {fracao !== null ? (
          <div className="flex w-full flex-col items-center gap-2">
            <BarraSegmentada
              valor={fracao * 100}
              segmentos={Math.min(conquista.meta ?? 10, 20)}
              rotulo={`Progresso em ${conquista.nome}`}
              expandida
            />
            <span className="font-label text-[11px] tracking-[2px] text-ink-muted">
              {conquista.progresso} / {conquista.meta}
            </span>
          </div>
        ) : null}

        <dl className="m-0 grid w-full grid-cols-2 gap-px border-2 border-edge bg-edge">
          <div className="flex flex-col gap-1.5 bg-panel-deep p-3">
            <dt className="font-label text-[10px] tracking-[2px] text-ink-muted">
              {conquista.desbloqueada ? "DESBLOQUEADA EM" : "STATUS"}
            </dt>
            <dd className="m-0 font-label text-[12px] tracking-[1px] text-ink">
              {conquista.desbloqueada
                ? formatarDataDaConquista(conquista.desbloqueada_em)
                : "AINDA NÃO"}
            </dd>
          </div>
          <div className="flex flex-col gap-1.5 bg-panel-deep p-3">
            <dt className="font-label text-[10px] tracking-[2px] text-ink-muted">
              RARIDADE
            </dt>
            <dd className="m-0 font-label text-[12px] tracking-[1px] text-ink">
              {rotuloDeRaridade(conquista.raridade)}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
