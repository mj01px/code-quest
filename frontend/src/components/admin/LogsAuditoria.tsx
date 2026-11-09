"use client";

import { useEffect, useState } from "react";

import { CARD } from "@/components/dashboard/CartoesNumeros";
import { api } from "@/lib/api";
import { TIPO } from "@/lib/tipografia";
import type { LogAdmin } from "@/lib/types";

const RECENTES = 3;

type Carga =
  | { tipo: "carregando" }
  | { tipo: "erro" }
  | { tipo: "pronto"; logs: LogAdmin[] };

export function LogsAuditoria({ onVerTodos }: { onVerTodos: () => void }) {
  const [carga, setCarga] = useState<Carga>({ tipo: "carregando" });

  useEffect(() => {
    let ativo = true;
    api
      .adminLogs(1)
      .then((pagina) => {
        if (ativo)
          setCarga({ tipo: "pronto", logs: pagina.results.slice(0, RECENTES) });
      })
      .catch(() => {
        if (ativo) setCarga({ tipo: "erro" });
      });
    return () => {
      ativo = false;
    };
  }, []);

  return (
    <section aria-labelledby="titulo-logs" className={CARD}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="titulo-logs" className={`${TIPO.tituloSecao} m-0 text-ink`}>
          Últimos eventos de auditoria
        </h2>
        <button
          type="button"
          onClick={onVerTodos}
          aria-haspopup="dialog"
          className="cursor-pointer border-0 bg-transparent p-0 font-label text-[11px] tracking-[2px] text-brand-light hover:text-brand-mist"
        >
          VER TODOS &gt;
        </button>
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

      {carga.tipo === "pronto" && carga.logs.length === 0 ? (
        <p className={`${TIPO.corpo} m-0 text-ink-muted`}>
          Nenhum registro ainda.
        </p>
      ) : null}

      {carga.tipo === "pronto" && carga.logs.length > 0 ? (
        <ol className="m-0 flex list-none flex-col p-0 font-terminal text-[20px] text-ink-body">
          {carga.logs.map((log) => (
            <li
              key={log.id}
              className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-3 border-b border-edge py-2 last:border-b-0 sm:grid-cols-[140px_160px_minmax(0,1fr)]"
            >
              <time dateTime={log.criado_em} className="text-ink-muted">
                [{formatarDataHora(log.criado_em)}]
              </time>
              <span className="truncate text-ink">{log.usuario}</span>
              <span className="col-span-2 truncate sm:col-span-1">
                {log.acao_rotulo}
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
