"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PixelButton } from "@/components/ui/PixelButton";
import { PixelCheckbox } from "@/components/ui/PixelCheckbox";
import { PixelField } from "@/components/ui/PixelField";
import { ErroApi, api } from "@/lib/api";
import type { DocumentosLegais } from "@/lib/types";
import {
  NICKNAME_MAX,
  validarAceite,
  validarEmail,
  validarNickname,
  validarSenha,
} from "@/lib/validacao";

interface Erros {
  email?: string | null;
  nickname?: string | null;
  senha?: string | null;
  aceite?: string | null;
  geral?: string | null;
}

const CAMPOS_DA_TELA = [
  "email",
  "nickname",
  "senha",
  "aceite_documentos",
] as const;

const ESTILO_LINK = "underline underline-offset-2";

export interface Cadastrado {
  email: string;
  emailEnviado: boolean;
}

interface Props {
  aoCadastrar: (dados: Cadastrado) => void;
}

export function FormularioCadastro({ aoCadastrar }: Props) {
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [senha, setSenha] = useState("");
  const [aceite, setAceite] = useState(false);
  const [documentos, setDocumentos] = useState<DocumentosLegais | null>(null);
  const [falhaDocumentos, setFalhaDocumentos] = useState(false);
  const [erros, setErros] = useState<Erros>({});
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let ativo = true;

    api
      .documentosLegais()
      .then((dados) => {
        if (ativo) setDocumentos(dados);
      })
      .catch(() => {
        if (ativo) setFalhaDocumentos(true);
      });

    return () => {
      ativo = false;
    };
  }, []);

  async function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!documentos) return;

    const encontrados: Erros = {
      email: validarEmail(email),
      nickname: validarNickname(nickname),
      senha: validarSenha(senha, [email, nickname]),
      aceite: validarAceite(aceite),
    };
    setErros(encontrados);
    if (Object.values(encontrados).some(Boolean)) return;

    setEnviando(true);
    try {
      const endereco = email.trim();
      const resposta = await api.registrar({
        email: endereco,
        nickname: nickname.trim(),
        senha,
        aceite_documentos: aceite,
        versao_termos: documentos.termos.versao,
        versao_privacidade: documentos.privacidade.versao,
      });
      aoCadastrar({
        email: endereco,
        emailEnviado: resposta.email_enviado,
      });
    } catch (erro) {
      if (erro instanceof ErroApi) {
        const porCampo = erro.porCampo();
        const conhecido = CAMPOS_DA_TELA.some((campo) => campo in porCampo);
        setErros({
          email: porCampo.email ?? null,
          nickname: porCampo.nickname ?? null,
          senha: porCampo.senha ?? null,
          aceite: porCampo.aceite_documentos ?? null,
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
        value={senha}
        erro={erros.senha}
        onChange={(e) => setSenha(e.target.value)}
      />

      <PixelCheckbox
        name="aceite"
        checked={aceite}
        erro={erros.aceite}
        disabled={!documentos}
        onChange={(e) => setAceite(e.target.checked)}
      >
        Li e aceito os{" "}
        <Link
          href={documentos?.termos.caminho ?? "/termos"}
          target="_blank"
          rel="noopener noreferrer"
          className={ESTILO_LINK}
        >
          Termos de Uso
        </Link>{" "}
        e a{" "}
        <Link
          href={documentos?.privacidade.caminho ?? "/privacidade"}
          target="_blank"
          rel="noopener noreferrer"
          className={ESTILO_LINK}
        >
          Política de Privacidade
        </Link>
        .
      </PixelCheckbox>

      {falhaDocumentos ? (
        <p
          role="alert"
          className="m-0 border-2 border-danger-deep bg-panel-soft px-4 py-3 font-body text-base leading-[1.6] tracking-wide text-danger"
        >
          Não foi possível carregar os termos agora, e sem eles não dá para
          criar a conta. Recarregue a página.
        </p>
      ) : null}

      {erros.geral ? (
        <p
          role="alert"
          className="m-0 border-2 border-danger-deep bg-panel-soft px-4 py-3 font-body text-base leading-[1.6] tracking-wide text-danger"
        >
          {erros.geral}
        </p>
      ) : null}

      <PixelButton
        type="submit"
        disabled={enviando || !documentos}
        className="mt-2 w-full"
      >
        {enviando ? "CRIANDO..." : "CRIAR CONTA"}
      </PixelButton>
    </form>
  );
}
