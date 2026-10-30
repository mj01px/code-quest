"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { BarraLateral } from "@/components/layout/BarraLateral";
import { useProgresso } from "@/components/progresso/ProvedorProgresso";

const ANO = new Date().getFullYear();

export function LayoutDoApp({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { usuario, carregando } = useProgresso();

  useEffect(() => {
    if (!carregando && !usuario) router.replace("/entrar");
  }, [carregando, usuario, router]);

  if (carregando || !usuario) return null;

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
