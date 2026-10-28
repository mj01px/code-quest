import type { Metadata } from "next";

import { EditorDeConteudo } from "@/components/autoria/EditorDeConteudo";

export const metadata: Metadata = {
  title: "Novo conteúdo",
  description: "Crie uma trilha com aulas e exercícios na CodeQuest.",
};

export default function PaginaNovoConteudo() {
  return <EditorDeConteudo />;
}
