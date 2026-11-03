import type { Metadata } from "next";

import { PortaDeAcesso } from "@/components/layout/PortaDeAcesso";
import { PainelDeTrilhas } from "@/components/trilhas/PainelDeTrilhas";
import { buscarTrilha, listarTrilhas } from "@/lib/api";

export const metadata: Metadata = {
  title: "Trilhas",
  description: "As trilhas de aprendizado disponíveis no CodeQuest.",
};

export default async function TrilhasPage() {
  const trilhas = await listarTrilhas();
  const [primeira] = trilhas;

  if (trilhas.length === 0) {
    return (
      <PortaDeAcesso perm="trilhas.view">
        <div className="mb-8 flex flex-col gap-3">
          <span className="font-label text-[11px] tracking-[2px] text-brand">{"// TRILHAS"}</span>
          <h1 className="m-0 font-display text-[15px] leading-[1.7] tracking-[1px] text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)] sm:text-[20px]">Trilhas</h1>
        </div>
        <p className="mt-6 border border-edge bg-panel p-6 text-xs text-ink-muted">
          Nenhuma trilha publicada por enquanto. Volte em breve.
        </p>
      </PortaDeAcesso>
    );
  }

  // O destaque precisa da trilha inteira para dizer em que fase o aluno parou;
  // a listagem só traz as contagens.
  const destaque = primeira ? await buscarTrilha(primeira.slug) : null;

  return (
    <PortaDeAcesso perm="trilhas.view">
      <div className="mb-8 flex flex-col gap-3">
        <span className="font-label text-[11px] tracking-[2px] text-brand">{"// TRILHAS"}</span>
        <h1 className="m-0 font-display text-[15px] leading-[1.7] tracking-[1px] text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)] sm:text-[20px]">Trilhas</h1>
      </div>
      <PainelDeTrilhas trilhas={trilhas} destaque={destaque} />
    </PortaDeAcesso>
  );
}
