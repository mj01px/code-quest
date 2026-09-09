import type { Metadata } from "next";
import { SeletorAtiva } from "@/components/criaturas/SeletorAtiva";
import { AppFooter } from "@/components/layout/AppFooter";
import { AppHeader } from "@/components/layout/AppHeader";

export const metadata: Metadata = {
  title: "Minhas criaturas | CodeQuest",
  description: "Escolha qual criatura acompanha você e recebe o XP.",
};

export default function PaginaCriaturas() {
  return (
    <div className="relative flex min-h-screen flex-col bg-void text-ink-soft">
      <AppHeader />

      <main className="mx-auto w-full max-w-3xl min-w-0 flex-1 px-5 py-10 sm:px-8">
        <header className="flex flex-col gap-4 border-b-2 border-edge pb-7">
          <p className="m-0 font-label text-[10px] tracking-[2px] text-ink-dim">
            EQUIPE
          </p>
          <h1 className="m-0 font-display text-[17px] leading-[1.7] tracking-[1px] text-ink [overflow-wrap:anywhere] [text-shadow:2px_2px_0_var(--color-brand-dark)] sm:text-[20px]">
            MINHAS<span className="text-brand">.</span>CRIATURAS
          </h1>
        </header>

        <div className="pt-8">
          <SeletorAtiva />
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
