"use client";

import { useEffect, useId, useRef, useState } from "react";

import { ErroApi, api } from "@/lib/api";
import { formatarData } from "@/lib/clas";

import { BTN_PERIGO, BTN_PRIMARIO, BTN_SECUNDARIO } from "./estilos";
import { IconeCopiar } from "./icones";

function mensagem(erro: unknown): string {
  return erro instanceof ErroApi
    ? erro.message
    : "Algo deu errado. Tente de novo.";
}

export function ModalConvite({
  tag,
  onFechar,
}: {
  tag: string;
  onFechar: () => void;
}) {
  const painel = useRef<HTMLDivElement>(null);
  const tituloId = useId();

  const [link, setLink] = useState<string | null>(null);
  const [expiraEm, setExpiraEm] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [revogando, setRevogando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    painel.current?.focus();
  }, []);

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  const ocupado = gerando || revogando;

  async function gerar() {
    setGerando(true);
    setErro(null);
    try {
      const convite = await api.gerarConvite(tag);
      setLink(convite.link);
      setExpiraEm(convite.expira_em);
      setCopiado(false);
    } catch (erro) {
      setErro(mensagem(erro));
    } finally {
      setGerando(false);
    }
  }

  async function revogar() {
    setRevogando(true);
    setErro(null);
    try {
      await api.revogarConvite(tag);
      setLink(null);
      setExpiraEm(null);
    } catch (erro) {
      setErro(mensagem(erro));
    } finally {
      setRevogando(false);
    }
  }

  async function copiar() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 p-4"
      onClick={() => {
        if (!ocupado) onFechar();
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
            <span className="rotulo text-brand-light">Gestão do clã</span>
            <h2
              id={tituloId}
              className="titulo m-0 font-display text-[15px] leading-[1.6] text-ink"
            >
              Link de convite
            </h2>
          </div>
          <button
            type="button"
            onClick={onFechar}
            disabled={ocupado}
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

        <p className="m-0 font-body text-base leading-[1.6] text-ink-body">
          Clã privado só aceita quem tem o link. Gerar um novo derruba o
          anterior.
        </p>

        {link ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 border-2 border-brand-strong bg-field px-3 shadow-pixel">
              <input
                readOnly
                value={link}
                aria-label="Link de convite"
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 border-0 bg-transparent py-2.5 font-body text-sm text-ink outline-none"
              />
              <button
                type="button"
                onClick={copiar}
                aria-label="Copiar link"
                className="inline-flex shrink-0 items-center gap-1.5 border-2 border-edge-soft px-2 py-1 font-label text-[10px] tracking-[2px] text-ink-muted hover:text-ink-soft"
              >
                <IconeCopiar size={14} /> {copiado ? "COPIADO" : "COPIAR"}
              </button>
            </div>
            {expiraEm ? (
              <span className="font-label text-[11px] tracking-[2px] text-ink-muted">
                EXPIRA EM {formatarData(expiraEm)}
              </span>
            ) : null}
          </div>
        ) : null}

        {erro ? (
          <p role="alert" className="m-0 font-body text-base text-danger">
            {erro}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-4">
          {link ? (
            <button
              type="button"
              onClick={revogar}
              disabled={ocupado}
              className={BTN_PERIGO}
            >
              {revogando ? "..." : "REVOGAR"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={gerar}
            disabled={ocupado}
            className={link ? BTN_SECUNDARIO : BTN_PRIMARIO}
          >
            {gerando ? "GERANDO..." : link ? "GERAR NOVO" : "GERAR LINK"}
          </button>
        </div>
      </div>
    </div>
  );
}
