"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PainelAuth } from "@/components/layout/PainelAuth";
import { PixelLink } from "@/components/ui/PixelLink";
import {
  ArteConfirmado,
  ArteEnvelope,
  ArteEnvelopeLendo,
  ArteLinkInvalido,
} from "@/components/ui/ilustracoes";
import { api } from "@/lib/api";

type Estado = "conferindo" | "confirmado" | "recusado" | "sem_token";

const TITULO = (
  <>
    TROCAR<span className="text-brand">.</span>EMAIL
  </>
);

const LINHA = "Confirmando seu novo endereço...";

const ESTILO_H2 =
  "m-0 font-display text-[13px] leading-[1.8] tracking-[1px] text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)]";
const ESTILO_P =
  "m-0 font-body text-lg leading-[1.8] tracking-[1px] text-ink-body";

export function PainelConfirmarEmailCarregando() {
  return (
    <PainelAuth
      titulo={TITULO}
      linhaTerminal={LINHA}
      ilustracao={<ArteEnvelope />}
      formulario={null}
    />
  );
}

export function PainelConfirmarEmail() {
  const token = useSearchParams().get("token");
  const [estado, setEstado] = useState<Estado>(
    token ? "conferindo" : "sem_token",
  );

  useEffect(() => {
    if (!token) return;

    let ativo = true;
    api
      .confirmarTrocaEmail(token)
      .then(() => {
        if (ativo) setEstado("confirmado");
      })
      .catch(() => {
        if (ativo) setEstado("recusado");
      });

    return () => {
      ativo = false;
    };
  }, [token]);

  if (estado === "conferindo") {
    return (
      <PainelAuth
        titulo={TITULO}
        linhaTerminal={LINHA}
        ilustracao={<ArteEnvelopeLendo />}
        formulario={
          <p
            role="status"
            className="m-0 border-2 border-brand-shadow bg-panel-soft px-4 py-3 font-body text-base leading-[1.6] tracking-wide text-ink-body"
          >
            Conferindo seu link...
          </p>
        }
      />
    );
  }

  if (estado === "confirmado") {
    return (
      <PainelAuth
        titulo={TITULO}
        linhaTerminal={LINHA}
        ilustracao={<ArteConfirmado />}
        formulario={
          <div className="flex flex-col gap-5">
            <h2 className={ESTILO_H2}>E-MAIL TROCADO</h2>
            <p className={ESTILO_P}>
              Pronto. Seu novo e-mail já é o endereço de acesso da sua conta.
            </p>
            <PixelLink href="/configuracoes" className="w-full">
              VOLTAR ÀS CONFIGURAÇÕES
            </PixelLink>
          </div>
        }
      />
    );
  }

  const semToken = estado === "sem_token";

  return (
    <PainelAuth
      titulo={TITULO}
      linhaTerminal={LINHA}
      ilustracao={<ArteLinkInvalido />}
      formulario={
        <div className="flex flex-col gap-5">
          <h2 className={ESTILO_H2}>
            {semToken ? "LINK INCOMPLETO" : "LINK INVÁLIDO"}
          </h2>
          <p className={ESTILO_P}>
            {semToken
              ? "Abra o link direto do e-mail que enviamos para o novo endereço."
              : "Este link expirou ou já foi usado. Peça a troca de novo nas configurações."}
          </p>
          <PixelLink href="/configuracoes" className="w-full">
            VOLTAR ÀS CONFIGURAÇÕES
          </PixelLink>
        </div>
      }
    />
  );
}
