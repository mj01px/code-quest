import type { Metadata } from "next";
import { FormularioLogin } from "@/components/auth/FormularioLogin";
import { PainelAuth } from "@/components/layout/PainelAuth";
import { TelaBase } from "@/components/layout/TelaBase";
import { PixelLink } from "@/components/ui/PixelLink";

export const metadata: Metadata = {
  title: "Entrar | CodeQuest",
  description: "Acesse sua conta e continue de onde parou.",
};

export default function PaginaEntrar() {
  return (
    <TelaBase>
      <PainelAuth
        titulo={
          <>
            SYSTEM<span className="text-brand">.</span>LOGIN
          </>
        }
        linhaTerminal="Estabelecendo conexão..."
        formulario={<FormularioLogin />}
        sprite="/marca/ovo.png"
        spriteAlt="Ovo do CodeQuest rachando"
        tituloLateral="Bem-vindo de volta"
        textoLateral="Entre para retomar de onde parou."
        acaoLateral={
          <div className="flex flex-col items-center gap-4">
            <p className="m-0 font-label text-[10px] tracking-[2px] text-ink-muted">
              AINDA NÃO TEM CONTA?
            </p>
            <PixelLink href="/cadastro">CRIAR CONTA</PixelLink>
          </div>
        }
      />
    </TelaBase>
  );
}
