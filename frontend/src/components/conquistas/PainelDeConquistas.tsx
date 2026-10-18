"use client";

import { useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import {
  chaveDaConquista,
  colunasDoMapa,
  montarMapa,
  resumir,
} from "@/lib/conquistas";
import type { Conquista } from "@/lib/types";

import { BLOCO, NOME, estadoDa } from "./estilos";
import { IconeConquista } from "./IconeConquista";
import { ModalConquista } from "./ModalConquista";

type Carga =
  | { tipo: "carregando" }
  | { tipo: "erro" }
  | { tipo: "pronto"; conquistas: Conquista[] };

export function PainelDeConquistas() {
  const [carga, setCarga] = useState<Carga>({ tipo: "carregando" });

  useEffect(() => {
    let ativo = true;
    api
      .minhasConquistas()
      .then((conquistas) => {
        if (ativo) setCarga({ tipo: "pronto", conquistas });
      })
      .catch(() => {
        if (ativo) setCarga({ tipo: "erro" });
      });
    return () => {
      ativo = false;
    };
  }, []);

  const resumo = carga.tipo === "pronto" ? resumir(carga.conquistas) : null;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-3">
          <span className="rotulo text-brand-light">Mundo 1 · Jornada</span>
          <h1 className="titulo m-0 font-display text-xl leading-[1.7] text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)]">
            Conquistas
          </h1>
        </div>
        {resumo ? (
          <div
            aria-label={`${resumo.desbloqueadas} de ${resumo.total} conquistas desbloqueadas`}
            className="flex items-center gap-3 border-[3px] border-edge-soft bg-panel px-4 py-3 shadow-[6px_6px_0_#000]"
          >
            <IconeConquista icone="seta" className="h-6 w-6 text-success" />
            <span className="font-display text-[15px] leading-none text-ink">
              {resumo.desbloqueadas}
              <span className="text-ink-dim">/{resumo.total}</span>
            </span>
          </div>
        ) : null}
      </header>

      {carga.tipo === "carregando" ? (
        <p className="rotulo text-ink-muted" aria-busy="true">
          Carregando...
        </p>
      ) : null}

      {carga.tipo === "erro" ? (
        <section
          role="alert"
          className="border-2 border-dashed border-edge-soft bg-panel p-8 text-center"
        >
          <p className="font-body text-base text-ink-muted">
            Não foi possível carregar as conquistas agora. Recarregue a página.
          </p>
        </section>
      ) : null}

      {carga.tipo === "pronto" ? (
        <MapaDeConquistas conquistas={carga.conquistas} />
      ) : null}
    </div>
  );
}

function useLargura<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [largura, setLargura] = useState(0);

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento) return;
    setLargura(elemento.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const observador = new ResizeObserver(([entrada]) => {
      setLargura(entrada.contentRect.width);
    });
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  return [ref, largura] as const;
}

function MapaDeConquistas({ conquistas }: { conquistas: Conquista[] }) {
  const [ref, largura] = useLargura<HTMLDivElement>();
  const [aberta, setAberta] = useState<number | null>(null);
  const mapa = montarMapa(conquistas, colunasDoMapa(largura));
  const selecionada = aberta === null ? null : conquistas[aberta];

  return (
    <>
      <div
        ref={ref}
        className="relative w-full border-2 border-edge bg-void bg-[radial-gradient(#1d1a29_2px,transparent_2px)] bg-[size:32px_32px]"
        style={{ height: mapa.altura + 32 }}
      >
        {mapa.pontos.map((ponto, indice) => (
          <span
            key={`p-${indice}`}
            aria-hidden="true"
            className={`absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 ${
              ponto.aceso ? "bg-brand" : "bg-[#2a2536]"
            }`}
            style={{ left: `${ponto.esquerda}%`, top: ponto.topo + 16 }}
          />
        ))}

        <ol className="m-0 list-none p-0">
          {conquistas.map((conquista, indice) => {
            const estado = estadoDa(conquista);
            const posicao = mapa.posicoes[indice];
            return (
              <li
                key={chaveDaConquista(conquista, indice)}
                className="absolute flex w-[150px] -translate-x-1/2 flex-col items-center gap-3"
                style={{ left: `${posicao.esquerda}%`, top: posicao.topo + 16 - 44 }}
              >
                <button
                  type="button"
                  onClick={() => setAberta(indice)}
                  aria-label={`${conquista.nome}, ${
                    conquista.desbloqueada ? "desbloqueada" : "bloqueada"
                  }. Ver detalhes`}
                  className={`relative flex h-[88px] w-[88px] cursor-pointer items-center justify-center transition-transform hover:-translate-y-1 focus-visible:-translate-y-1 ${BLOCO[estado]}`}
                >
                  <IconeConquista
                    icone={conquista.icone}
                    className={estado === "oculta" ? "h-11 w-11" : "h-12 w-12"}
                  />
                  {conquista.desbloqueada ? (
                    <span
                      aria-hidden="true"
                      className="absolute -top-2.5 -right-2.5 flex h-[22px] w-[22px] items-center justify-center border-[3px] border-void bg-success"
                    >
                      <svg
                        viewBox="0 0 16 16"
                        width="12"
                        height="12"
                        fill="none"
                        stroke="var(--color-void)"
                        strokeWidth="3"
                      >
                        <path d="M3 8l3 3 7-7" />
                      </svg>
                    </span>
                  ) : null}
                </button>
                <span
                  className={`text-center font-label text-[11px] leading-[1.35] tracking-[1px] uppercase ${NOME[estado]}`}
                >
                  {conquista.nome}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {selecionada ? (
        <ModalConquista
          conquista={selecionada}
          onFechar={() => setAberta(null)}
        />
      ) : null}
    </>
  );
}
