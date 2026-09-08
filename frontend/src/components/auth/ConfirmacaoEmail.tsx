"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PixelField } from "@/components/ui/PixelField";
import { PixelLink } from "@/components/ui/PixelLink";
import { AvisoVerificacao } from "./AvisoVerificacao";
import { api } from "@/lib/api";
import { validarEmail } from "@/lib/validacao";

type Estado = "conferindo" | "confirmado" | "recusado" | "sem_token";

const CAIXA =
  "m-0 border-2 bg-panel-soft px-4 py-3 font-body text-base leading-[1.6] tracking-wide";

export function ConfirmacaoEmail() {
  const token = useSearchParams().get("token");
  const [estado, setEstado] = useState<Estado>(
    token ? "conferindo" : "sem_token",
  );
  const [email, setEmail] = useState("");
  const [erroEmail, setErroEmail] = useState<string | null>(null);
  const [pedirNovo, setPedirNovo] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    let ativo = true;
    api
      .verificarEmail(token)
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

  if (pedirNovo) {
    return <AvisoVerificacao email={pedirNovo} />;
  }

  if (estado === "conferindo") {
    return (
      <p role="status" className={`${CAIXA} border-brand-shadow text-ink-body`}>
        Conferindo seu link...
      </p>
    );
  }

  if (estado === "confirmado") {
    return (
      <div className="flex flex-col gap-5">
        <h2 className="m-0 font-display text-[13px] leading-[1.8] tracking-[1px] text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)]">
          E-MAIL CONFIRMADO
        </h2>
        <p className="m-0 font-body text-lg leading-[1.8] tracking-[1px] text-ink-body">
          Tudo certo. Sua conta está liberada e você já pode entrar.
        </p>
        <PixelLink href="/entrar" className="w-full">
          INICIAR SESSÃO
        </PixelLink>
      </div>
    );
  }

  function pedirOutroLink(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const erro = validarEmail(email);
    setErroEmail(erro);
    if (erro) return;
    setPedirNovo(email.trim());
  }

  return (
    <form noValidate onSubmit={pedirOutroLink} className="flex flex-col gap-5">
      <h2 className="m-0 font-display text-[13px] leading-[1.8] tracking-[1px] text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)]">
        {estado === "recusado" ? "LINK INVÁLIDO" : "CONFIRMAR E-MAIL"}
      </h2>

      <p className="m-0 font-body text-lg leading-[1.8] tracking-[1px] text-ink-body">
        {estado === "recusado"
          ? "Este link expirou ou já foi trocado por outro. Informe seu e-mail que a gente manda um novo."
          : "Informe o e-mail da sua conta para receber um novo link de confirmação."}
      </p>

      <PixelField
        rotulo="E-MAIL"
        type="email"
        name="email"
        autoComplete="email"
        placeholder="voce@exemplo.com"
        value={email}
        erro={erroEmail}
        onChange={(e) => setEmail(e.target.value)}
      />

      <button
        type="submit"
        className="inline-flex cursor-pointer items-center justify-center rounded-none border-2 border-brand bg-transparent px-5 py-2.5 font-display text-[10px] leading-[1.7] tracking-wide text-brand-light shadow-pixel hover:border-brand-pale hover:text-[#f5f2ff]"
      >
        ENVIAR NOVO LINK
      </button>
    </form>
  );
}
