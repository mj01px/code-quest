"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export function SecaoMeusDados() {
  const [baixando, setBaixando] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function exportar() {
    setBaixando(true);
    setStatus(null);
    try {
      const dados = await api.exportarDados();
      const blob = new Blob([JSON.stringify(dados, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "codequest-meus-dados.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatus("> ARQUIVO GERADO");
    } catch {
      setStatus("> NÃO FOI POSSÍVEL EXPORTAR AGORA");
    } finally {
      setBaixando(false);
    }
  }

  return (
    <section className="flex w-full max-w-[640px] flex-col gap-4">
      <h2 className="m-0 font-display text-[13px] leading-[1.7] tracking-[1px] text-ink">
        Meus dados
      </h2>

      <div className="flex flex-wrap items-center justify-between gap-4 border-2 border-edge-soft bg-panel px-6 py-5">
        <span className="flex min-w-[220px] flex-[1_1_260px] flex-col gap-1">
          <span className="font-label text-[12px] tracking-[2px] text-brand-light">
            PORTABILIDADE
          </span>
          <span className="font-body text-base leading-[1.5] tracking-[1px] text-ink-muted">
            Baixe uma cópia de tudo que guardamos sobre você: perfil, aceites,
            progresso, criaturas e atividade.
          </span>
          {status ? (
            <span className="mt-1 font-label text-[11px] tracking-[2px] text-brand-light">
              {status}
            </span>
          ) : null}
        </span>

        <button
          type="button"
          onClick={exportar}
          disabled={baixando}
          className="cursor-pointer border-2 border-brand-light bg-brand-deep px-5 py-2.5 font-label text-[10px] tracking-[2px] text-ink shadow-pixel hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
        >
          {baixando ? "GERANDO..." : "EXPORTAR MEUS DADOS"}
        </button>
      </div>
    </section>
  );
}
