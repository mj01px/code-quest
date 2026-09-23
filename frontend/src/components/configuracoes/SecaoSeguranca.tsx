"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { PixelField } from "@/components/ui/PixelField";
import {
  ErroApi,
  type MfaMetodo,
  type MfaSetupApp,
  api,
} from "@/lib/api";
import { CODIGO_MFA_MAX } from "@/lib/validacao";

// Fases da seção. Fora de "carregando"/"inativo"/"ativo", estamos no meio de
// ativar (escolher método → confirmar código → guardar recuperação) ou de
// desativar (pedir um código).
type Fase =
  | "carregando"
  | "inativo"
  | "escolhendo"
  | "confirmando"
  | "recuperacao"
  | "ativo"
  | "desativando";

const ROTULO_METODO: Record<MfaMetodo, string> = {
  APP: "Aplicativo autenticador",
  EMAIL: "Código por e-mail",
};

function ehSetupApp(s: MfaSetupApp | null): s is MfaSetupApp {
  return s !== null;
}

export function SecaoSeguranca() {
  const [fase, setFase] = useState<Fase>("carregando");
  const [metodo, setMetodo] = useState<MfaMetodo>("APP");
  const [setupApp, setSetupApp] = useState<MfaSetupApp | null>(null);
  const [codigo, setCodigo] = useState("");
  const [recuperacao, setRecuperacao] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const status = await api.mfaStatus();
        if (!ativo) return;
        if (status.ativo && status.metodo) {
          setMetodo(status.metodo);
          setFase("ativo");
        } else {
          setFase("inativo");
        }
      } catch {
        if (ativo) setFase("inativo");
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  function limpar() {
    setCodigo("");
    setErro(null);
    setSetupApp(null);
  }

  async function iniciar(escolhido: MfaMetodo) {
    setMetodo(escolhido);
    setOcupado(true);
    setErro(null);
    try {
      const setup = await api.mfaIniciar(escolhido);
      if (escolhido === "APP" && "secret" in setup) {
        setSetupApp(setup);
      } else {
        setSetupApp(null);
      }
      setCodigo("");
      setFase("confirmando");
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : "Não foi possível iniciar.");
    } finally {
      setOcupado(false);
    }
  }

  async function confirmar() {
    if (!codigo.trim()) {
      setErro("Digite o código.");
      return;
    }
    setOcupado(true);
    setErro(null);
    try {
      const { codigos_recuperacao } = await api.mfaConfirmar(codigo.trim());
      setRecuperacao(codigos_recuperacao);
      limpar();
      setFase("recuperacao");
    } catch (e) {
      setErro(
        e instanceof ErroApi
          ? (e.porCampo().codigo ?? e.message)
          : "Não foi possível confirmar.",
      );
    } finally {
      setOcupado(false);
    }
  }

  async function desativar() {
    if (!codigo.trim()) {
      setErro("Digite um código para confirmar.");
      return;
    }
    setOcupado(true);
    setErro(null);
    try {
      await api.mfaDesativar(codigo.trim());
      limpar();
      setFase("inativo");
    } catch (e) {
      setErro(
        e instanceof ErroApi
          ? (e.porCampo().codigo ?? e.message)
          : "Não foi possível desativar.",
      );
    } finally {
      setOcupado(false);
    }
  }

  function baixarRecuperacao() {
    const blob = new Blob([recuperacao.join("\n") + "\n"], {
      type: "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "codequest-codigos-recuperacao.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="flex w-full max-w-[640px] flex-col gap-4">
      <h2 className="m-0 font-display text-[13px] leading-[1.7] tracking-[1px] text-ink">
        Verificação em duas etapas
      </h2>

      <div className="flex flex-col gap-4 border-2 border-l-4 border-edge-soft border-l-brand bg-panel px-6 py-5">
        {fase === "carregando" ? (
          <span className="font-label text-[11px] tracking-[2px] text-brand-light">
            &gt; VERIFICANDO...
          </span>
        ) : null}

        {fase === "inativo" ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="flex min-w-[220px] flex-[1_1_260px] flex-col gap-1">
              <span className="font-label text-[12px] tracking-[2px] text-brand-light">
                UM SEGUNDO FATOR
              </span>
              <span className="font-body text-base leading-[1.5] tracking-[1px] text-ink-muted">
                Além da senha, exija um código na hora de entrar. Use um
                aplicativo autenticador ou receba o código por e-mail.
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                limpar();
                setFase("escolhendo");
              }}
              className="cursor-pointer border-2 border-brand-light bg-brand-deep px-5 py-2.5 font-label text-[10px] tracking-[2px] text-ink shadow-pixel hover:bg-brand-strong"
            >
              ATIVAR 2FA
            </button>
          </div>
        ) : null}

        {fase === "escolhendo" ? (
          <div className="flex flex-col gap-4">
            <span className="font-body text-base leading-[1.5] tracking-[1px] text-ink-muted">
              Como você quer receber o código?
            </span>
            <div className="flex flex-wrap gap-3">
              {(["APP", "EMAIL"] as MfaMetodo[]).map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => iniciar(op)}
                  disabled={ocupado}
                  className="cursor-pointer border-2 border-brand-light bg-brand-deep px-5 py-2.5 font-label text-[10px] tracking-[2px] text-ink shadow-pixel hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {ROTULO_METODO[op].toUpperCase()}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setFase("inativo")}
                disabled={ocupado}
                className="cursor-pointer font-label text-[10px] tracking-[2px] text-ink-muted underline underline-offset-4 disabled:opacity-50"
              >
                CANCELAR
              </button>
            </div>
            {erro ? (
              <span
                role="alert"
                className="font-body text-base leading-[1.5] tracking-[1px] text-danger"
              >
                {erro}
              </span>
            ) : null}
          </div>
        ) : null}

        {fase === "confirmando" ? (
          <div className="flex flex-col gap-4">
            {ehSetupApp(setupApp) ? (
              <div className="flex flex-wrap items-start gap-5">
                <Image
                  src={setupApp.qr}
                  alt="QR Code para o aplicativo autenticador"
                  width={160}
                  height={160}
                  unoptimized
                  className="border-2 border-edge-soft bg-white p-2 [image-rendering:pixelated]"
                />
                <span className="flex min-w-[200px] flex-[1_1_200px] flex-col gap-2">
                  <span className="font-body text-base leading-[1.5] tracking-[1px] text-ink-muted">
                    Escaneie o QR no seu app autenticador. Não consegue
                    escanear? Digite a chave manualmente:
                  </span>
                  <code className="break-all border-2 border-edge-soft bg-field px-3 py-2 font-body text-sm tracking-[2px] text-brand-light">
                    {setupApp.secret}
                  </code>
                </span>
              </div>
            ) : (
              <span className="font-body text-base leading-[1.5] tracking-[1px] text-ink-muted">
                Enviamos um código para o seu e-mail. Digite-o abaixo para
                confirmar.
              </span>
            )}

            <PixelField
              rotulo="CÓDIGO"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={CODIGO_MFA_MAX}
              placeholder="000000"
              value={codigo}
              erro={erro}
              onChange={(e) => setCodigo(e.target.value)}
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={confirmar}
                disabled={ocupado}
                className="cursor-pointer border-2 border-brand-light bg-brand-deep px-5 py-2.5 font-label text-[10px] tracking-[2px] text-ink shadow-pixel hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
              >
                {ocupado ? "CONFIRMANDO..." : "CONFIRMAR"}
              </button>
              <button
                type="button"
                onClick={() => {
                  limpar();
                  setFase("inativo");
                }}
                disabled={ocupado}
                className="cursor-pointer font-label text-[10px] tracking-[2px] text-ink-muted underline underline-offset-4 disabled:opacity-50"
              >
                CANCELAR
              </button>
            </div>
          </div>
        ) : null}

        {fase === "recuperacao" ? (
          <div className="flex flex-col gap-4">
            <span className="font-label text-[12px] tracking-[2px] text-brand-light">
              2FA ATIVADO — GUARDE ESTES CÓDIGOS
            </span>
            <span className="font-body text-base leading-[1.5] tracking-[1px] text-ink-muted">
              Cada código serve uma vez, caso você perca o acesso ao segundo
              fator. Só aparecem agora — guarde num lugar seguro.
            </span>
            <ul className="m-0 grid list-none grid-cols-2 gap-2 border-2 border-edge-soft bg-field p-4">
              {recuperacao.map((c) => (
                <li
                  key={c}
                  className="font-body text-base tracking-[2px] text-ink"
                >
                  {c}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={baixarRecuperacao}
                className="cursor-pointer border-2 border-brand-light bg-brand-deep px-5 py-2.5 font-label text-[10px] tracking-[2px] text-ink shadow-pixel hover:bg-brand-strong"
              >
                BAIXAR CÓDIGOS
              </button>
              <button
                type="button"
                onClick={() => setFase("ativo")}
                className="cursor-pointer font-label text-[10px] tracking-[2px] text-brand-light underline underline-offset-4"
              >
                JÁ GUARDEI
              </button>
            </div>
          </div>
        ) : null}

        {fase === "ativo" ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="flex min-w-[220px] flex-[1_1_260px] flex-col gap-1">
              <span className="font-label text-[12px] tracking-[2px] text-brand-light">
                2FA ATIVO · {ROTULO_METODO[metodo].toUpperCase()}
              </span>
              <span className="font-body text-base leading-[1.5] tracking-[1px] text-ink-muted">
                A cada login pedimos um código além da senha.
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                limpar();
                setFase("desativando");
              }}
              className="cursor-pointer border-2 border-danger bg-transparent px-5 py-2.5 font-label text-[10px] tracking-[2px] text-danger shadow-pixel hover:bg-danger hover:text-void"
            >
              DESATIVAR
            </button>
          </div>
        ) : null}

        {fase === "desativando" ? (
          <div className="flex flex-col gap-4">
            <span className="font-body text-base leading-[1.5] tracking-[1px] text-ink-muted">
              Para desativar, confirme com um código do seu segundo fator (ou um
              código de recuperação).
            </span>
            <PixelField
              rotulo="CÓDIGO"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={CODIGO_MFA_MAX}
              placeholder="000000"
              value={codigo}
              erro={erro}
              onChange={(e) => setCodigo(e.target.value)}
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={desativar}
                disabled={ocupado}
                className="cursor-pointer border-2 border-danger bg-transparent px-5 py-2.5 font-label text-[10px] tracking-[2px] text-danger shadow-pixel hover:bg-danger hover:text-void disabled:cursor-not-allowed disabled:opacity-50"
              >
                {ocupado ? "DESATIVANDO..." : "DESATIVAR 2FA"}
              </button>
              <button
                type="button"
                onClick={() => {
                  limpar();
                  setFase("ativo");
                }}
                disabled={ocupado}
                className="cursor-pointer font-label text-[10px] tracking-[2px] text-ink-muted underline underline-offset-4 disabled:opacity-50"
              >
                CANCELAR
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
