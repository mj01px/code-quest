import type { Metadata } from "next";

import { PainelSerAutor } from "@/components/autoria/PainelSerAutor";

export const metadata: Metadata = {
  title: "Ser autor",
  description: "Peça acesso de autor para criar conteúdo na CodeQuest.",
};

export default function PaginaSerAutor() {
  return <PainelSerAutor />;
}
