import type { Metadata } from "next";

import { PainelDeConquistas } from "@/components/conquistas/PainelDeConquistas";

export const metadata: Metadata = {
  title: "Conquistas",
  description: "Os troféus que você já desbloqueou e os que ainda faltam.",
};

export default function ConquistasPage() {
  return <PainelDeConquistas />;
}
