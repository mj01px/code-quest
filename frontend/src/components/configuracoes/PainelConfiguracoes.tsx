"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ErroApi, api, temSessao } from "@/lib/api";
import type { MinhaCriatura, ProgressoAtual, Usuario } from "@/lib/types";
import { validarEmail, validarNickname } from "@/lib/validacao";
import { BarraLateral } from "@/components/layout/BarraLateral";
import { SecaoCompanheiro } from "./SecaoCompanheiro";
import { SecaoPerfil } from "./SecaoPerfil";
import { SecaoZonaRisco } from "./SecaoZonaRisco";

interface ErrosPerfil {
  nickname?: string | null;
  email?: string | null;
}

export function PainelConfiguracoes() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [criaturas, setCriaturas] = useState<MinhaCriatura[]>([]);
  const [progresso, setProgresso] = useState<ProgressoAtual | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [errosPerfil, setErrosPerfil] = useState<ErrosPerfil>({});
  const [salvando, setSalvando] = useState(false);
  const [enviandoToken, setEnviandoToken] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const carregarCriaturas = useCallback(async () => {
    const [minhas, prog] = await Promise.all([
      api.minhasCriaturas(),
      api.meuProgresso(),
    ]);
    setCriaturas(minhas);
    setProgresso(prog);
  }, []);

  useEffect(() => {
    if (!temSessao()) {
      router.replace("/entrar");
      return;
    }

    let ativo = true;
    (async () => {
      try {
        const perfil = await api.eu();
        if (!ativo) return;
        setUsuario(perfil);
        setNickname(perfil.nickname);
        setEmail(perfil.email);
        await carregarCriaturas();
      } catch (e) {
        if (!ativo) return;
        if (e instanceof ErroApi && e.status === 401) {
          router.replace("/entrar");
          return;
        }
        setErro(
          e instanceof ErroApi
            ? e.message
            : "Não foi possível carregar as configurações.",
        );
      } finally {
        if (ativo) setCarregando(false);
      }
    })();

    return () => {
      ativo = false;
    };
  }, [router, carregarCriaturas]);

  function mudarNickname(valor: string) {
    setNickname(valor);
    setStatus(null);
    setErrosPerfil((atual) => ({ ...atual, nickname: null }));
  }

  function mudarEmail(valor: string) {
    setEmail(valor);
    setStatus(null);
    setErrosPerfil((atual) => ({ ...atual, email: null }));
  }

  async function alterarToken() {
    if (!usuario) return;
    setEnviandoToken(true);
    setStatus(null);
    try {
      await api.senhaEsquecida(usuario.email);
      setStatus(`> LINK DE SENHA ENVIADO PARA ${usuario.email.toUpperCase()}`);
    } catch {
      setStatus("> NÃO FOI POSSÍVEL ENVIAR O LINK");
    } finally {
      setEnviandoToken(false);
    }
  }

  async function salvar() {
    if (!usuario) return;

    const erroNick = validarNickname(nickname);
    const erroMail = validarEmail(email);
    setErrosPerfil({ nickname: erroNick, email: erroMail });
    if (erroNick || erroMail) return;

    const novoNick = nickname.trim();
    const novoEmail = email.trim();
    const nickMudou = novoNick !== usuario.nickname;
    const emailMudou = novoEmail.toLowerCase() !== usuario.email.toLowerCase();

    setSalvando(true);
    setStatus(null);
    try {
      if (nickMudou) {
        const atualizado = await api.atualizarPerfil({ nickname: novoNick });
        setUsuario(atualizado);
        setNickname(atualizado.nickname);
      }
      if (emailMudou) {
        await api.trocarEmail(novoEmail);
        setEmail(usuario.email);
        setStatus(
          `> LINK ENVIADO PARA ${novoEmail.toUpperCase()} — CONFIRME POR LÁ`,
        );
      } else if (nickMudou) {
        setStatus("> PERFIL SALVO");
      } else {
        setStatus("> NADA MUDOU");
      }
    } catch (e) {
      if (e instanceof ErroApi) {
        const porCampo = e.porCampo();
        setErrosPerfil({
          nickname: porCampo.nickname ?? null,
          email: porCampo.email ?? null,
        });
        if (!porCampo.nickname && !porCampo.email) {
          setStatus(`> ${e.message.toUpperCase()}`);
        }
      } else {
        setStatus("> FALHA AO SALVAR");
      }
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-void px-6">
        <p className="font-label text-[13px] tracking-[2px] text-brand-light">
          &gt; CARREGANDO CONFIGURAÇÕES...
        </p>
      </div>
    );
  }

  if (erro || !usuario) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-void px-6">
        <p
          role="alert"
          className="border-2 border-danger-deep bg-panel-soft px-4 py-3 font-body text-xl tracking-wide text-danger"
        >
          {erro ?? "Sessão inválida."}
        </p>
      </div>
    );
  }

  const ativa = criaturas.find((c) => c.ativa) ?? null;
  const sujo =
    nickname.trim() !== usuario.nickname ||
    email.trim().toLowerCase() !== usuario.email.toLowerCase();
  const linhaStatus = status ?? (sujo ? "> ALTERAÇÕES NÃO SALVAS" : "> TUDO SALVO");

  return (
    <div className="flex min-h-screen flex-wrap items-stretch bg-void font-body text-ink-soft">
      <BarraLateral ativa={ativa} progresso={progresso} />

      <main className="flex min-w-[320px] flex-[1_1_480px] flex-col items-center gap-8 px-5 py-10 sm:px-8">
        <div className="flex w-full max-w-[640px] flex-col gap-3">
          <span className="font-label text-[11px] tracking-[2px] text-brand">
            {"// PAINEL DE CONTROLE"}
          </span>
          <h1 className="m-0 font-display text-[15px] leading-[1.7] tracking-[1px] text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)] sm:text-[20px]">
            Configurações
          </h1>
        </div>

        <SecaoPerfil
          nickname={nickname}
          email={email}
          erros={errosPerfil}
          enviandoToken={enviandoToken}
          aoMudarNickname={mudarNickname}
          aoMudarEmail={mudarEmail}
          aoAlterarToken={alterarToken}
        />

        <SecaoCompanheiro
          criaturas={criaturas}
          progresso={progresso}
          recarregar={carregarCriaturas}
        />

        <SecaoZonaRisco />

        <div className="flex w-full max-w-[640px] flex-wrap items-center justify-between gap-4">
          <span
            className={`font-label text-[11px] tracking-[2px] ${
              sujo && !status ? "text-ink-muted" : "text-brand-light"
            }`}
          >
            {linhaStatus}
          </span>
          <button
            type="button"
            onClick={salvar}
            disabled={salvando}
            className="cursor-pointer border-[3px] border-brand-light bg-brand-deep px-6 py-4 font-display text-xs leading-[1.7] tracking-[1px] text-ink shadow-[0_0_0_3px_var(--color-brand-void),4px_4px_0_rgba(0,0,0,0.7)] hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            {salvando ? "SALVANDO..." : "SALVAR"}
          </button>
        </div>
      </main>
    </div>
  );
}
