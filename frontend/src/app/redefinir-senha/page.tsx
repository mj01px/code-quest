import type { Metadata } from "next";
import { Suspense } from "react";
import {
  PainelNovaSenha,
  PainelNovaSenhaCarregando,
} from "@/components/auth/PainelNovaSenha";
import { AppHeader } from "@/components/layout/AppHeader";
import { TelaBase } from "@/components/layout/TelaBase";

export const metadata: Metadata = {
  title: "Nova senha",
  description: "Defina uma senha nova para sua conta.",
};

export default function PaginaRedefinirSenha() {
  return (
    <TelaBase>
      <AppHeader />
      <Suspense fallback={<PainelNovaSenhaCarregando />}>
        <PainelNovaSenha />
      </Suspense>
    </TelaBase>
  );
}
