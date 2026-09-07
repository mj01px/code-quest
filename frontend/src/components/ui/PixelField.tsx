"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { useId, useState } from "react";
import { IconeOlho, IconeOlhoFechado } from "./icones";

interface Props extends Omit<ComponentPropsWithoutRef<"input">, "id"> {
  rotulo: string;
  icone?: ReactNode;
  erro?: string | null;
  dica?: string;
  acao?: ReactNode;
  revelavel?: boolean;
}

export function PixelField({
  rotulo,
  icone,
  erro,
  dica,
  acao,
  revelavel = false,
  className = "",
  type,
  ...props
}: Props) {
  const id = useId();
  const dicaId = `${id}-dica`;
  const erroId = `${id}-erro`;
  const [revelado, setRevelado] = useState(false);

  const tipo = revelavel && revelado ? "text" : type;
  const borda = erro ? "border-danger" : "border-brand-strong";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <label
          htmlFor={id}
          className="font-label text-[12px] tracking-[2px] text-ink-label"
        >
          {rotulo}
        </label>
        {acao}
      </div>

      <div
        className={`flex items-center gap-2 border-2 ${borda} bg-field px-3 shadow-pixel focus-within:border-brand-pale focus-within:shadow-[0_0_0_2px_var(--color-brand-shadow),4px_4px_0_rgba(0,0,0,0.6)]`}
      >
        {icone ? (
          <span className="shrink-0 text-brand" aria-hidden="true">
            {icone}
          </span>
        ) : null}
        <input
          {...props}
          type={tipo}
          id={id}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? erroId : dica ? dicaId : undefined}
          className={`min-w-0 flex-1 rounded-none border-0 bg-transparent py-[11px] font-label text-[13px] tracking-wide text-ink outline-none ${className}`.trim()}
        />
        {revelavel ? (
          <button
            type="button"
            onClick={() => setRevelado((atual) => !atual)}
            aria-label={revelado ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={revelado}
            className="shrink-0 cursor-pointer text-brand hover:text-brand-pale"
          >
            {revelado ? <IconeOlhoFechado /> : <IconeOlho />}
          </button>
        ) : null}
      </div>

      {erro ? (
        <p
          id={erroId}
          role="alert"
          className="font-body text-base leading-[1.6] tracking-wide text-danger"
        >
          {erro}
        </p>
      ) : dica ? (
        <p
          id={dicaId}
          className="font-body text-base leading-[1.6] tracking-wide text-ink-muted"
        >
          {dica}
        </p>
      ) : null}
    </div>
  );
}
