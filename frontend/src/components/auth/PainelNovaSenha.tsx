"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { PainelAuth } from "@/components/layout/PainelAuth";
import { PixelLink } from "@/components/ui/PixelLink";
import {
  ArteCadeado,
  ArteConfirmado,
  ArteLinkInvalido,
} from "@/components/ui/ilustracoes";
import { FormularioRedefinirSenha } from "./FormularioRedefinirSenha";

const TITULO = (
  <>
    NEW<span className="text-brand">.</span>PASSWORD
  </>
);

const LINHA = "Validando chave de redefinição...";

const ESTILO_H2 =
  "m-0 font-display text-[13px] leading-[1.8] tracking-[1px] text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)]";
const ESTILO_P =
  "m-0 font-body text-lg leading-[1.8] tracking-[1px] text-ink-body";

// Enquanto o token da URL não chega, a moldura já aparece no lugar certo.
export function PainelNovaSenhaCarregando() {
  return (
    <PainelAuth
      titulo={TITULO}
      linhaTerminal={LINHA}
      ilustracao={<ArteCadeado />}
      formulario={null}
    />
  );
}

export function PainelNovaSenha() {
  const token = useSearchParams().get("token");
  const [pronto, setPronto] = useState(false);

  if (pronto) {
    return (
      <PainelAuth
        titulo={TITULO}
        linhaTerminal={LINHA}
        ilustracao={<ArteConfirmado />}
        formulario={
          <div className="flex flex-col gap-5">
            <h2 className={ESTILO_H2}>SENHA TROCADA</h2>
            <p className={ESTILO_P}>
              Pronto. Suas outras sessões foram encerradas por segurança, então
              entre de novo com a senha nova.
            </p>
            <PixelLink href="/entrar" className="w-full">
              INICIAR SESSÃO
            </PixelLink>
          </div>
        }
      />
    );
  }

  if (!token) {
    return (
      <PainelAuth
        titulo={TITULO}
        linhaTerminal={LINHA}
        ilustracao={<ArteLinkInvalido />}
        formulario={
          <div className="flex flex-col gap-5">
            <h2 className={ESTILO_H2}>LINK INCOMPLETO</h2>
            <p className={ESTILO_P}>
              Este endereço não traz um token de redefinição. Peça um link novo.
            </p>
            <PixelLink href="/recuperar-senha" className="w-full">
              PEDIR NOVO LINK
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
      ilustracao={<ArteCadeado />}
      formulario={
        <FormularioRedefinirSenha
          token={token}
          aoTrocar={() => setPronto(true)}
        />
      }
    />
  );
}
