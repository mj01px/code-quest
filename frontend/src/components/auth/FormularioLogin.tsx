"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PixelButton } from "@/components/ui/PixelButton";
import { PixelField } from "@/components/ui/PixelField";
import { ErroApi, api } from "@/lib/api";
import { validarEmail } from "@/lib/validacao";

interface Erros {
  email?: string | null;
  senha?: string | null;
  geral?: string | null;
}

interface Props {
  aoDetectarPendente: (email: string) => void;
}

export function FormularioLogin({ aoDetectarPendente }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    const encontrados: Erros = {
      email: validarEmail(email),
      senha: senha ? null : "Informe sua senha.",
    };
    setErros(encontrados);
    if (encontrados.email || encontrados.senha) return;

    setEnviando(true);
    try {
      await api.login({ email: email.trim(), senha });

      const criaturas = await api.minhasCriaturas();
      router.push(criaturas.length > 0 ? "/inicio" : "/escolher-criatura");
    } catch (erro) {
      if (erro instanceof ErroApi) {
        if (erro.temCodigo("email_nao_verificado")) {
          aoDetectarPendente(email.trim());
          return;
        }
        const porCampo = erro.porCampo();
        setErros({
          email: porCampo.email ?? null,
          senha: porCampo.senha ?? null,
          geral:
            erro.status === 401
              ? erro.message
              : Object.keys(porCampo).length
                ? null
                : erro.message,
        });
      } else {
        setErros({ geral: "Falha inesperada. Tente de novo." });
      }
      setEnviando(false);
    }
  }

  return (
    <form noValidate onSubmit={aoEnviar} className="flex flex-col gap-6">
      <PixelField
        rotulo="E-MAIL"
        type="email"
        name="email"
        autoComplete="username"
        placeholder="voce@exemplo.com"
        value={email}
        erro={erros.email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <PixelField
        rotulo="SENHA"
        type="password"
        revelavel
        name="senha"
        autoComplete="current-password"
        placeholder="••••••••"
        className="tracking-[4px]"
        value={senha}
        erro={erros.senha}
        onChange={(e) => setSenha(e.target.value)}
        acao={
          <Link
            href="/recuperar-senha"
            className="font-label text-[13px] tracking-[2px] text-brand-light"
          >
            ESQUECEU?
          </Link>
        }
      />

      {erros.geral ? (
        <div className="flex flex-col gap-3">
          <p
            role="alert"
            className="m-0 border-2 border-danger-deep bg-panel-soft px-4 py-3 font-body text-xl leading-[1.6] tracking-wide text-danger"
          >
            {erros.geral}
          </p>
          <Link
            href="/recuperar-senha"
            className="font-label text-[11px] tracking-[2px] text-brand-light underline underline-offset-4"
          >
            REDEFINIR MINHA SENHA
          </Link>
        </div>
      ) : null}

      <PixelButton type="submit" disabled={enviando} className="mt-2 w-full">
        {enviando ? "CONECTANDO..." : "INICIAR SESSÃO"}
      </PixelButton>
    </form>
  );
}
