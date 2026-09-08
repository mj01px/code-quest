import Link from "next/link";

import { AlternarSidebar } from "@/components/layout/AlternarSidebar";

// Aparece só com a sidebar recolhida, para a navegação nunca ficar sem porta.
export function BarraDeMenu() {
  return (
    <header className="barra-de-menu sticky top-0 z-10 items-center gap-4 border-b border-edge bg-panel px-5 py-3 sm:px-8">
      <AlternarSidebar
        modo="expandir"
        className="flex h-8 w-8 shrink-0 items-center justify-center border-edge-soft bg-panel-soft text-ink-muted hover:border-brand hover:text-brand"
      />
      <Link
        href="/trilhas"
        className="marca text-lg tracking-[0.08em] text-ink-soft"
      >
        CODEQUEST
      </Link>
    </header>
  );
}
