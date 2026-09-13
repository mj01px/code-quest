import type { Metadata } from "next";
import { SeletorCriatura } from "@/components/criaturas/SeletorCriatura";
import { TelaBase } from "@/components/layout/TelaBase";

export const metadata: Metadata = {
  title: "Escolha sua criatura",
  description:
    "Escolha a criatura que vai evoluir junto com você a cada exercício resolvido.",
};

export default function PaginaEscolherCriatura() {
  return (
    <TelaBase rodape={false}>
      <SeletorCriatura />
    </TelaBase>
  );
}
