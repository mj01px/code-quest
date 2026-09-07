import Link from "next/link";
import type { ComponentProps } from "react";

const ESTILO =
  "inline-flex items-center justify-center rounded-none px-5 py-2.5 border-2 " +
  "border-brand bg-transparent text-brand-light font-display text-[10px] " +
  "leading-[1.7] tracking-wide shadow-pixel hover:text-[#f5f2ff] " +
  "hover:border-brand-pale hover:translate-x-0.5 hover:translate-y-0.5 " +
  "hover:shadow-pixel-sm";

export function PixelLink({
  className = "",
  ...props
}: ComponentProps<typeof Link>) {
  return <Link {...props} className={`${ESTILO} ${className}`.trim()} />;
}
