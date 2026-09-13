"use client";

import { useState } from "react";
import { PainelAuth } from "@/components/layout/PainelAuth";
import { PixelLink } from "@/components/ui/PixelLink";
import { ArteEnvelope } from "@/components/ui/ilustracoes";
import { AvisoVerificacao } from "./AvisoVerificacao";
import { FormularioLogin } from "./FormularioLogin";

const TITULO = (
  <>
    SYSTEM<span className="text-brand">.</span>LOGIN
  </>
);

export function PainelLogin() {
  const [pendente, setPendente] = useState<string | null>(null);

  if (pendente) {
    return (
      <PainelAuth
        titulo={TITULO}
        linhaTerminal="Aguardando confirmação do e-mail..."
        ilustracao={<ArteEnvelope />}
        selo="VÁLIDO POR 24 HORAS"
        formulario={<AvisoVerificacao email={pendente} />}
      />
    );
  }

  return (
    <PainelAuth
      titulo={TITULO}
      linhaTerminal="Estabelecendo conexão..."
      formulario={<FormularioLogin aoDetectarPendente={setPendente} />}
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
  );
}
