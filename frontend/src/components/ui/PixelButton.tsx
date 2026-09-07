import type { ComponentPropsWithoutRef } from "react";

type Variante = "primaria" | "secundaria";

const BASE =
  "inline-flex items-center justify-center rounded-none font-display tracking-wide " +
  "cursor-pointer transition-none disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTES: Record<Variante, string> = {
  primaria:
    "w-full px-4 py-4 border-[3px] border-brand-light bg-brand-deep text-ink " +
    "text-xs leading-[1.7] shadow-[0_0_0_3px_var(--color-brand-void),6px_6px_0_rgba(0,0,0,0.7)] " +
    "hover:bg-brand-strong hover:translate-x-0.5 hover:translate-y-0.5 " +
    "hover:shadow-[0_0_0_3px_var(--color-brand-void),2px_2px_0_rgba(0,0,0,0.7)] " +
    "active:translate-x-1 active:translate-y-1 " +
    "active:shadow-[0_0_0_3px_var(--color-brand-void),0_0_0_rgba(0,0,0,0.7)] " +
    "disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:bg-brand-deep",
  secundaria:
    "px-5 py-2.5 border-2 border-brand bg-transparent text-brand-light " +
    "text-[10px] leading-[1.7] shadow-pixel " +
    "hover:text-[#f5f2ff] hover:border-brand-pale hover:translate-x-0.5 " +
    "hover:translate-y-0.5 hover:shadow-pixel-sm",
};

interface Props extends ComponentPropsWithoutRef<"button"> {
  variante?: Variante;
}

export function PixelButton({
  variante = "primaria",
  className = "",
  ...props
}: Props) {
  return (
    <button
      {...props}
      className={`${BASE} ${VARIANTES[variante]} ${className}`.trim()}
    />
  );
}
