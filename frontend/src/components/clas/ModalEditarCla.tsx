"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

import { ErroApi, api } from "@/lib/api";
import {
  BANDEIRAS,
  DESCRICAO_MAX,
  NIVEL_MAXIMO,
  NIVEL_MINIMO_GLOBAL,
} from "@/lib/clas";
import type { Bandeira, Cla, TipoDeCla } from "@/lib/types";

import { BTN_PRIMARIO, BTN_SECUNDARIO } from "./estilos";
import { IconeCadeado, IconeGlobo } from "./icones";

const SELECIONADO =
  "border-[3px] border-brand-light shadow-[0_0_0_3px_var(--color-brand-void),6px_6px_0_rgba(0,0,0,0.7)]";
const NAO_SELECIONADO = "border-2 border-edge-soft";

const TIPOS: { id: TipoDeCla; titulo: string; texto: string }[] = [
  { id: "PUBLICO", titulo: "PÚBLICO", texto: "Entra quem tiver o nível." },
  { id: "PRIVADO", titulo: "PRIVADO", texto: "Só com link de convite." },
];

export function ModalEditarCla({
  cla,
  onFechar,
  onSalvo,
}: {
  cla: Cla;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const painel = useRef<HTMLDivElement>(null);
  const tituloId = useId();

  const [descricao, setDescricao] = useState(cla.descricao);
  const [bandeiraSel, setBandeiraSel] = useState<Bandeira>(cla.bandeira);
  const [tipo, setTipo] = useState<TipoDeCla>(cla.tipo);
  const [nivel, setNivel] = useState(cla.nivel_minimo);

  const [salvando, setSalvando] = useState(false);
  const [errosCampo, setErrosCampo] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  useEffect(() => {
    painel.current?.focus();
  }, []);

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape" && !salvando) onFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [salvando, onFechar]);

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    if (salvando) return;
    setSalvando(true);
    setErrosCampo({});
    setErroGeral(null);
    try {
      await api.editarCla(cla.tag, {
        descricao: descricao.trim(),
        bandeira: bandeiraSel,
        tipo,
        nivel_minimo: nivel,
      });
      onSalvo();
    } catch (erro) {
      if (erro instanceof ErroApi) {
        const porCampo = erro.porCampo();
        setErrosCampo(porCampo);
        if (Object.keys(porCampo).length === 0) setErroGeral(erro.message);
      } else {
        setErroGeral("Algo deu errado. Tente de novo.");
      }
      setSalvando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 p-4"
      onClick={() => {
        if (!salvando) onFechar();
      }}
    >
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        onClick={(evento) => evento.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-[560px] flex-col gap-6 overflow-y-auto border-[3px] border-brand bg-panel p-7 shadow-frame outline-none"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2.5">
            <span className="rotulo text-brand-light">Gestão do clã</span>
            <h2
              id={tituloId}
              className="titulo m-0 font-display text-[15px] leading-[1.6] text-ink"
            >
              Editar clã
            </h2>
          </div>
          <button
            type="button"
            onClick={onFechar}
            disabled={salvando}
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

        <p className="m-0 font-body text-sm leading-[1.5] text-ink-muted">
          Nome e tag não mudam. O resto, sim.
        </p>

        <form onSubmit={salvar} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-4">
              <label
                htmlFor="edit-desc"
                className="font-label text-[11px] tracking-[2px] text-ink-label"
              >
                DESCRIÇÃO
              </label>
              <span className="font-label text-[11px] tracking-[2px] text-ink-muted">
                {descricao.length}/{DESCRICAO_MAX}
              </span>
            </div>
            <textarea
              id="edit-desc"
              rows={3}
              maxLength={DESCRICAO_MAX}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Sobre o que é o clã?"
              className="resize-y border-2 border-brand-strong bg-field px-3.5 py-3 font-body text-[15px] leading-[1.6] text-ink shadow-pixel outline-none"
            />
            {errosCampo.descricao ? (
              <p className="m-0 font-body text-sm text-danger">
                {errosCampo.descricao}
              </p>
            ) : null}
          </div>

          <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
            <legend className="p-0 font-label text-[11px] tracking-[2px] text-ink-label">
              BANDEIRA
            </legend>
            <div className="grid grid-cols-4 gap-3">
              {BANDEIRAS.map((b) => {
                const marcada = b.slug === bandeiraSel;
                return (
                  <button
                    key={b.slug}
                    type="button"
                    aria-pressed={marcada}
                    aria-label={b.rotulo}
                    onClick={() => setBandeiraSel(b.slug)}
                    className={`flex aspect-square items-center justify-center bg-void p-2 ${
                      marcada ? SELECIONADO : NAO_SELECIONADO
                    }`}
                  >
                    <Image
                      src={b.src}
                      alt=""
                      width={56}
                      height={56}
                      className="block h-14 w-14"
                    />
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
            <legend className="p-0 font-label text-[11px] tracking-[2px] text-ink-label">
              QUEM PODE ENTRAR
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {TIPOS.map((t) => {
                const marcado = t.id === tipo;
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={marcado}
                    onClick={() => setTipo(t.id)}
                    className={`flex flex-col gap-2.5 bg-panel-deep p-4 text-left ${
                      marcado ? SELECIONADO : NAO_SELECIONADO
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        className={`flex ${marcado ? "text-brand-light" : "text-ink-ghost"}`}
                      >
                        {t.id === "PUBLICO" ? (
                          <IconeGlobo size={20} />
                        ) : (
                          <IconeCadeado size={20} />
                        )}
                      </span>
                      <span className="font-label text-[12px] tracking-[2px] text-ink">
                        {t.titulo}
                      </span>
                    </span>
                    <span className="font-body text-sm leading-[1.5] text-ink-muted">
                      {t.texto}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-col gap-3">
            <span
              id="edit-nivel"
              className="font-label text-[11px] tracking-[2px] text-ink-label"
            >
              NÍVEL MÍNIMO PRA ENTRAR
            </span>
            <div
              role="group"
              aria-labelledby="edit-nivel"
              className="flex flex-wrap items-center gap-3.5"
            >
              <div className="flex items-stretch border-2 border-edge-soft bg-void">
                <button
                  type="button"
                  aria-label="Diminuir nível mínimo"
                  onClick={() => setNivel((n) => Math.max(NIVEL_MINIMO_GLOBAL, n - 1))}
                  disabled={nivel <= NIVEL_MINIMO_GLOBAL}
                  className="h-12 w-12 border-r-2 border-edge-soft font-display text-sm text-brand-light disabled:opacity-40"
                >
                  -
                </button>
                <span
                  aria-live="polite"
                  className="flex min-w-[72px] items-center justify-center px-3 font-display text-[15px] text-ink"
                >
                  {nivel}
                </span>
                <button
                  type="button"
                  aria-label="Aumentar nível mínimo"
                  onClick={() => setNivel((n) => Math.min(NIVEL_MAXIMO, n + 1))}
                  disabled={nivel >= NIVEL_MAXIMO}
                  className="h-12 w-12 border-l-2 border-edge-soft font-display text-sm text-brand-light disabled:opacity-40"
                >
                  +
                </button>
              </div>
              <span className="flex-1 basis-40 font-body text-sm text-ink-muted">
                De {NIVEL_MINIMO_GLOBAL} a {NIVEL_MAXIMO}.
              </span>
            </div>
            {errosCampo.nivel_minimo ? (
              <p className="m-0 font-body text-sm text-danger">
                {errosCampo.nivel_minimo}
              </p>
            ) : null}
          </div>

          {erroGeral ? (
            <p role="alert" className="m-0 font-body text-base text-danger">
              {erroGeral}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-4">
            <button
              type="button"
              onClick={onFechar}
              disabled={salvando}
              className={BTN_SECUNDARIO}
            >
              CANCELAR
            </button>
            <button type="submit" disabled={salvando} className={BTN_PRIMARIO}>
              {salvando ? "SALVANDO..." : "SALVAR"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
