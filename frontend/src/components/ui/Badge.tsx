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
      className={`rotulo inline-flex items-center border px-2 py-1 ${TONS[tom]}`}
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
