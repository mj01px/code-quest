import type { Metadata } from "next";

import { PainelDeClas } from "@/components/clas/PainelDeClas";

export const metadata: Metadata = {
  title: "Clãs",
  description:
    "Encontre um clã público pra estudar junto, ou funde o seu e chame a turma.",
};

export default function ClasPage() {
  return <PainelDeClas />;
}
