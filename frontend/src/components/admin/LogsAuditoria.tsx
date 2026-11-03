"use client";

import { useEffect, useState } from "react";

import { CARD } from "@/components/dashboard/CartoesNumeros";
import { api } from "@/lib/api";
import { TIPO } from "@/lib/tipografia";
import type { LogAdmin, Pagina } from "@/lib/types";

const POR_PAGINA = 10;

type Carga =
  | { tipo: "carregando" }
  | { tipo: "erro" }
  | { tipo: "pronto"; pagina: Pagina<LogAdmin> };

const BTN_PAGINA =
  "min-h-11 cursor-pointer border-2 px-4 font-label text-[11px] tracking-[2px] disabled:cursor-not-allowed disabled:opacity-40";

export function LogsAuditoria() {
  const [numero, setNumero] = useState(1);
  const [carga, setCarga] = useState<Carga>({ tipo: "carregando" });

  useEffect(() => {
    let ativo = true;
    api
      .adminLogs(numero)
      .then((pagina) => {
        if (ativo) setCarga({ tipo: "pronto", pagina });
      })
      .catch(() => {
        if (ativo) setCarga({ tipo: "erro" });
      });
    return () => {
      ativo = false;
    };
  }, [numero]);

  const total = carga.tipo === "pronto" ? carga.pagina.count : 0;
  const ultima = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <section aria-labelledby="titulo-logs" className={CARD}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="titulo-logs" className={`${TIPO.tituloSecao} m-0 text-ink`}>
          Logs de auditoria
        </h2>
        {total > 0 ? (
          <span className="font-label text-[10px] tracking-[2px] text-ink-muted">
            {total} {total === 1 ? "REGISTRO" : "REGISTROS"}
          </span>
        ) : null}
      </div>

      {carga.tipo === "carregando" ? (
        <p className={`${TIPO.etiqueta} m-0 text-ink-muted`} aria-busy="true">
          Carregando...
        </p>
      ) : null}

      {carga.tipo === "erro" ? (
        <p role="alert" className={`${TIPO.corpo} m-0 text-danger`}>
          Não foi possível carregar os logs agora.
        </p>
      ) : null}

      {carga.tipo === "pronto" && carga.pagina.results.length === 0 ? (
        <p className={`${TIPO.corpo} m-0 text-ink-muted`}>Nenhum registro ainda.</p>
      ) : null}

      {carga.tipo === "pronto" && carga.pagina.results.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b-2 border-edge-soft text-left">
                {["Quando", "Usuário", "Ação", "Detalhes"].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2.5 font-label text-[10px] font-normal tracking-[2px] text-ink-muted"
                  >
                    {h.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {carga.pagina.results.map((log) => (
                <tr key={log.id} className="border-b border-edge last:border-b-0">
                  <td className="px-3 py-2.5 font-terminal text-lg whitespace-nowrap text-ink-muted">
                    <time dateTime={log.criado_em}>[{formatarDataHora(log.criado_em)}]</time>
                  </td>
                  <td className="px-3 py-2.5 font-body text-base text-ink">{log.usuario}</td>
                  <td className="px-3 py-2.5 font-body text-base text-ink-body">
                    {log.acao_rotulo}
                  </td>
                  <td className="px-3 py-2.5 font-body text-sm text-ink-muted">
                    {log.detalhes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {ultima > 1 ? (
        <nav
          aria-label="Paginação dos logs"
          className="-mx-5 mt-2 -mb-5 flex items-center justify-between gap-4 border-t-2 border-edge-soft bg-panel-deep px-5 py-3.5"
        >
          <button
            type="button"
            onClick={() => setNumero((n) => n - 1)}
            disabled={numero === 1}
            className={`${BTN_PAGINA} border-edge-soft bg-transparent text-ink hover:border-brand`}
          >
            ‹ ANTERIOR
          </button>
          <p
            aria-live="polite"
            className="m-0 flex items-center gap-3 font-display text-[13px] leading-none"
          >
            <span className="font-label text-[10px] tracking-[2px] text-ink-muted">PÁGINA</span>
            <span className="text-ink">{doisDigitos(numero)}</span>
            <span className="text-ink-dim" aria-hidden="true">/</span>
            <span className="sr-only">de</span>
            <span className="text-ink-muted">{doisDigitos(ultima)}</span>
          </p>
          <button
            type="button"
            onClick={() => setNumero((n) => n + 1)}
            disabled={numero === ultima}
            className={`${BTN_PAGINA} border-brand-light bg-brand-strong text-ink shadow-pixel hover:bg-brand-deep`}
          >
            PRÓXIMA ›
          </button>
        </nav>
      ) : null}
    </section>
  );
}

function doisDigitos(n: number): string {
  return String(n).padStart(2, "0");
}

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
