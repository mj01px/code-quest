"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { useId } from "react";
import { IconeCheck } from "./Icone";

interface Props
  extends Omit<ComponentPropsWithoutRef<"input">, "id" | "type" | "children"> {
  children: ReactNode;
  erro?: string | null;
}

// O input continua sendo um checkbox de verdade, só sem a pintura do sistema
// (`appearance-none`). É o que mantém teclado, leitor de tela e o estado
// :checked funcionando de graça, com o visual da caixa por conta do CSS.
export function PixelCheckbox({
  children,
  erro,
  className = "",
  ...props
}: Props) {
  const id = useId();
  const erroId = `${id}-erro`;
  const borda = erro ? "border-danger" : "border-brand-strong";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-3">
        <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
          <input
            {...props}
            type="checkbox"
            id={id}
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? erroId : undefined}
            className={`peer h-5 w-5 cursor-pointer appearance-none rounded-none border-2 ${borda} bg-field shadow-pixel-sm checked:border-brand checked:bg-brand-void ${className}`.trim()}
          />
          <IconeCheck className="pointer-events-none absolute h-3.5 w-3.5 text-brand-pale opacity-0 peer-checked:opacity-100" />
        </span>

        <label
          htmlFor={id}
          className="cursor-pointer font-body text-base leading-[1.6] tracking-wide text-ink-body"
        >
          {children}
        </label>
      </div>

      {erro ? (
        <p
          id={erroId}
          role="alert"
          className="font-body text-base leading-[1.6] tracking-wide text-danger"
        >
          {erro}
        </p>
      ) : null}
    </div>
  );
}
