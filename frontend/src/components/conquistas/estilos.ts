import type { Conquista } from "@/lib/types";

export type Estado = "desbloqueada" | "bloqueada" | "oculta";

export function estadoDa(conquista: Conquista): Estado {
  if (conquista.desbloqueada) return "desbloqueada";
  return conquista.oculta ? "oculta" : "bloqueada";
}

export const BLOCO: Record<Estado, string> = {
  desbloqueada:
    "border-4 border-brand-light bg-brand-deep text-ink shadow-[0_6px_0_var(--color-brand-void),0_0_28px_rgba(168,85,247,0.6)]",
  bloqueada:
    "border-4 border-edge-soft bg-panel-soft text-edge-soft shadow-[0_6px_0_#000]",
  oculta:
    "border-4 border-dashed border-brand-strong bg-panel-deep text-brand shadow-[0_6px_0_#000]",
};

export const NOME: Record<Estado, string> = {
  desbloqueada: "text-ink",
  bloqueada: "text-ink-ghost",
  oculta: "text-ink-ghost",
};
