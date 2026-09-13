import type { Metadata } from "next";
import { PainelSenhaEsquecida } from "@/components/auth/PainelSenhaEsquecida";
import { AppHeader } from "@/components/layout/AppHeader";
import { TelaBase } from "@/components/layout/TelaBase";

export const metadata: Metadata = {
  title: "Recuperar senha",
  description: "Receba um link para criar uma senha nova.",
};

export default function PaginaRecuperarSenha() {
  return (
    <TelaBase>
      <AppHeader />
      <PainelSenhaEsquecida />
    </TelaBase>
  );
}
