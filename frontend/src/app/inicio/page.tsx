import type { Metadata } from "next";
import { PainelInicio } from "@/components/inicio/PainelInicio";
import { TelaBase } from "@/components/layout/TelaBase";

export const metadata: Metadata = {
  title: "Início | CodeQuest",
  description: "Seu perfil e sua criatura.",
};

export default function PaginaInicio() {
  return (
    <TelaBase>
      <PainelInicio />
    </TelaBase>
  );
}
