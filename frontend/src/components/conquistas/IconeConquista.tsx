import type { ReactNode } from "react";

const DESENHOS: Record<string, ReactNode> = {
  ovo: (
    <>
      <rect x="6" y="2" width="4" height="1" />
      <rect x="5" y="3" width="6" height="2" />
      <rect x="4" y="5" width="8" height="7" />
      <rect x="5" y="12" width="6" height="2" />
      <rect x="6" y="7" width="1" height="1" fill="var(--color-void)" />
      <rect x="7" y="8" width="1" height="1" fill="var(--color-void)" />
      <rect x="8" y="7" width="1" height="1" fill="var(--color-void)" />
      <rect x="9" y="8" width="1" height="1" fill="var(--color-void)" />
    </>
  ),
  terminal: (
    <>
      <path d="M2 2h12v12H2z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 6l2 2-2 2M9 10h3" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  mapa: (
    <>
      <rect x="1" y="3" width="4" height="10" />
      <rect x="6" y="2" width="4" height="10" />
      <rect x="11" y="3" width="4" height="10" />
      <rect x="7" y="5" width="2" height="2" fill="var(--color-void)" />
    </>
  ),
  play: (
    <>
      <rect x="4" y="2" width="2" height="12" />
      <rect x="6" y="3" width="2" height="10" />
      <rect x="8" y="5" width="2" height="6" />
      <rect x="10" y="7" width="2" height="2" />
    </>
  ),
  alvo: (
    <>
      <path d="M2 2h12v12H2z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 5h6v6H5z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="7" y="7" width="2" height="2" />
    </>
  ),
  inseto: (
    <>
      <rect x="6" y="2" width="4" height="2" />
      <rect x="5" y="5" width="6" height="8" />
      <rect x="2" y="6" width="3" height="1" />
      <rect x="11" y="6" width="3" height="1" />
      <rect x="2" y="9" width="3" height="1" />
      <rect x="11" y="9" width="3" height="1" />
      <rect x="2" y="12" width="3" height="1" />
      <rect x="11" y="12" width="3" height="1" />
      <rect x="7" y="6" width="2" height="6" fill="var(--color-void)" />
    </>
  ),
  chama: (
    <>
      <rect x="7" y="1" width="2" height="3" />
      <rect x="6" y="3" width="4" height="2" />
      <rect x="5" y="5" width="6" height="2" />
      <rect x="4" y="7" width="8" height="5" />
      <rect x="3" y="9" width="10" height="4" />
      <rect x="6" y="10" width="4" height="3" fill="var(--color-void)" />
    </>
  ),
  engrenagem: (
    <>
      <rect x="7" y="1" width="2" height="3" />
      <rect x="7" y="12" width="2" height="3" />
      <rect x="1" y="7" width="3" height="2" />
      <rect x="12" y="7" width="3" height="2" />
      <rect x="4" y="4" width="8" height="8" />
      <rect x="6" y="6" width="4" height="4" fill="var(--color-void)" />
    </>
  ),
  seta: (
    <>
      <rect x="7" y="2" width="2" height="2" />
      <rect x="5" y="4" width="6" height="2" />
      <rect x="3" y="6" width="10" height="2" />
      <rect x="6" y="8" width="4" height="6" />
    </>
  ),
  escudo: (
    <>
      <rect x="2" y="2" width="12" height="6" />
      <rect x="3" y="8" width="10" height="3" />
      <rect x="5" y="11" width="6" height="2" />
      <rect x="7" y="13" width="2" height="1" />
      <rect x="7" y="4" width="2" height="6" fill="var(--color-void)" />
      <rect x="5" y="6" width="6" height="2" fill="var(--color-void)" />
    </>
  ),
  oculta: (
    <>
      <rect x="5" y="2" width="6" height="2" />
      <rect x="3" y="4" width="2" height="3" />
      <rect x="11" y="4" width="2" height="3" />
      <rect x="9" y="7" width="2" height="2" />
      <rect x="7" y="9" width="2" height="2" />
      <rect x="7" y="12" width="2" height="2" />
    </>
  ),
  trofeu: (
    <>
      <rect x="4" y="2" width="8" height="6" />
      <rect x="2" y="3" width="2" height="3" />
      <rect x="12" y="3" width="2" height="3" />
      <rect x="6" y="8" width="4" height="2" />
      <rect x="7" y="10" width="2" height="2" />
      <rect x="4" y="12" width="8" height="2" />
    </>
  ),
};

export function IconeConquista({
  icone,
  className = "",
}: {
  icone: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      fill="currentColor"
      shapeRendering="crispEdges"
      className={`shrink-0 ${className}`}
    >
      {DESENHOS[icone] ?? DESENHOS.trofeu}
    </svg>
  );
}
