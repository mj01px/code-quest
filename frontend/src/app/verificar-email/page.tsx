import type { Metadata } from "next";
import { Suspense } from "react";
import {
  PainelVerificarEmail,
  PainelVerificarEmailCarregando,
} from "@/components/auth/PainelVerificarEmail";
import { AppHeader } from "@/components/layout/AppHeader";
import { TelaBase } from "@/components/layout/TelaBase";

export const metadata: Metadata = {
  title: "Confirmar e-mail",
  description: "Confirme seu e-mail para liberar o acesso à CodeQuest.",
};

export default function PaginaVerificarEmail() {
  return (
    <TelaBase>
      <AppHeader />
      <Suspense fallback={<PainelVerificarEmailCarregando />}>
        <PainelVerificarEmail />
      </Suspense>
    </TelaBase>
  );
}
