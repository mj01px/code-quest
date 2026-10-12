import type { Metadata } from "next";

import { FormularioCriarCla } from "@/components/clas/FormularioCriarCla";

export const metadata: Metadata = {
  title: "Fundar clã",
  description: "Crie um clã, escolha a bandeira e chame a turma pra estudar.",
};

export default function CriarClaPage() {
  return <FormularioCriarCla />;
}
