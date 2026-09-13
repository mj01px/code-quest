"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ErroApi, api } from "@/lib/api";

export function SecaoZonaRisco() {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [apagando, setApagando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function apagarTudo() {
    setApagando(true);
    setErro(null);
    try {
      await api.excluirConta();
      await api.sair().catch(() => null);
      router.replace("/entrar");
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : "Não foi possível excluir agora.");
      setApagando(false);
    }
  }

  return (
    <section className="flex w-full max-w-[640px] flex-col gap-4">
      <h2 className="m-0 font-display text-[13px] leading-[1.7] tracking-[1px] text-ink">
        Zona de risco
      </h2>

      <div className="flex flex-wrap items-center justify-between gap-4 border-2 border-l-4 border-edge-soft border-l-danger bg-panel px-6 py-5">
        <span className="flex min-w-[220px] flex-[1_1_260px] flex-col gap-1">
          <span className="font-label text-[12px] tracking-[2px] text-danger">
            APAGAR TUDO
          </span>
          <span className="font-body text-base leading-[1.5] tracking-[1px] text-ink-muted">
            Encerra sua conta e agenda a exclusão dos seus dados. Não tem volta.
          </span>
          {erro ? (
            <span
              role="alert"
              className="mt-1 font-body text-base leading-[1.5] tracking-[1px] text-danger"
            >
              {erro}
            </span>
          ) : null}
        </span>

        {confirmando ? (
          <span className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={apagarTudo}
              disabled={apagando}
              className="cursor-pointer border-2 border-danger-deep bg-danger px-5 py-2.5 font-label text-[10px] tracking-[2px] text-void shadow-pixel disabled:cursor-not-allowed disabled:opacity-50"
            >
              {apagando ? "APAGANDO..." : "CONFIRMAR"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              disabled={apagando}
              className="cursor-pointer font-label text-[10px] tracking-[2px] text-ink-muted underline underline-offset-4 disabled:opacity-50"
            >
              CANCELAR
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            className="cursor-pointer border-2 border-danger bg-transparent px-5 py-2.5 font-label text-[10px] tracking-[2px] text-danger shadow-pixel hover:bg-danger hover:text-void"
          >
            APAGAR TUDO
          </button>
        )}
      </div>
    </section>
  );
}
