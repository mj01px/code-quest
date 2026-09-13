"use client";

import { useState } from "react";
import { PixelButton } from "@/components/ui/PixelButton";
import { PixelField } from "@/components/ui/PixelField";
import { api } from "@/lib/api";
import { validarEmail } from "@/lib/validacao";

const CAIXA =
  "m-0 border-2 bg-panel-soft px-4 py-3 font-body text-base leading-[1.6] tracking-wide";

interface Props {
  aoPedir: (email: string) => void;
}

export function FormularioSenhaEsquecida({ aoPedir }: Props) {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    const encontrado = validarEmail(email);
    setErro(encontrado);
    if (encontrado) return;

    setEnviando(true);
    try {
      const endereco = email.trim();
      await api.senhaEsquecida(endereco);
      aoPedir(endereco);
    } catch {
      setErro("Não foi possível pedir agora. Tente de novo em instantes.");
      setEnviando(false);
    }
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
