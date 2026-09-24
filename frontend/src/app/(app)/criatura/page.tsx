import type { Metadata } from "next";
import { PainelCriatura } from "@/components/criatura/PainelCriatura";

export const metadata: Metadata = {
  title: "Criatura",
  description:
    "Seu companheiro: evolua, gerencie a equipe e adquira novas criaturas.",
};

export default function PaginaCriatura() {
  return <PainelCriatura />;
}
