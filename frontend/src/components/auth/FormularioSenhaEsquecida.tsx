"use client";

import { useState } from "react";
import { PixelButton } from "@/components/ui/PixelButton";
import { PixelField } from "@/components/ui/PixelField";
import { PixelLink } from "@/components/ui/PixelLink";
import { api } from "@/lib/api";
import { validarEmail } from "@/lib/validacao";

const CAIXA =
  "m-0 border-2 bg-panel-soft px-4 py-3 font-body text-base leading-[1.6] tracking-wide";

export function FormularioSenhaEsquecida() {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [pedido, setPedido] = useState(false);

  async function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    const encontrado = validarEmail(email);
    setErro(encontrado);
    if (encontrado) return;

    setEnviando(true);
    try {
      await api.senhaEsquecida(email.trim());
      setPedido(true);
    } catch {
      setErro("Não foi possível pedir agora. Tente de novo em instantes.");
      setEnviando(false);
    }
  }

  if (pedido) {
    return (
      <div className="flex flex-col gap-5">
        <h2 className="m-0 font-display text-[13px] leading-[1.8] tracking-[1px] text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)]">
          PEDIDO ENVIADO
        </h2>
        <p className="m-0 font-body text-lg leading-[1.8] tracking-[1px] text-ink-body">
          Se houver uma conta com{" "}
          <strong className="text-ink-soft">{email.trim()}</strong>, o link de
          redefinição acabou de sair. Ele vale por 30 minutos.
        </p>
        <p className="m-0 font-body text-base leading-[1.6] tracking-wide text-ink-muted">
          Confira a caixa de spam e a aba de promoções antes de pedir de novo.
        </p>
        <PixelLink href="/entrar" className="w-full">
          VOLTAR AO LOGIN
        </PixelLink>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={aoEnviar} className="flex flex-col gap-6">
      <p className="m-0 font-body text-lg leading-[1.8] tracking-[1px] text-ink-body">
        Informe o e-mail da sua conta. Se ela existir, mandamos um link para
        você criar uma senha nova.
      </p>

      <PixelField
        rotulo="E-MAIL"
        type="email"
        name="email"
        autoComplete="email"
        placeholder="voce@exemplo.com"
        value={email}
        erro={erro}
        onChange={(e) => setEmail(e.target.value)}
      />

      <PixelButton type="submit" disabled={enviando} className="mt-2 w-full">
        {enviando ? "ENVIANDO..." : "ENVIAR LINK"}
      </PixelButton>

      <p className={`${CAIXA} border-edge-soft text-ink-muted`}>
        Lembrou a senha?{" "}
        <a href="/entrar" className="underline underline-offset-2">
          Voltar ao login
        </a>
        .
      </p>
    </form>
  );
}
