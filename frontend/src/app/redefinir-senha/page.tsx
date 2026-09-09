import type { Metadata } from "next";
import { Suspense } from "react";
import { FormularioRedefinirSenha } from "@/components/auth/FormularioRedefinirSenha";
import { PainelAuth } from "@/components/layout/PainelAuth";
import { TelaBase } from "@/components/layout/TelaBase";

export const metadata: Metadata = {
  title: "Nova senha | CodeQuest",
  description: "Defina uma senha nova para sua conta.",
};

export default function PaginaRedefinirSenha() {
  return (
    <TelaBase>
      <PainelAuth
        titulo={
          <>
            NEW<span className="text-brand">.</span>PASSWORD
          </>
        }
        linhaTerminal="Validando chave de redefinição..."
        formulario={
          <Suspense fallback={null}>
            <FormularioRedefinirSenha />
          </Suspense>
        }
      />
    </TelaBase>
  );
}
