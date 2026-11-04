import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SessaoFlashcards, type CardDaSessao } from "@/components/licao/SessaoFlashcards";
import { carregarTrilha } from "@/lib/aulas";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: PageProps<"/trilhas/[trilhaSlug]/flashcards">): Promise<Metadata> {
  const { trilhaSlug } = await params;
  const trilha = await carregarTrilha(trilhaSlug);
  return { title: `Flashcards · ${trilha.nome}` };
}

export default async function FlashcardsPage({
  params,
}: PageProps<"/trilhas/[trilhaSlug]/flashcards">) {
  const { trilhaSlug } = await params;
  const trilha = await carregarTrilha(trilhaSlug);
  const cards: CardDaSessao[] = trilha.aulas.flatMap((aula) =>
    (aula.flashcards ?? []).map((card) => ({ ...card, baralho: aula.titulo })),
  );
  if (cards.length === 0) notFound();

  return (
    <SessaoFlashcards
      cards={cards}
      rotaDaTrilha={`/trilhas/${trilha.slug}`}
    />
  );
}
