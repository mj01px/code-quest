import type { Metadata } from "next";
import { PainelCadastro } from "@/components/auth/PainelCadastro";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { TelaBase } from "@/components/layout/TelaBase";

export const metadata: Metadata = {
  title: "Criar conta | CodeQuest",
  description: "Crie sua conta, escolha sua criatura e comece a programar.",
};

export default function PaginaCadastro() {
  return (
    <TelaBase>
      <LandingNavbar soMarca />
      <PainelCadastro />
    </TelaBase>
  );
}
