import type { Cargo } from "@/lib/types";

export const BTN_PRIMARIO =
  "inline-flex items-center justify-center gap-2 border-[3px] border-brand-light bg-brand-deep px-5 py-4 font-display text-[11px] leading-[1.7] tracking-[1px] text-ink shadow-[0_0_0_3px_var(--color-brand-void),6px_6px_0_rgba(0,0,0,0.7)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

export const BTN_SECUNDARIO =
  "inline-flex items-center justify-center gap-2 border-2 border-brand bg-transparent px-5 py-2.5 font-display text-[10px] leading-[1.7] tracking-[1px] text-brand-light shadow-pixel transition-colors hover:border-brand-light disabled:cursor-not-allowed disabled:opacity-50";

export const BTN_PERIGO =
  "inline-flex items-center justify-center gap-2 border-2 border-danger bg-transparent px-5 py-2.5 font-display text-[10px] leading-[1.7] tracking-[1px] text-danger shadow-pixel transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

const BADGE_BASE =
  "inline-flex items-center px-2.5 py-1 font-label text-[10px] tracking-[2px] uppercase whitespace-nowrap";

const CARGO_TOM: Record<Cargo, string> = {
  LIDER: "border-2 border-brand bg-brand text-void",
  COLIDER: "border-2 border-brand text-brand-light",
  MEMBRO: "border-2 border-edge-soft text-ink-muted",
};

export function classeBadgeCargo(cargo: Cargo): string {
  return `${BADGE_BASE} ${CARGO_TOM[cargo]}`;
}
