"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { TIPO } from "@/lib/tipografia";
import type { Dashboard } from "@/lib/types";

import { CARD, CartoesNumeros } from "./CartoesNumeros";
import { GraficoAtividade } from "./GraficoAtividade";

type Carga =
  | { tipo: "carregando" }
  | { tipo: "erro" }
  | { tipo: "pronto"; dados: Dashboard };

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
          <CartoesNumeros numeros={numeros} />

          <section className={CARD}>
            <GraficoAtividade
              titulo="Atividade da semana"
              rotulo="XP por dia nos últimos 7 dias"
              dias={dados.atividade_semanal}
              series={[{ chave: "xp", cor: "#A855F7", nome: "XP" }]}
            />
          </section>
        </>
      ) : null}
    </div>
  );
}
