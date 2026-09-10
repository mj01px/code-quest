import type { Metadata } from "next";
import { PainelSenhaEsquecida } from "@/components/auth/PainelSenhaEsquecida";
import { TelaBase } from "@/components/layout/TelaBase";

export const metadata: Metadata = {
  title: "Recuperar senha | CodeQuest",
  description: "Receba um link para criar uma senha nova.",
};

export default function PaginaRecuperarSenha() {
  return (
    <TelaBase>
      <PainelSenhaEsquecida />
    </TelaBase>
  );
}
