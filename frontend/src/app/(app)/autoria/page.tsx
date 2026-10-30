import type { Metadata } from "next";

import { PainelAutoria } from "@/components/autoria/PainelAutoria";

export const metadata: Metadata = {
  title: "Autoria",
  description: "Rascunhos e fila de revisão do conteúdo da CodeQuest.",
};

export default function PaginaAutoria() {
  return <PainelAutoria />;
}
