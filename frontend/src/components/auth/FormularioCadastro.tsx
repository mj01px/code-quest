"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PixelButton } from "@/components/ui/PixelButton";
import { PixelCheckbox } from "@/components/ui/PixelCheckbox";
import { PixelField } from "@/components/ui/PixelField";
import { ErroApi, api, guardarSessao } from "@/lib/api";
import type { DocumentosLegais } from "@/lib/types";
import {
  NICKNAME_MAX,
  validarAceite,
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
  aceite?: string | null;
  geral?: string | null;
}

// Os campos que esta tela sabe mostrar embaixo do input certo. Qualquer outro
// que o servidor recuse (versão de documento, por exemplo) cai no aviso geral,
// senão o erro chegaria e não apareceria em lugar nenhum.
const CAMPOS_DA_TELA = [
  "email",
  "nickname",
  "senha",
  "senha_confirmacao",
  "aceite_documentos",
] as const;

const ESTILO_LINK = "underline underline-offset-2";

export function FormularioCadastro() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [aceite, setAceite] = useState(false);
  const [documentos, setDocumentos] = useState<DocumentosLegais | null>(null);
  const [falhaDocumentos, setFalhaDocumentos] = useState(false);
  const [erros, setErros] = useState<Erros>({});
  const [enviando, setEnviando] = useState(false);

  // A versão vem da API, não de constante no bundle: o cadastro devolve ao
  // servidor a versão que esta tela realmente exibiu, e o servidor recusa se
  // não for a vigente. Uma aba aberta há dias falha em vez de registrar um
  // aceite do texto errado.
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
      confirmacao: validarConfirmacao(senha, confirmacao),
      aceite: validarAceite(aceite),
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
        aceite_documentos: aceite,
        versao_termos: documentos.termos.versao,
        versao_privacidade: documentos.privacidade.versao,
      });
      guardarSessao(sessao);
      router.push("/escolher-criatura");
    } catch (erro) {
      if (erro instanceof ErroApi) {
        const porCampo = erro.porCampo();
        const conhecido = CAMPOS_DA_TELA.some((campo) => campo in porCampo);
        setErros({
          email: porCampo.email ?? null,
          nickname: porCampo.nickname ?? null,
          senha: porCampo.senha ?? null,
          confirmacao: porCampo.senha_confirmacao ?? null,
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
        e o{" "}
        <Link
          href={documentos?.privacidade.caminho ?? "/privacidade"}
          target="_blank"
          rel="noopener noreferrer"
          className={ESTILO_LINK}
        >
          Protocolo de Dados
        </Link>
        .
        {documentos ? (
          <span className="ml-1 text-ink-dim">
            (v{documentos.termos.versao} e v{documentos.privacidade.versao})
          </span>
        ) : null}
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
