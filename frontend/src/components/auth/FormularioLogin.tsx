"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PixelButton } from "@/components/ui/PixelButton";
import { PixelField } from "@/components/ui/PixelField";
import { ErroApi, type MfaMetodo, api, pedeMfa } from "@/lib/api";
import { CODIGO_MFA_MAX, EMAIL_MAX, validarEmail } from "@/lib/validacao";

interface Erros {
  email?: string | null;
  senha?: string | null;
  geral?: string | null;
}

interface Props {
  aoDetectarPendente: (email: string) => void;
}

// Passo 1 (senha) resolveu que falta o 2º fator: guardamos o token curto e o
// método para pedir o código na tela seguinte.
interface Desafio {
  mfa_token: string;
  metodo: MfaMetodo;
}

const COPY_METODO: Record<MfaMetodo, string> = {
  APP: "Abra seu aplicativo autenticador e digite o código atual.",
  EMAIL: "Enviamos um código para o seu e-mail. Digite-o abaixo.",
};

export function FormularioLogin({ aoDetectarPendente }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const [enviando, setEnviando] = useState(false);

  const [desafio, setDesafio] = useState<Desafio | null>(null);
  const [codigoMfa, setCodigoMfa] = useState("");
  const [erroMfa, setErroMfa] = useState<string | null>(null);

  async function concluirLogin() {
    const criaturas = await api.minhasCriaturas();
    router.push(criaturas.length > 0 ? "/trilhas" : "/escolher-criatura");
  }

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
      const resposta = await api.login({ email: email.trim(), senha });
      if (pedeMfa(resposta)) {
        setDesafio({ mfa_token: resposta.mfa_token, metodo: resposta.metodo });
        setCodigoMfa("");
        setErroMfa(null);
        setEnviando(false);
        return;
      }

      await concluirLogin();
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

  async function aoEnviarMfa(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!desafio) return;
    if (!codigoMfa.trim()) {
      setErroMfa("Digite o código.");
      return;
    }

    setEnviando(true);
    setErroMfa(null);
    try {
      await api.loginMfa({
        mfa_token: desafio.mfa_token,
        codigo: codigoMfa.trim(),
      });
      await concluirLogin();
    } catch (erro) {
      if (erro instanceof ErroApi) {
        if (erro.temCodigo("mfa_token_invalido")) {
          // O token curto expirou: volta pro passo da senha.
          setDesafio(null);
          setErros({ geral: "Sua verificação expirou. Entre de novo." });
          setEnviando(false);
          return;
        }
        const porCampo = erro.porCampo();
        setErroMfa(porCampo.codigo ?? erro.message);
      } else {
        setErroMfa("Falha inesperada. Tente de novo.");
      }
      setEnviando(false);
    }
  }

  if (desafio) {
    return (
      <form noValidate onSubmit={aoEnviarMfa} className="flex flex-col gap-6">
        <p className="m-0 font-body text-xl leading-[1.6] tracking-wide text-ink-muted">
          {COPY_METODO[desafio.metodo]}
        </p>

        <PixelField
          rotulo="CÓDIGO"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={CODIGO_MFA_MAX}
          placeholder="000000"
          value={codigoMfa}
          erro={erroMfa}
          onChange={(e) => setCodigoMfa(e.target.value)}
        />

        <PixelButton type="submit" disabled={enviando} className="mt-2 w-full">
          {enviando ? "VERIFICANDO..." : "CONFIRMAR CÓDIGO"}
        </PixelButton>

        <button
          type="button"
          onClick={() => {
            setDesafio(null);
            setErroMfa(null);
          }}
          className="cursor-pointer font-label text-[11px] tracking-[2px] text-ink-muted underline underline-offset-4"
        >
          VOLTAR
        </button>
      </form>
    );
  }

  return (
    <form noValidate onSubmit={aoEnviar} className="flex flex-col gap-6">
      <PixelField
        rotulo="E-MAIL"
        type="email"
        name="email"
        autoComplete="username"
        maxLength={EMAIL_MAX}
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
