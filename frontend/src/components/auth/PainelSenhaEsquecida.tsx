"use client";

import { useState } from "react";
import { PainelAuth } from "@/components/layout/PainelAuth";
import { PixelLink } from "@/components/ui/PixelLink";
import { ArteChave, ArteEnvelope } from "@/components/ui/ilustracoes";
import { FormularioSenhaEsquecida } from "./FormularioSenhaEsquecida";

const TITULO = (
  <>
    RESET<span className="text-brand">.</span>PASSWORD
  </>
);

const LINHA = "Preparando chave de acesso...";

export function PainelSenhaEsquecida() {
  const [pedido, setPedido] = useState<string | null>(null);

  if (pedido) {
    return (
      <PainelAuth
        titulo={TITULO}
        linhaTerminal={LINHA}
        ilustracao={<ArteEnvelope />}
        selo="VÁLIDO POR 30 MIN"
        formulario={
          <div className="flex flex-col gap-5">
            <h2 className="m-0 font-display text-[13px] leading-[1.8] tracking-[1px] text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)]">
              PEDIDO ENVIADO
            </h2>
            <p className="m-0 font-body text-lg leading-[1.8] tracking-[1px] text-ink-body">
              Se houver uma conta com{" "}
              <strong className="text-ink-soft">{pedido}</strong>, o link de
              redefinição acabou de sair. Ele vale por 30 minutos.
            </p>
            <p className="m-0 font-body text-base leading-[1.6] tracking-wide text-ink-muted">
              Confira a caixa de spam e a aba de promoções antes de pedir de
              novo.
            </p>
            <PixelLink href="/entrar" className="w-full">
              VOLTAR AO LOGIN
            </PixelLink>
          </div>
        }
      />
    );
  }

  return (
    <PainelAuth
      titulo={TITULO}
      linhaTerminal={LINHA}
      ilustracao={<ArteChave />}
      formulario={<FormularioSenhaEsquecida aoPedir={setPedido} />}
    />
  );
}
