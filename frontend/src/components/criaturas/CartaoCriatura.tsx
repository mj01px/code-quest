"use client";

import Image from "next/image";
import type { Criatura } from "@/lib/types";

const ATRIBUTO_MAXIMO = 5;

interface Props {
  criatura: Criatura;
  slot: number;
  selecionada: boolean;
  aoSelecionar: (slug: string) => void;
}

export function CartaoCriatura({
  criatura,
  slot,
  selecionada,
  aoSelecionar,
}: Props) {
  const indisponivel = !criatura.disponivel;
  const sprite = criatura.estagios[0]?.sprite;

  const bordaCartao = selecionada
    ? "border-brand bg-[#15101f] shadow-selected"
    : "border-edge-soft bg-panel shadow-pixel-lg";

  const interacao = indisponivel
    ? "cursor-not-allowed opacity-45"
    : "cursor-pointer hover:border-brand-pale hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[0_0_0_3px_var(--color-brand-void),2px_2px_0_rgba(0,0,0,0.7)]";

  const marca = indisponivel
    ? "EM BREVE"
    : selecionada
      ? "SELECIONADO"
      : "VAZIO";
  const estiloMarca = selecionada
    ? "border-brand bg-brand text-void"
    : "border-edge-soft text-ink-dim";

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selecionada}
      disabled={indisponivel}
      onClick={() => aoSelecionar(criatura.slug)}
      className={`flex flex-col rounded-none border-[3px] p-0 text-left ${bordaCartao} ${interacao}`}
    >
      <div className="flex w-full items-center justify-between gap-2 border-b-2 border-edge bg-panel-soft px-4 py-2">
        <span className="font-label text-[11px] tracking-[2px] text-ink-muted">
          SLOT_{String(slot).padStart(2, "0")}
        </span>
        <span
          className={`border-2 px-2 py-1 font-label text-[11px] tracking-[2px] ${estiloMarca}`}
        >
          {marca}
        </span>
      </div>

      <div
        className={`flex w-full items-center justify-center border-b-2 border-edge bg-panel-deep px-6 py-8 ${
          selecionada
            ? "shadow-[inset_0_0_0_4px_rgba(168,85,247,0.16),inset_0_0_0_8px_rgba(168,85,247,0.07)]"
            : ""
        }`}
      >
        {indisponivel ? (
          <div
            aria-hidden="true"
            className="flex h-40 w-40 items-center justify-center border-2 border-dashed border-edge-soft font-label text-xs tracking-[2px] text-ink-dim"
          >
            ???
          </div>
        ) : (
          <Image
            src={sprite}
            alt={`${criatura.nome}, ${criatura.especie.toLowerCase()} filhote`}
            width={160}
            height={160}
            className={`block h-40 w-40 ${
              selecionada ? "animate-bob" : "opacity-80"
            }`}
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 px-6 py-6">
        <h2 className="m-0 font-display text-[15px] leading-[1.7] tracking-wide text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)]">
          {criatura.nome}
        </h2>

        <p className="m-0 font-label text-[11px] tracking-[2px] text-brand-light">
          TIPO: {criatura.tipo.toUpperCase()}
        </p>

        <p className="m-0 font-body text-[19px] leading-[1.6] tracking-wide text-ink-body text-pretty">
          {criatura.descricao}
        </p>

        <div className="mt-auto flex items-center gap-3 pt-2">
          <span className="font-label text-[10px] tracking-[2px] text-ink-muted">
            {criatura.atributo_nome.toUpperCase()}
          </span>
          <span className="flex gap-1" aria-hidden="true">
            {Array.from({ length: ATRIBUTO_MAXIMO }, (_, indice) => (
              <span
                key={indice}
                className={`h-4 w-4 border-2 ${
                  indice < criatura.atributo_valor
                    ? "border-brand bg-brand-strong"
                    : "border-edge-soft bg-transparent"
                }`}
              />
            ))}
          </span>
          <span className="sr-only">
            {criatura.atributo_valor} de {ATRIBUTO_MAXIMO}
          </span>
        </div>
      </div>
    </button>
  );
}
