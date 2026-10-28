import type { Metadata } from "next";

import { EditorDeConteudo } from "@/components/autoria/EditorDeConteudo";

export const metadata: Metadata = {
  title: "Novo conteúdo",
  description: "Crie uma trilha com aulas e exercícios na CodeQuest.",
};

// `?trilha_id=X` retoma uma trilha já criada; sem ele, o editor começa do zero.
export default async function PaginaNovoConteudo({
  searchParams,
}: {
  searchParams: Promise<{ trilha_id?: string }>;
}) {
  const { trilha_id } = await searchParams;
  const id = Number(trilha_id);
  return <EditorDeConteudo trilhaId={Number.isInteger(id) && id > 0 ? id : null} />;
}
