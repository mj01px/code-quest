"use client";

import { MINIMO_DA_RESPOSTA, useRespostaEscrita } from "./useRespostaEscrita";

export function PainelDeResposta({
  trilhaSlug,
  exercicioSlug,
  placeholder = "Escreva aqui a sua resposta, com as suas palavras.",
  nota,
}: {
  trilhaSlug: string;
  exercicioSlug: string;
  placeholder?: string;
  nota?: string;
}) {
  const {
    texto,
    setTexto,
    enviando,
    referencia,
    xpGanho,
    diaGanho,
    aviso,
    jaFeito,
    respondido,
    curto,
    podeEnviar,
    enviar,
  } = useRespostaEscrita(trilhaSlug, exercicioSlug);

  return (
    <div className="flex flex-col gap-4">
      {nota ? (
        <p className="m-0 font-body text-base leading-[1.6] text-ink-muted">{nota}</p>
      ) : null}

      {respondido ? null : (
        <>
          <label className="flex flex-col gap-2">
            <span className="font-label text-[10px] tracking-[2px] text-brand-light uppercase">
              Sua resposta
            </span>
            <textarea
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              placeholder={jaFeito ? "Você já concluiu. Pode rever a resposta de referência." : placeholder}
              rows={7}
              className="w-full resize-y border-2 border-edge bg-field p-4 font-body text-lg leading-[1.6] text-ink-soft placeholder:text-ink-dim focus:border-brand focus:outline-none"
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-label text-[10px] tracking-[2px] text-ink-dim uppercase">
              {jaFeito || !curto ? "" : `Escreva pelo menos ${MINIMO_DA_RESPOSTA} caracteres`}
            </span>
            <button
              type="button"
              aria-disabled={!podeEnviar}
              aria-busy={enviando}
              onClick={() => {
                void enviar();
              }}
              className={`border-[3px] px-6 py-3 font-display text-[11px] leading-[1.7] tracking-[1px] uppercase ${
                podeEnviar
                  ? "cursor-pointer border-brand-light bg-brand-deep text-ink shadow-[0_0_0_3px_var(--color-brand-void),4px_4px_0_rgba(0,0,0,0.7)] hover:bg-brand-strong"
                  : "cursor-default border-edge-soft bg-panel text-ink-dim"
              }`}
            >
              {enviando ? "Enviando…" : jaFeito ? "Ver resposta de referência" : "Enviar resposta"}
            </button>
          </div>
        </>
      )}

      {respondido ? (
        <section
          aria-label="Resposta de referência"
          className="flex flex-col gap-3 border-2 border-success bg-panel-soft p-5"
        >
          <span className="font-label text-[10px] tracking-[2px] text-success uppercase">
            Resposta de referência
          </span>
          {texto.trim() ? (
            <p className="m-0 font-body text-base leading-[1.6] whitespace-pre-wrap text-ink-muted">
              Você escreveu: {texto.trim()}
            </p>
          ) : null}
          <pre className="m-0 font-body text-lg leading-[1.6] whitespace-pre-wrap text-ink-soft">
            {referencia || "Este exercício ainda não tem resposta de referência."}
          </pre>
        </section>
      ) : null}

      <p
        role="status"
        aria-live="polite"
        className={`m-0 font-label text-[11px] tracking-[2px] uppercase empty:hidden ${
          aviso ? "text-danger" : "text-success"
        }`}
      >
        {aviso ?? (xpGanho !== null ? `+${xpGanho} XP${diaGanho ? " · +1 dia" : ""}` : "")}
      </p>
    </div>
  );
}
