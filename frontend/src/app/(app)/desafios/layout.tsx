import type { ReactNode } from "react";

import { ExigeLogin } from "@/components/layout/ExigeLogin";

// O desafio do dia conta sequência e XP da conta: só para quem está logado.
export default function DesafiosLayout({ children }: { children: ReactNode }) {
  return <ExigeLogin>{children}</ExigeLogin>;
}
