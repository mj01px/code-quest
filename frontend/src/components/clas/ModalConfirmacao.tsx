"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

import { BTN_SECUNDARIO } from "./estilos";

const CONFIRMAR_NEUTRO =
  "inline-flex items-center justify-center gap-2 border-[3px] border-brand-light bg-brand-deep px-5 py-4 font-display text-[11px] leading-[1.7] tracking-[1px] text-ink shadow-[0_0_0_3px_var(--color-brand-void),6px_6px_0_rgba(0,0,0,0.7)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

const CONFIRMAR_PERIGO =
  "inline-flex items-center justify-center gap-2 border-[3px] border-danger bg-danger-deep px-5 py-4 font-display text-[11px] leading-[1.7] tracking-[1px] text-ink shadow-[0_0_0_3px_rgba(127,29,29,0.5),6px_6px_0_rgba(0,0,0,0.7)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

interface Props {
  rotulo?: string;
  titulo: string;
  textoConfirmar: string;
  perigo?: boolean;
  carregando?: boolean;
  erro?: string | null;
  onConfirmar: () => void;
  onFechar: () => void;
  children: ReactNode;
}

export function ModalConfirmacao({
  rotulo,
  titulo,
  textoConfirmar,
  perigo = false,
  carregando = false,
  erro,
  onConfirmar,
  onFechar,
  children,
}: Props) {
  const painel = useRef<HTMLDivElement>(null);
  const tituloId = useId();

  useEffect(() => {
    painel.current?.focus();
  }, []);

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape" && !carregando) onFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [carregando, onFechar]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 p-4"
      onClick={() => {
        if (!carregando) onFechar();
      }}
    >
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        onClick={(evento) => evento.stopPropagation()}
        className="flex w-full max-w-[560px] flex-col gap-6 border-[3px] border-brand bg-panel p-7 shadow-frame outline-none"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2.5">
            {rotulo ? (
              <span className="font-label text-[11px] tracking-[2px] text-brand-light uppercase">
                {rotulo}
              </span>
            ) : null}
            <h2
              id={tituloId}
              className="titulo m-0 font-display text-[15px] leading-[1.6] text-ink"
            >
              {titulo}
            </h2>
          </div>
          <button
            type="button"
            onClick={onFechar}
            disabled={carregando}
            aria-label="Fechar"
            className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-edge-soft text-ink-muted hover:text-ink-soft disabled:opacity-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
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
        </div>

        <div className="font-body text-base leading-[1.6] text-ink-body">
          {children}
        </div>

        {erro ? (
          <p
            role="alert"
            className="m-0 font-body text-base leading-[1.4] text-danger"
          >
            {erro}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-4">
          <button
            type="button"
            onClick={onFechar}
            disabled={carregando}
            className={BTN_SECUNDARIO}
          >
            CANCELAR
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={carregando}
            className={perigo ? CONFIRMAR_PERIGO : CONFIRMAR_NEUTRO}
          >
            {carregando ? "..." : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
