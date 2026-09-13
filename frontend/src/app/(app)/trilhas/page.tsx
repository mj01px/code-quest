import type { Metadata } from "next";

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
      <>
        <h1 className="titulo text-xl text-ink-soft">Trilhas</h1>
        <p className="mt-6 border border-edge bg-panel p-6 text-xs text-ink-muted">
          Nenhuma trilha publicada por enquanto. Volte em breve.
        </p>
      </>
    );
  }

  // O destaque precisa da trilha inteira para dizer em que fase o aluno parou;
  // a listagem só traz as contagens.
  const destaque = primeira ? await buscarTrilha(primeira.slug) : null;

  return (
    <>
      <h1 className="sr-only">Trilhas</h1>
      <PainelDeTrilhas trilhas={trilhas} destaque={destaque} />
    </>
  );
}
