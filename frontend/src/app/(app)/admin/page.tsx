import type { Metadata } from "next";

import { PainelAdmin } from "@/components/admin/PainelAdmin";

export const metadata: Metadata = {
  title: "Admin",
  description: "Painel do administrador da CodeQuest.",
};

export default function PaginaAdmin() {
  return <PainelAdmin />;
}
