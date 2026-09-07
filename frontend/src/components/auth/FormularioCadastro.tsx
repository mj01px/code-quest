"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PixelButton } from "@/components/ui/PixelButton";
import { PixelField } from "@/components/ui/PixelField";
import { ErroApi, api, guardarSessao } from "@/lib/api";
import {
  NICKNAME_MAX,
  validarConfirmacao,
  validarEmail,
  validarNickname,
  validarSenha,
} from "@/lib/validacao";

interface Erros {
  email?: string | null;
  nickname?: string | null;
  senha?: string | null;
  confirmacao?: string | null;
  geral?: string | null;
}

export function FormularioCadastro() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    const encontrados: Erros = {
      email: validarEmail(email),
      nickname: validarNickname(nickname),
      senha: validarSenha(senha, [email, nickname]),
      confirmacao: validarConfirmacao(senha, confirmacao),
    };
    setErros(encontrados);
    if (Object.values(encontrados).some(Boolean)) return;

    setEnviando(true);
    try {
      const sessao = await api.registrar({
        email: email.trim(),
        nickname: nickname.trim(),
        senha,
        senha_confirmacao: confirmacao,
      });
      guardarSessao(sessao);
      router.push("/escolher-criatura");
    } catch (erro) {
      if (erro instanceof ErroApi) {
        const porCampo = erro.porCampo();
        setErros({
          email: porCampo.email ?? null,
          nickname: porCampo.nickname ?? null,
          senha: porCampo.senha ?? null,
          confirmacao: porCampo.senha_confirmacao ?? null,
          geral: Object.keys(porCampo).length ? null : erro.message,
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
        autoComplete="email"
        placeholder="voce@exemplo.com"
        value={email}
        erro={erros.email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <PixelField
        rotulo="NICKNAME"
        type="text"
        name="nickname"
        autoComplete="username"
        maxLength={NICKNAME_MAX}
        placeholder="seu_nick"
        value={nickname}
        erro={erros.nickname}
        onChange={(e) => setNickname(e.target.value)}
      />

      <PixelField
        rotulo="SENHA"
        type="password"
        revelavel
        name="senha"
        autoComplete="new-password"
        placeholder="••••••••"
        className="tracking-[4px]"
        value={senha}
        erro={erros.senha}
        onChange={(e) => setSenha(e.target.value)}
      />

      <PixelField
        rotulo="CONFIRMAR SENHA"
        type="password"
        revelavel
        name="confirmacao"
        autoComplete="new-password"
        placeholder="••••••••"
        className="tracking-[4px]"
        value={confirmacao}
        erro={erros.confirmacao}
        onChange={(e) => setConfirmacao(e.target.value)}
      />

      {erros.geral ? (
        <p
          role="alert"
          className="m-0 border-2 border-danger-deep bg-panel-soft px-4 py-3 font-body text-base leading-[1.6] tracking-wide text-danger"
        >
          {erros.geral}
        </p>
      ) : null}

      <PixelButton type="submit" disabled={enviando} className="mt-2 w-full">
        {enviando ? "CRIANDO..." : "CRIAR CONTA"}
      </PixelButton>
    </form>
  );
}
