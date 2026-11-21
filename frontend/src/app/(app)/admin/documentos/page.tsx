import type { Metadata } from "next";

import { GestaoDocumentosLegais } from "@/components/admin/GestaoDocumentosLegais";

export const metadata: Metadata = {
  title: "Documentos legais",
  description: "Versões dos Termos de Uso e da Política de Privacidade.",
};

export default function PaginaDocumentosLegais() {
  return <GestaoDocumentosLegais />;
}
