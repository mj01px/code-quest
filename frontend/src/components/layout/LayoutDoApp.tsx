import type { ReactNode } from "react";

import { BarraLateral } from "@/components/layout/BarraLateral";

// Moldura das telas de dentro do app: sidebar, área de conteúdo e rodapé.
// Vive num componente, e não no layout de /trilhas, porque mais de uma rota
// usa a mesma moldura e duplicá-la faria as duas divergirem.

const ANO = new Date().getFullYear();

export function LayoutDoApp({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <BarraLateral />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-5xl min-w-0 flex-1 px-5 py-8 sm:px-8 sm:py-10">
          {children}
        </main>
        <footer className="mx-auto w-full max-w-5xl px-5 pb-8 sm:px-8 sm:pb-10">
          <span className="font-label text-[11px] tracking-[2px] text-ink-muted uppercase">
            © {ANO} CodeQuest OS
          </span>
        </footer>
      </div>
    </div>
  );
}
