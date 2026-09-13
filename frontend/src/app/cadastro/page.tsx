import type { Metadata } from "next";
import { PainelCadastro } from "@/components/auth/PainelCadastro";
import { AppHeader } from "@/components/layout/AppHeader";
import { TelaBase } from "@/components/layout/TelaBase";

export const metadata: Metadata = {
  title: "Criar conta",
  description: "Crie sua conta, escolha sua criatura e comece a programar.",
};

export default function PaginaCadastro() {
  return (
    <TelaBase>
      <AppHeader />
      <PainelCadastro />
    </TelaBase>
  );
}
