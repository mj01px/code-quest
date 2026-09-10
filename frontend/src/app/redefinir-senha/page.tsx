import type { Metadata } from "next";
import { Suspense } from "react";
import {
  PainelNovaSenha,
  PainelNovaSenhaCarregando,
} from "@/components/auth/PainelNovaSenha";
import { TelaBase } from "@/components/layout/TelaBase";

export const metadata: Metadata = {
  title: "Nova senha | CodeQuest",
  description: "Defina uma senha nova para sua conta.",
};

export default function PaginaRedefinirSenha() {
  return (
    <TelaBase>
      <Suspense fallback={<PainelNovaSenhaCarregando />}>
        <PainelNovaSenha />
      </Suspense>
    </TelaBase>
  );
}
