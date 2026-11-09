"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import {
  rotuloDoTipo,
  useDecisaoDeAutoria,
} from "@/components/admin/AprovacoesAutoria";
import { api } from "@/lib/api";
import { TIPO } from "@/lib/tipografia";
import type { SolicitacaoAdmin } from "@/lib/types";

const BOTAO =
  "min-h-10 cursor-pointer border-2 bg-transparent px-3.5 font-label text-[11px] tracking-[2px] uppercase transition-colors duration-150";

type Carga =
  | { tipo: "carregando" }
  | { tipo: "erro" }
  | { tipo: "pronto"; pedidos: SolicitacaoAdmin[] };

export function tempoDesde(iso: string, agora: Date = new Date()): string {
  const minutos = Math.max(
    0,
    Math.floor((agora.getTime() - new Date(iso).getTime()) / 60000),
  );
  if (minutos < 60) return minutos <= 1 ? "agora" : `há ${minutos} minutos`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return horas === 1 ? "há 1 hora" : `há ${horas} horas`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? "há 1 dia" : `há ${dias} dias`;
}

function primeiraLinha(texto: string): string {
  return (
    texto
      .split("\n")
      .find((l) => l.trim() !== "")
      ?.trim() ?? ""
  );
}

export function PedidosPendentes({
  onVerPedido,
}: {
  onVerPedido: (id: number) => void;
}) {
  const [carga, setCarga] = useState<Carga>({ tipo: "carregando" });
  const { abrir, modal } = useDecisaoDeAutoria((id) =>
    setCarga((atual) =>
      atual.tipo === "pronto"
        ? { tipo: "pronto", pedidos: atual.pedidos.filter((p) => p.id !== id) }
        : atual,
    ),
  );

  useEffect(() => {
    let ativo = true;
    api
      .adminSolicitacoes()
      .then((pedidos) => {
        if (ativo) setCarga({ tipo: "pronto", pedidos });
      })
      .catch(() => {
        if (ativo) setCarga({ tipo: "erro" });
      });
    return () => {
      ativo = false;
    };
  }, []);

  if (carga.tipo === "carregando") return null;

  if (carga.tipo === "erro") {
    return (
      <p role="alert" className={`${TIPO.corpo} m-0 text-danger`}>
        Não foi possível carregar as solicitações de autor.
      </p>
    );
  }

  const { pedidos } = carga;

  if (pedidos.length === 0) {
    return (
      <section
        aria-label="Precisa da sua atenção"
        className="flex items-center gap-3 border-2 border-dashed border-edge-soft bg-panel px-5 py-4"
      >
        <span className="h-2.5 w-2.5 bg-success" aria-hidden="true" />
        <span className="font-label text-[11px] tracking-[2px] text-ink-muted uppercase">
          Nenhuma solicitação pendente
        </span>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="atencao"
      className="flex flex-col border-[3px] border-brand bg-panel shadow-[0_0_0_3px_var(--color-brand-void),8px_8px_0_#000]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-edge px-5 py-4 sm:px-6">
        <h2 id="atencao" className={`${TIPO.tituloSecao} m-0 text-ink`}>
          Precisa da sua atenção
        </h2>
        <span className="border-2 border-brand-light bg-brand-strong px-2.5 py-1 font-label text-[10px] tracking-[2px] text-ink">
          {pedidos.length} {pedidos.length === 1 ? "PENDENTE" : "PENDENTES"}
        </span>
      </div>
      <ul className="m-0 list-none p-0">
        {pedidos.map((pedido) => {
          const { solicitante } = pedido;
          return (
            <li
              key={pedido.id}
              className="flex flex-wrap items-center gap-4 border-b-2 border-edge px-5 py-4 last:border-b-0 sm:px-6"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center border-2 border-brand-shadow bg-panel-deep">
                {solicitante.criatura?.sprite ? (
                  <Image
                    src={solicitante.criatura.sprite}
                    alt={solicitante.criatura.nome}
                    width={46}
                    height={46}
                    className="h-[46px] w-[46px] [image-rendering:pixelated]"
                  />
                ) : (
                  <span className="font-display text-[10px] text-brand-light">
                    {solicitante.nickname.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </span>
              <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-1.5">
                <p className="m-0 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 font-label text-[11px] tracking-[1px] uppercase">
                  <span className="font-display text-[11px] normal-case text-ink">
                    {solicitante.nickname}
                  </span>
                  {solicitante.nivel ? (
                    <span className="text-ink-muted">
                      NV {solicitante.nivel}
                    </span>
                  ) : null}
                  <span className="text-ink-muted">· Quer criar</span>
                  <span className="border-2 border-brand-shadow bg-brand-void px-2 py-0.5 text-brand-mist">
                    {rotuloDoTipo(pedido.tipo_pretendido)}
                  </span>
                  <span className="text-ink-dim">
                    ·{" "}
                    <time dateTime={pedido.criado_em}>
                      {tempoDesde(pedido.criado_em)}
                    </time>
                  </span>
                </p>
                <p className="m-0 truncate font-body text-[15px] leading-[1.5] text-ink-body">
                  “{primeiraLinha(pedido.carta_apresentacao)}”
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onVerPedido(pedido.id)}
                  aria-haspopup="dialog"
                  className="min-h-10 cursor-pointer border-0 bg-transparent px-1.5 font-label text-[11px] tracking-[2px] text-brand-light uppercase hover:text-brand-mist"
                >
                  Ver pedido
                </button>
                <button
                  type="button"
                  onClick={() => abrir("rejeitar", pedido)}
                  aria-label={`Recusar: ${solicitante.nickname}`}
                  className={`${BOTAO} border-danger text-danger hover:bg-danger-deep`}
                >
                  Recusar
                </button>
                <button
                  type="button"
                  onClick={() => abrir("aprovar", pedido)}
                  aria-label={`Aprovar: ${solicitante.nickname}`}
                  className={`${BOTAO} border-success text-success hover:bg-panel-deep`}
                >
                  Aprovar
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {modal}
    </section>
  );
}
