import type { Metadata } from "next";
import { Suspense } from "react";
import {
  PainelVerificarEmail,
  PainelVerificarEmailCarregando,
} from "@/components/auth/PainelVerificarEmail";
import { TelaBase } from "@/components/layout/TelaBase";

export const metadata: Metadata = {
  title: "Confirmar e-mail | CodeQuest",
  description: "Confirme seu e-mail para liberar o acesso à CodeQuest.",
};

export default function PaginaVerificarEmail() {
  return (
    <TelaBase>
      <Suspense fallback={<PainelVerificarEmailCarregando />}>
        <PainelVerificarEmail />
      </Suspense>
    </TelaBase>
  );
}
