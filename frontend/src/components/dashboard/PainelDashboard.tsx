"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { TIPO } from "@/lib/tipografia";
import type { Dashboard } from "@/lib/types";

import { GraficoAtividade } from "./GraficoAtividade";

type Carga =
  | { tipo: "carregando" }
  | { tipo: "erro" }
  | { tipo: "pronto"; dados: Dashboard };

const CARD = "flex flex-col gap-3 border-[3px] border-edge-soft bg-panel p-5 shadow-[6px_6px_0_#000]";

export function PainelDashboard() {
  const [carga, setCarga] = useState<Carga>({ tipo: "carregando" });

  useEffect(() => {
    let ativo = true;
    api
      .meuDashboard()
      .then((dados) => {
        if (ativo) setCarga({ tipo: "pronto", dados });
      })
      .catch(() => {
        if (ativo) setCarga({ tipo: "erro" });
      });
    return () => {
      ativo = false;
    };
  }, []);

  const dados = carga.tipo === "pronto" ? carga.dados : null;
  const numeros = dados
    ? [
      { rotulo: "XP TOTAL", valor: dados.xp_total },
      { rotulo: "EXERCÍCIOS", valor: dados.exercicios_concluidos },
      {
        rotulo: "SEQUÊNCIA",
        valor: dados.sequencia_atual,
        sufixo: dados.sequencia_atual === 1 ? "dia" : "dias",
      },
      { rotulo: "TRILHAS", valor: dados.trilhas_iniciadas },
    ]
    : [];

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <span className={`${TIPO.sobretitulo} text-brand-light`}>RESUMO</span>
        <h1 className={`${TIPO.tituloPagina} m-0 text-ink`}>Dashboard</h1>
      </header>

      {carga.tipo === "carregando" ? (
        <p className={`${TIPO.etiqueta} text-ink-muted`} aria-busy="true">
          Carregando...
        </p>
      ) : null}

      {carga.tipo === "erro" ? (
        <section
          role="alert"
          className="border-2 border-dashed border-edge-soft bg-panel p-8 text-center"
        >
          <p className={`${TIPO.corpo} text-ink-muted`}>
            Não foi possível carregar o dashboard agora. Recarregue a página.
          </p>
        </section>
      ) : null}

      {dados ? (
        <>
          <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 xl:grid-cols-4">
            {numeros.map((n) => (
              <li key={n.rotulo} className={CARD}>
                <span className={`${TIPO.etiqueta} text-ink-muted`}>{n.rotulo}</span>
                <span className="font-display text-[28px] leading-none text-ink">
                  {n.valor.toLocaleString("pt-BR")}
                  {n.sufixo ? (
                    <span className={`${TIPO.etiqueta} ml-2 text-brand-light`}>
                      {n.sufixo}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>

          <section className={CARD}>
            <h2 className={`${TIPO.tituloSecao} m-0 text-ink`}>
              Atividade da semana
            </h2>
            <GraficoAtividade dias={dados.atividade_semanal} />
          </section>
        </>
      ) : null}
    </div>
  );
}
