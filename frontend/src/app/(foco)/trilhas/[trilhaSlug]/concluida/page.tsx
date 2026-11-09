import type { Metadata } from "next";

import { TelaQuestCompleta } from "@/components/trilhas/TelaQuestCompleta";
import { carregarTrilha } from "@/lib/aulas";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: PageProps<"/trilhas/[trilhaSlug]/concluida">): Promise<Metadata> {
  const { trilhaSlug } = await params;
  const trilha = await carregarTrilha(trilhaSlug);
  return { title: `Quest completa · ${trilha.nome}` };
}

export default async function QuestCompletaPage({
  params,
}: PageProps<"/trilhas/[trilhaSlug]/concluida">) {
  const { trilhaSlug } = await params;
  const trilha = await carregarTrilha(trilhaSlug);
  return <TelaQuestCompleta trilhaSlug={trilha.slug} />;
}
