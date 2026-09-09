import type { Metadata } from "next";
import { Suspense } from "react";
import { ConfirmacaoEmail } from "@/components/auth/ConfirmacaoEmail";
import { PainelAuth } from "@/components/layout/PainelAuth";
import { TelaBase } from "@/components/layout/TelaBase";

export const metadata: Metadata = {
  title: "Confirmar e-mail | CodeQuest",
  description: "Confirme seu e-mail para liberar o acesso à CodeQuest.",
};

export default function PaginaVerificarEmail() {
  return (
    <TelaBase>
      <PainelAuth
        titulo={
          <>
            VERIFY<span className="text-brand">.</span>EMAIL
          </>
        }
        linhaTerminal="Validando credencial de acesso..."
        formulario={
          <Suspense fallback={null}>
            <ConfirmacaoEmail />
          </Suspense>
        }
      />
    </TelaBase>
  );
}
