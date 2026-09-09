"use client";

import { useState } from "react";
import { PixelButton } from "@/components/ui/PixelButton";
import { api } from "@/lib/api";

type Estado = "parado" | "enviando" | "enviado" | "falhou";

interface Props {
  email: string;
  falhaNoEnvio?: boolean;
}

const CAIXA =
  "m-0 border-2 bg-panel-soft px-4 py-3 font-body text-base leading-[1.6] tracking-wide";

export function AvisoVerificacao({ email, falhaNoEnvio = false }: Props) {
  const [estado, setEstado] = useState<Estado>("parado");

  async function reenviar() {
    setEstado("enviando");
    try {
      await api.reenviarVerificacao(email);
      setEstado("enviado");
    } catch {
      setEstado("falhou");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="m-0 font-display text-[13px] leading-[1.8] tracking-[1px] text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)]">
        CONFIRME SEU E-MAIL
      </h2>

      {falhaNoEnvio ? (
        <p role="alert" className={`${CAIXA} border-danger-deep text-danger`}>
          Sua conta foi criada, mas não conseguimos enviar o e-mail agora. Tente
          reenviar abaixo.
        </p>
      ) : (
        <p className="m-0 font-body text-lg leading-[1.8] tracking-[1px] text-ink-body">
          Enviamos um link de confirmação para{" "}
          <strong className="text-ink-soft">{email}</strong>. Abra o link para
          liberar seu acesso. Ele vale por 24 horas.
        </p>
      )}

      <p className="m-0 font-body text-base leading-[1.6] tracking-wide text-ink-muted">
        Não chegou? Confira a caixa de spam e a aba de promoções antes de
        reenviar.
      </p>

      {estado === "enviado" ? (
        <p role="status" className={`${CAIXA} border-brand-shadow text-ink-body`}>
          Se houver uma conta pendente com esse endereço, o link acabou de sair.
        </p>
      ) : null}

      {estado === "falhou" ? (
        <p role="alert" className={`${CAIXA} border-danger-deep text-danger`}>
          Não foi possível reenviar agora. Tente de novo em instantes.
        </p>
      ) : null}

      <PixelButton
        type="button"
        variante="secundaria"
        onClick={reenviar}
        disabled={estado === "enviando" || estado === "enviado"}
        className="w-full"
      >
        {estado === "enviando" ? "REENVIANDO..." : "REENVIAR E-MAIL"}
      </PixelButton>
    </div>
  );
}
