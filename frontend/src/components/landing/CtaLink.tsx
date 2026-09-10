import Link from "next/link";
import type { ComponentProps } from "react";

type Variante = "primaria" | "secundaria";
type Tamanho = "md" | "lg";

const BASE =
  "inline-flex items-center justify-center rounded-none font-display leading-[1.7] " +
  "tracking-wide transition-none";

const VARIANTES: Record<Variante, string> = {
  primaria:
    "border-[3px] border-brand-light bg-brand-deep text-ink " +
    "shadow-[0_0_0_3px_var(--color-brand-void),6px_6px_0_rgba(0,0,0,0.7)] " +
    "hover:bg-brand-strong hover:translate-x-0.5 hover:translate-y-0.5 " +
    "hover:shadow-[0_0_0_3px_var(--color-brand-void),2px_2px_0_rgba(0,0,0,0.7)]",
  secundaria:
    "border-2 border-brand bg-transparent text-brand-light shadow-pixel " +
    "hover:text-[#f5f2ff] hover:border-brand-pale hover:translate-x-0.5 " +
    "hover:translate-y-0.5 hover:shadow-pixel-sm",
};

const TAMANHOS: Record<Tamanho, string> = {
  md: "px-4 py-3 text-[10px]",
  lg: "px-6 py-4 text-xs",
};

interface Props extends ComponentProps<typeof Link> {
  variante?: Variante;
  tamanho?: Tamanho;
}

export function CtaLink({
  variante = "primaria",
  tamanho = "lg",
  className = "",
  ...props
}: Props) {
  return (
    <Link
      {...props}
      className={`${BASE} ${VARIANTES[variante]} ${TAMANHOS[tamanho]} ${className}`.trim()}
    />
  );
}
