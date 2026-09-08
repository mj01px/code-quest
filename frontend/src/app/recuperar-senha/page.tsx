import type { Metadata } from "next";
import { FormularioSenhaEsquecida } from "@/components/auth/FormularioSenhaEsquecida";
import { PainelAuth } from "@/components/layout/PainelAuth";
import { TelaBase } from "@/components/layout/TelaBase";

export const metadata: Metadata = {
  title: "Recuperar senha | CodeQuest",
  description: "Receba um link para criar uma senha nova.",
};

export default function PaginaRecuperarSenha() {
  return (
    <TelaBase>
      <PainelAuth
        titulo={
          <>
            RESET<span className="text-brand">.</span>PASSWORD
          </>
        }
        linhaTerminal="Preparando chave de acesso..."
        formulario={<FormularioSenhaEsquecida />}
      />
    </TelaBase>
  );
}
