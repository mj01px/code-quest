"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { useId } from "react";

interface Props extends Omit<ComponentPropsWithoutRef<"input">, "id"> {
  rotulo: string;
  icone?: ReactNode;
  erro?: string | null;
  dica?: string;
  acao?: ReactNode;
}

export function PixelField({
  rotulo,
  icone,
  erro,
  dica,
  acao,
  className = "",
  ...props
}: Props) {
  const id = useId();
  const dicaId = `${id}-dica`;
  const erroId = `${id}-erro`;

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
          id={id}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? erroId : dica ? dicaId : undefined}
          className={`min-w-0 flex-1 rounded-none border-0 bg-transparent py-[11px] font-label text-[13px] tracking-wide text-ink outline-none ${className}`.trim()}
        />
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
