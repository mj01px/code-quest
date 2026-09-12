import type { ReactNode } from "react";

import type { Dificuldade } from "@/lib/types";

const TONS = {
  neutro: "border-edge-soft text-ink-muted",
  acento: "border-brand text-brand",
  sucesso: "border-success text-success",
} as const;

export type TomBadge = keyof typeof TONS;

export function Badge({
  children,
  tom = "neutro",
}: {
  children: ReactNode;
  tom?: TomBadge;
}) {
  return (
    <span
      className={`inline-flex items-center border-2 px-2.5 py-1 font-label text-[10px] tracking-[2px] uppercase ${TONS[tom]}`}
    >
      {children}
    </span>
  );
}

const TOM_POR_DIFICULDADE: Record<Dificuldade, TomBadge> = {
  INICIANTE: "sucesso",
  INTERMEDIARIO: "acento",
  AVANCADO: "neutro",
};

export function BadgeDificuldade({
  dificuldade,
  rotulo,
}: {
  dificuldade: Dificuldade;
  rotulo: string;
}) {
  return <Badge tom={TOM_POR_DIFICULDADE[dificuldade]}>{rotulo}</Badge>;
}
