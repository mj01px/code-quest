"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

interface Props {
  rotulo: string;
  titulo: string;
  largura?: "media" | "larga";
  bloqueado?: boolean;
  rodape?: ReactNode;
  onFechar: () => void;
  children: ReactNode;
}

const LARGURA = {
  media: "max-w-[640px]",
  larga: "max-w-[920px]",
};

export function ModalAdmin({
  rotulo,
  titulo,
  largura = "media",
  bloqueado = false,
  rodape,
  onFechar,
  children,
}: Props) {
  const painel = useRef<HTMLDivElement>(null);
  const tituloId = useId();

  useEffect(() => {
    const origem = document.activeElement as HTMLElement | null;
    painel.current?.focus();
    return () => {
      if (origem?.isConnected) origem.focus();
    };
  }, []);

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape" && !bloqueado) onFechar();
      if (evento.key !== "Tab" || !painel.current) return;
      const focaveis = painel.current.querySelectorAll<HTMLElement>(
        "button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea",
      );
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      const ativo = document.activeElement;
      if (!primeiro || !ultimo || !painel.current.contains(ativo)) {
        evento.preventDefault();
        (primeiro ?? painel.current).focus();
        return;
      }
      if (evento.shiftKey && (ativo === primeiro || ativo === painel.current)) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && ativo === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [bloqueado, onFechar]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 p-4"
      onClick={() => {
        if (!bloqueado) onFechar();
      }}
    >
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        onClick={(evento) => evento.stopPropagation()}
        className={`flex max-h-[90vh] w-full ${LARGURA[largura]} flex-col border-[3px] border-brand bg-panel shadow-frame outline-none`}
      >
        <div className="flex items-start justify-between gap-4 border-b-2 border-edge-soft px-6 py-5">
          <div className="flex flex-col gap-2.5">
            <span className="font-label text-[11px] tracking-[2px] text-brand">
              {rotulo}
            </span>
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
            disabled={bloqueado}
            aria-label="Fechar"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center border-2 border-edge-soft text-ink-muted hover:text-ink-soft disabled:opacity-50"
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

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {rodape ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-edge-soft bg-panel-deep px-6 py-4">
            {rodape}
          </div>
        ) : null}
      </div>
    </div>
  );
}
