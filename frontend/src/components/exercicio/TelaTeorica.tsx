"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { ConteudoDaLicao } from "@/components/licao/ConteudoDaLicao";

import { MINIMO_DA_RESPOSTA, useRespostaEscrita } from "./useRespostaEscrita";

const ETIQUETA = "font-label text-[10px] tracking-[2px] uppercase";

export function TelaTeorica({
  trilhaSlug,
  exercicioSlug,
  cabecalho,
  titulo,
  enunciado,
  xp,
  contexto,
  exemplo,
  licaoHref,
  pet,
}: {
  trilhaSlug: string;
  exercicioSlug: string;
  cabecalho: string;
  titulo: string;
  enunciado: string;
  xp: number;
  contexto: string;
  exemplo: string;
  licaoHref: string;
  pet: ReactNode;
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
    caracteres,
    curto,
    podeEnviar,
    enviar,
  } = useRespostaEscrita(trilhaSlug, exercicioSlug);

  const cabecalhoDaPergunta = (
    <div className="flex flex-col gap-3.5">
      <span className="font-label text-[11px] tracking-[2px] text-brand uppercase">
        {`// Pergunta · ${cabecalho}`}
      </span>
      <h1 className="m-0 font-display text-[18px] leading-[1.6] text-ink [text-shadow:3px_3px_0_var(--color-brand-shadow)] sm:text-[22px]">
        {titulo}
      </h1>
    </div>
  );

  if (respondido) {
    return (
      <div className="flex min-h-0 flex-1 justify-center overflow-y-auto px-5 py-9 sm:px-10">
        <div className="flex w-full max-w-[1120px] flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            {cabecalhoDaPergunta}
            <div
              role="status"
              className="flex items-center gap-3 border-[3px] border-success bg-panel px-4 py-2.5 shadow-pixel"
            >
              <span
                aria-hidden="true"
                className="flex h-[22px] w-[22px] items-center justify-center bg-success"
              >
                <svg
                  viewBox="0 0 16 16"
                  width="12"
                  height="12"
                  fill="none"
                  stroke="var(--color-void)"
                  strokeWidth="3"
                >
                  <path d="M3 8l3 3 7-7" />
                </svg>
              </span>
              <span className={`${ETIQUETA} text-[11px] text-ink`}>
                {jaFeito && xpGanho === null ? "Concluído" : "Resposta enviada"}
              </span>
              {xpGanho !== null ? (
                <span className="font-display text-[11px] text-success">
                  +{xpGanho} XP{diaGanho ? " · +1 dia" : ""}
                </span>
              ) : null}
            </div>
          </div>

          <div className="border-2 border-edge bg-panel px-4 py-3 text-ink-muted">
            <ConteudoDaLicao markdown={enunciado} tamanho="normal" />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <section
              aria-labelledby="sua-resposta"
              className="flex flex-col border-2 border-edge-soft bg-panel shadow-[6px_6px_0_#000]"
            >
              <h2
                id="sua-resposta"
                className={`${ETIQUETA} m-0 border-b-2 border-edge px-5 py-3.5 text-[11px] font-normal text-ink-body`}
              >
                Sua resposta
              </h2>
              <p className="m-0 p-5 font-body text-[17px] leading-[1.7] whitespace-pre-wrap text-ink">
                {texto.trim() || "Você não escreveu nada desta vez."}
              </p>
            </section>
            <section
              aria-labelledby="resposta-referencia"
              className="flex flex-col border-[3px] border-brand bg-panel shadow-[0_0_0_3px_var(--color-brand-void),6px_6px_0_#000]"
            >
              <h2
                id="resposta-referencia"
                className={`${ETIQUETA} m-0 flex items-center gap-2.5 border-b-2 border-brand-void bg-[#15101f] px-5 py-3.5 text-[11px] font-normal text-brand-mist`}
              >
                <span aria-hidden="true" className="h-2.5 w-2.5 bg-brand" />
                Resposta de referência
              </h2>
              <div className="p-5 text-ink">
                {referencia ? (
                  <ConteudoDaLicao markdown={referencia} tamanho="medio" />
                ) : (
                  <p className="m-0 font-body text-base text-ink-muted">
                    Este exercício ainda não tem resposta de referência.
                  </p>
                )}
              </div>
            </section>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-2 border-dashed border-edge-soft px-5 py-4">
            <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-1.5">
              <span className={`${ETIQUETA} text-brand-light`}>
                Compare com calma
              </span>
              <p className="m-0 font-body text-[15px] leading-[1.55] text-ink-body">
                A sua explicação chegou no mesmo ponto? Se ficou faltando alguma
                coisa, vale reler a lição antes de seguir.
              </p>
            </div>
            <Link
              href={licaoHref}
              className={`${ETIQUETA} border-2 border-edge-soft px-4 py-3 text-[11px] text-brand-light hover:border-brand hover:text-brand-mist`}
            >
              Reler a lição
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 justify-center overflow-y-auto px-5 py-10 sm:px-10">
      <div className="grid w-full max-w-[1120px] grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-label="Pergunta" className="flex flex-col gap-6">
          <div className="flex flex-col gap-3.5">
            {cabecalhoDaPergunta}
            <div className="flex flex-wrap gap-2">
              <span
                className={`${ETIQUETA} border-2 border-brand-shadow bg-brand-void px-2.5 py-1 text-brand-mist`}
              >
                Resposta escrita
              </span>
              <span
                className={`${ETIQUETA} border-2 border-edge-soft px-2.5 py-1 text-brand-light`}
              >
                +{xp} XP
              </span>
            </div>
          </div>

          <div className="border-[3px] border-brand bg-panel px-6 py-5 text-ink shadow-[0_0_0_3px_var(--color-brand-void),6px_6px_0_#000]">
            <ConteudoDaLicao markdown={enunciado} tamanho="medio" />
          </div>

          <div className="flex flex-col gap-2.5">
            <label
              htmlFor="resposta-escrita"
              className="font-label text-[12px] tracking-[2px] text-ink-label"
            >
              SUA RESPOSTA
            </label>
            <textarea
              id="resposta-escrita"
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              placeholder={
                jaFeito
                  ? "Você já concluiu. Pode escrever de novo ou só rever a resposta de referência."
                  : "Escreva aqui a sua resposta, com as suas palavras."
              }
              rows={7}
              className="w-full resize-y border-2 border-brand-strong bg-field px-[18px] py-4 font-body text-[17px] leading-[1.7] text-ink shadow-pixel placeholder:text-ink-ghost focus:border-brand-pale focus:outline-none"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span
                className={`${ETIQUETA} ${curto && !jaFeito ? "text-ink-muted" : "text-success"}`}
              >
                {caracteres} {caracteres === 1 ? "caractere" : "caracteres"} ·
                mínimo {MINIMO_DA_RESPOSTA}
              </span>
              <span className="font-terminal text-[19px] text-ink-muted">
                &gt; sem nota automática: você compara depois
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-4">
            {aviso ? (
              <p
                role="alert"
                className={`${ETIQUETA} m-0 text-[11px] text-danger`}
              >
                {aviso}
              </p>
            ) : null}
            <button
              type="button"
              aria-disabled={!podeEnviar}
              aria-busy={enviando}
              onClick={() => {
                void enviar();
              }}
              className={`border-[3px] px-6 py-4 font-display text-[11px] leading-[1.7] tracking-[1px] uppercase ${
                podeEnviar
                  ? "cursor-pointer border-brand-light bg-brand-strong text-ink shadow-[0_0_0_3px_var(--color-brand-void),6px_6px_0_#000] hover:bg-brand-deep"
                  : "cursor-default border-edge-soft bg-panel text-ink-dim"
              }`}
            >
              {enviando
                ? "Enviando…"
                : jaFeito
                  ? "Ver resposta de referência"
                  : "Enviar resposta"}
            </button>
          </div>
        </section>

        <aside aria-label="Ajuda" className="flex flex-col gap-6">
          {contexto || exemplo ? (
            <div className="flex flex-col gap-3 border-2 border-edge bg-panel px-5 py-[18px]">
              <span className={`${ETIQUETA} text-ink-muted`}>
                Relembrar da lição
              </span>
              {contexto ? (
                <div className="text-ink-body">
                  <ConteudoDaLicao markdown={contexto} tamanho="normal" />
                </div>
              ) : null}
              {exemplo ? (
                <pre className="m-0 overflow-x-auto border border-edge bg-void px-3.5 py-3 font-terminal text-[18px] leading-[1.35] text-ink-body">
                  <code>{exemplo}</code>
                </pre>
              ) : null}
            </div>
          ) : null}
          <div className="flex justify-start">{pet}</div>
        </aside>
      </div>
    </div>
  );
}
