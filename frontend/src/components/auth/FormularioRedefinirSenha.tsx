"use client";

import { useState } from "react";
import { PixelButton } from "@/components/ui/PixelButton";
import { PixelField } from "@/components/ui/PixelField";
import { PixelLink } from "@/components/ui/PixelLink";
import { ErroApi, api } from "@/lib/api";
import { validarConfirmacao, validarSenha } from "@/lib/validacao";

interface Erros {
  senha?: string | null;
  confirmacao?: string | null;
  geral?: string | null;
}

const CAMPOS_DA_TELA = ["senha", "senha_confirmacao"] as const;

interface Props {
  token: string;
  aoTrocar: () => void;
}

export function FormularioRedefinirSenha({ token, aoTrocar }: Props) {
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    const encontrados: Erros = {
      senha: validarSenha(senha),
      confirmacao: validarConfirmacao(senha, confirmacao),
    };
    setErros(encontrados);
    if (encontrados.senha || encontrados.confirmacao) return;

    setEnviando(true);
    try {
      await api.redefinirSenha({
        token,
        senha,
        senha_confirmacao: confirmacao,
      });
      aoTrocar();
    } catch (erro) {
      if (erro instanceof ErroApi) {
        const porCampo = erro.porCampo();
        const conhecido = CAMPOS_DA_TELA.some((campo) => campo in porCampo);
        setErros({
          senha: porCampo.senha ?? null,
          confirmacao: porCampo.senha_confirmacao ?? null,
          geral: conhecido ? null : erro.message,
        });
      } else {
        setErros({ geral: "Falha inesperada. Tente de novo." });
      }
      setEnviando(false);
    }
  }

  return (
    <form noValidate onSubmit={aoEnviar} className="flex flex-col gap-6">
      <p className="m-0 font-body text-lg leading-[1.8] tracking-[1px] text-ink-body">
        Escolha uma senha nova. Ao trocar, as sessões abertas em outros
        aparelhos são encerradas.
      </p>

      <PixelField
        rotulo="NOVA SENHA"
        type="password"
        revelavel
        name="senha"
        autoComplete="new-password"
        placeholder="••••••••"
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
        value={confirmacao}
        erro={erros.confirmacao}
        onChange={(e) => setConfirmacao(e.target.value)}
      />

      {erros.geral ? (
        <div className="flex flex-col gap-3">
          <p
            role="alert"
            className="m-0 border-2 border-danger-deep bg-panel-soft px-4 py-3 font-body text-base leading-[1.6] tracking-wide text-danger"
          >
            {erros.geral}
          </p>
          <PixelLink href="/recuperar-senha" className="w-full">
            PEDIR NOVO LINK
          </PixelLink>
        </div>
      ) : null}

      <PixelButton type="submit" disabled={enviando} className="mt-2 w-full">
        {enviando ? "TROCANDO..." : "TROCAR SENHA"}
      </PixelButton>
    </form>
  );
}
