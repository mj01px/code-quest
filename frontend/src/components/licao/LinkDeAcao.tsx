import Link from "next/link";
import type { ComponentProps } from "react";

const PRIMARIO =
  "inline-flex items-center justify-center border-[3px] border-brand-light bg-brand-deep px-6 py-4 font-display text-[11px] leading-[1.7] tracking-[1px] text-ink uppercase shadow-[0_0_0_3px_var(--color-brand-void),4px_4px_0_rgba(0,0,0,0.7)] transition duration-150 hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-brand-strong hover:shadow-[0_0_0_3px_var(--color-brand-void),2px_2px_0_rgba(0,0,0,0.7)]";

const SECUNDARIO =
  "inline-flex items-center justify-center border-2 border-edge-soft bg-transparent px-5 py-3.5 font-label text-[11px] tracking-[2px] text-ink-body uppercase transition-colors duration-150 hover:border-brand hover:text-ink-soft";

export function LinkDeAcao({
  variante = "primario",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variante?: "primario" | "secundario" }) {
  const estilo = variante === "primario" ? PRIMARIO : SECUNDARIO;
  return <Link {...props} className={`${estilo} ${className}`.trim()} />;
}
