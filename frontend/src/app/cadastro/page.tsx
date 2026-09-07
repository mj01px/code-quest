import type { Metadata } from "next";
import { FormularioCadastro } from "@/components/auth/FormularioCadastro";
import { PainelAuth } from "@/components/layout/PainelAuth";
import { TelaBase } from "@/components/layout/TelaBase";
import { PixelLink } from "@/components/ui/PixelLink";

export const metadata: Metadata = {
  title: "Criar conta | CodeQuest",
  description: "Crie sua conta, escolha sua criatura e comece a programar.",
};

export default function PaginaCadastro() {
  return (
    <TelaBase>
      <PainelAuth
        titulo={
          <>
            NEW<span className="text-brand">.</span>PLAYER
          </>
        }
        linhaTerminal="Registrando novo operador..."
        formulario={<FormularioCadastro />}
        sprite="/marca/ovo.png"
        spriteAlt="Ovo do CodeQuest rachando"
        tituloLateral="Desenvolva-se"
        textoLateral="Crie sua conta para salvar o progresso, evoluir sua criatura e disputar o ranking semanal."
        acaoLateral={
          <div className="flex flex-col items-center gap-4">
            <p className="m-0 font-label text-[10px] tracking-[2px] text-ink-muted">
              JÁ TEM CONTA?
            </p>
            <PixelLink href="/entrar">ACESSAR SISTEMA</PixelLink>
          </div>
        }
      />
    </TelaBase>
  );
}
