import type { Metadata } from "next";

import { PainelCriatura } from "@/components/criatura/PainelCriatura";
import { PortaDeAcesso } from "@/components/layout/PortaDeAcesso";

export const metadata: Metadata = {
  title: "Criatura",
  description:
    "Seu companheiro: evolua, gerencie a equipe e adquira novas criaturas.",
};

export default function PaginaCriatura() {
  return (
    <PortaDeAcesso perm="criaturas.view">
      <PainelCriatura />
    </PortaDeAcesso>
  );
}
