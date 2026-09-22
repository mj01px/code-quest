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
import { FormularioConfirmarExclusao } from "./FormularioConfirmarExclusao";

const TITULO = (
  <>
    DELETE<span className="text-brand">.</span>ACCOUNT
  </>
);

const LINHA = "Validando link de exclusão...";

const ESTILO_H2 =
  "m-0 font-display text-[13px] leading-[1.8] tracking-[1px] text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)]";
const ESTILO_P =
  "m-0 font-body text-lg leading-[1.8] tracking-[1px] text-ink-body";

export function PainelConfirmarExclusaoCarregando() {
  return (
    <PainelAuth
      titulo={TITULO}
      linhaTerminal={LINHA}
      ilustracao={<ArteCadeado />}
      formulario={null}
    />
  );
}

export function PainelConfirmarExclusao() {
  const token = useSearchParams().get("token");
  const [concluido, setConcluido] = useState(false);
  const [jaExcluida, setJaExcluida] = useState(false);

  if (jaExcluida) {
    return (
      <PainelAuth
        titulo={TITULO}
        linhaTerminal={LINHA}
        ilustracao={<ArteConfirmado />}
        formulario={
          <div className="flex flex-col gap-5">
            <h2 className={ESTILO_H2}>CONTA JÁ EXCLUÍDA</h2>
            <p className={ESTILO_P}>
              Esta conta já tinha sido excluída por este link. Não há mais nada
              a fazer aqui.
            </p>
            <PixelLink href="/entrar" className="w-full">
              VOLTAR AO INÍCIO
            </PixelLink>
          </div>
        }
      />
    );
  }

  if (concluido) {
    return (
      <PainelAuth
        titulo={TITULO}
        linhaTerminal={LINHA}
        ilustracao={<ArteConfirmado />}
        formulario={
          <div className="flex flex-col gap-5">
            <h2 className={ESTILO_H2}>CONTA EXCLUÍDA</h2>
            <p className={ESTILO_P}>
              Pronto. Sua conta foi anonimizada e a sessão encerrada. Vai fazer
              falta por aqui.
            </p>
            <PixelLink href="/entrar" className="w-full">
              VOLTAR AO INÍCIO
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
              Abra o link direto do e-mail que enviamos. Se ele já foi usado ou
              expirou, peça um novo em Configurações.
            </p>
            <PixelLink href="/configuracoes" className="w-full">
              IR PARA CONFIGURAÇÕES
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
        <FormularioConfirmarExclusao
          token={token}
          aoConcluir={() => setConcluido(true)}
          aoJaUsado={() => setJaExcluida(true)}
        />
      }
    />
  );
}
