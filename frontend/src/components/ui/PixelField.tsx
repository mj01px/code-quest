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
  const capsId = `${id}-caps`;
  const [revelado, setRevelado] = useState(false);
  const [capsLigado, setCapsLigado] = useState(false);

  const tipo = revelavel && revelado ? "text" : type;
  const borda = erro ? "border-danger" : "border-brand-strong";

  // A Silkscreen desenha a caixa baixa como a maiuscula 1px menor, entao
  // senha revelada sai ilegivel. A VT323 tem ascendente e descendente de
  // verdade e mantem o mesmo ar de terminal.
  const fonte = !revelavel
    ? "font-label text-[13px] tracking-wide"
    : revelado
      ? "font-body text-[18px] tracking-[2px]"
      : "font-label text-[13px] tracking-[4px]";

  function olharCapsLock(evento: React.KeyboardEvent<HTMLInputElement>) {
    if (revelavel) setCapsLigado(evento.getModifierState("CapsLock"));
  }

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
          onKeyDown={(evento) => {
            olharCapsLock(evento);
            props.onKeyDown?.(evento);
          }}
          onKeyUp={(evento) => {
            olharCapsLock(evento);
            props.onKeyUp?.(evento);
          }}
          onBlur={(evento) => {
            setCapsLigado(false);
            props.onBlur?.(evento);
          }}
          aria-invalid={erro ? true : undefined}
          aria-describedby={
            [capsLigado ? capsId : null, erro ? erroId : dica ? dicaId : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
          className={`min-w-0 flex-1 rounded-none border-0 bg-transparent py-[11px] ${fonte} text-ink outline-none ${className}`.trim()}
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

      {capsLigado ? (
        <p
          id={capsId}
          className="font-body text-base leading-[1.6] tracking-wide text-brand-pale"
        >
          Caps Lock ligado.
        </p>
      ) : null}

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
