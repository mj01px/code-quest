"use client";

import Image from "next/image";
import Link from "next/link";

import { ConteudoDaLicao } from "@/components/licao/ConteudoDaLicao";
import { ContadorExpiracao } from "@/components/desafios/ContadorExpiracao";
import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { type Desafio, rotuloDoProximo } from "@/lib/desafios";
import { estaConcluida } from "@/lib/progresso";
import type { ProximoDesafio } from "@/lib/types";

const ETIQUETA = "font-label text-[11px] tracking-[2px] uppercase";

function resumoDoEnunciado(enunciado: string | undefined): string {
  if (!enunciado) return "";
  return enunciado.split(/\n\s*\n/)[0]?.trim() ?? "";
}

export function PainelDeDesafios({
  desafio,
  proximos,
  dia,
}: {
  desafio: Desafio;
  proximos: ProximoDesafio[];
  dia: string;
}) {
  const { chaves, criatura } = useProgresso();
  const concluido = estaConcluida(chaves, desafio.trilhaSlug, desafio.slug);
  const resumo = resumoDoEnunciado(desafio.enunciado);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex flex-col gap-2.5">
          <span className={`${ETIQUETA} text-brand`}>
            {"// Desafio do dia"}
          </span>
          <span className={`${ETIQUETA} text-ink-muted`}>{dia}</span>
        </div>
        <ContadorExpiracao
          rotulo={concluido ? "O próximo chega em" : "Próximo em"}
        />
      </div>

      <section
        aria-labelledby="desafio-hoje"
        className={`relative flex min-h-[360px] flex-col gap-6 border-[3px] bg-panel px-6 py-9 sm:px-12 sm:py-11 ${
          concluido
            ? "border-success shadow-[0_0_0_3px_#0f3d27,10px_10px_0_#000]"
            : "border-brand shadow-[0_0_0_3px_var(--color-brand-void),10px_10px_0_#000]"
        }`}
      >
        {concluido ? (
          <span
            className={`${ETIQUETA} inline-flex items-center gap-2 self-start border-2 border-success bg-[#0f3d27] px-2.5 py-1 text-[10px] text-ink`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              width="11"
              height="11"
              fill="none"
              stroke="var(--color-success)"
              strokeWidth="3"
            >
              <path d="M3 8l3 3 7-7" />
            </svg>
            Cumprido · +{desafio.xp} XP
          </span>
        ) : (
          <span className={`${ETIQUETA} text-ink-body`}>
            {desafio.moduloTitulo} · {desafio.dificuldadeLabel} ·{" "}
            <span className="text-brand-light">+{desafio.xp} XP</span>
          </span>
        )}

        <h1
          id="desafio-hoje"
          className="m-0 max-w-[760px] font-display text-[22px] leading-[1.5] text-ink [text-shadow:4px_4px_0_var(--color-brand-shadow)] sm:text-[32px]"
        >
          {desafio.titulo}
        </h1>

        {resumo ? (
          <div className="max-w-[640px] text-ink-body sm:pr-40">
            <ConteudoDaLicao markdown={resumo} tamanho="medio" />
          </div>
        ) : null}

        {concluido ? (
          <Link
            href={desafio.href}
            className={`${ETIQUETA} inline-flex min-h-11 items-center self-start border-2 border-edge-soft px-6 py-4 text-[12px] text-brand-light hover:border-brand hover:text-brand-mist`}
          >
            Revisar desafio
          </Link>
        ) : (
          <Link
            href={desafio.href}
            className="inline-flex min-h-11 items-center self-start border-[3px] border-brand-light bg-brand-strong px-7 py-[18px] font-display uppercase text-[12px] leading-[1.6] tracking-[1px] text-ink shadow-[0_0_0_3px_var(--color-brand-void),6px_6px_0_#000] hover:bg-brand-deep"
          >
            Encarar desafio ›
          </Link>
        )}

        {criatura?.sprite ? (
          <Image
            src={criatura.sprite}
            alt=""
            width={150}
            height={150}
            className="pointer-events-none absolute right-10 bottom-7 hidden h-[150px] w-[150px] [image-rendering:pixelated] sm:block"
          />
        ) : null}
      </section>

      {proximos.length > 0 ? (
        <section aria-labelledby="proximos" className="flex flex-col gap-3.5">
          <h2
            id="proximos"
            className={`${ETIQUETA} m-0 font-normal text-ink-muted`}
          >
            Nos próximos dias
          </h2>
          <ol className="m-0 grid list-none grid-cols-2 gap-3 p-0 lg:grid-cols-4">
            {proximos.map((proximo, posicao) => (
              <li
                key={proximo.dia}
                className="flex flex-col gap-2 border-2 border-edge bg-panel px-4 py-3.5"
              >
                <span className={`${ETIQUETA} text-[10px] text-ink-muted`}>
                  {rotuloDoProximo(proximo.dia, posicao)}
                </span>
                <span className="font-body text-[15px] text-ink-body">
                  {proximo.titulo}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
