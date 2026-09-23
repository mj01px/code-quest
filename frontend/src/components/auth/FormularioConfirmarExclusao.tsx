"use client";

import { useState } from "react";
import { PixelButton } from "@/components/ui/PixelButton";
import { PixelField } from "@/components/ui/PixelField";
import { PixelLink } from "@/components/ui/PixelLink";
import { ErroApi, api } from "@/lib/api";

interface Props {
  token: string;
  aoConcluir: () => void;
  aoJaUsado: () => void;
}

export function FormularioConfirmarExclusao({
  token,
  aoConcluir,
  aoJaUsado,
}: Props) {
  const [senha, setSenha] = useState("");
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!senha) {
      setErroSenha("Digite sua senha para confirmar.");
      return;
    }

    setEnviando(true);
    setErroSenha(null);
    setErroGeral(null);
    try {
      await api.confirmarExclusao({ token, senha });
      aoConcluir();
    } catch (erro) {
      if (erro instanceof ErroApi && erro.temCodigo("link_ja_usado")) {
        aoJaUsado();
        return;
      }
      if (erro instanceof ErroApi) {
        const porCampo = erro.porCampo();
        if (porCampo.senha) {
          setErroSenha(porCampo.senha);
        } else if (porCampo.token) {
          setErroGeral(porCampo.token);
        } else {
          setErroGeral(erro.message);
        }
      } else {
        setErroGeral("Falha inesperada. Tente de novo.");
      }
      setEnviando(false);
    }
  }

  return (
    <form noValidate onSubmit={aoEnviar} className="flex flex-col gap-6">
      <p className="m-0 font-body text-lg leading-[1.8] tracking-[1px] text-ink-body">
        Confirme com a sua senha para excluir a conta de vez. Seus dados são
        anonimizados na hora — não tem como desfazer.
      </p>

      <PixelField
        rotulo="SUA SENHA"
        type="password"
        revelavel
        name="senha"
        autoComplete="current-password"
        placeholder="••••••••"
        value={senha}
        erro={erroSenha}
        onChange={(e) => setSenha(e.target.value)}
      />

      {erroGeral ? (
        <div className="flex flex-col gap-3">
          <p
            role="alert"
            className="m-0 border-2 border-danger-deep bg-panel-soft px-4 py-3 font-body text-base leading-[1.6] tracking-wide text-danger"
          >
            {erroGeral}
          </p>
          <PixelLink href="/configuracoes" className="w-full">
            PEDIR NOVO LINK
          </PixelLink>
        </div>
      ) : null}

      <PixelButton type="submit" disabled={enviando} className="mt-2 w-full">
        {enviando ? "EXCLUINDO..." : "EXCLUIR MINHA CONTA"}
      </PixelButton>
    </form>
  );
}
