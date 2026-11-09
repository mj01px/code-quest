"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { IconeConquista } from "@/components/conquistas/IconeConquista";
import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { BarraSegmentada } from "@/components/ui/BarraSegmentada";
import { api } from "@/lib/api";
import { plural } from "@/lib/derivados";
import type { ConclusaoDaTrilha } from "@/lib/types";

const ETIQUETA = "font-label text-[10px] tracking-[2px] uppercase";
const CONQUISTAS_NA_TELA = 3;

type Carga =
  | { tipo: "carregando" }
  | { tipo: "erro" }
  | { tipo: "pronto"; dados: ConclusaoDaTrilha };

function Topo() {
  return (
    <header className="flex items-center justify-between gap-4 border-b-2 border-edge px-6 py-4 sm:px-8">
      <Link
        href="/trilhas"
        className="font-display text-[18px] tracking-[1px] text-ink sm:text-[22px]"
      >
        CODEQUEST
      </Link>
      <Link
        href="/trilhas"
        className={`${ETIQUETA} text-ink-muted hover:text-brand-light`}
      >
        Trilhas ›
      </Link>
    </header>
  );
}

export function TelaQuestCompleta({ trilhaSlug }: { trilhaSlug: string }) {
  const [carga, setCarga] = useState<Carga>({ tipo: "carregando" });

  useEffect(() => {
    let ativo = true;
    api
      .conclusaoDaTrilha(trilhaSlug)
      .then((dados) => {
        if (ativo) setCarga({ tipo: "pronto", dados });
      })
      .catch(() => {
        if (ativo) setCarga({ tipo: "erro" });
      });
    return () => {
      ativo = false;
    };
  }, [trilhaSlug]);

  return (
    <div className="flex min-h-dvh flex-col bg-void">
      <Topo />
      <main className="flex flex-1 justify-center px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex w-full max-w-[560px] flex-col gap-8">
          {carga.tipo === "carregando" ? (
            <p className={`${ETIQUETA} text-ink-muted`} aria-busy="true">
              Carregando...
            </p>
          ) : null}
          {carga.tipo === "erro" ? (
            <p role="alert" className="m-0 font-body text-base text-danger">
              Não foi possível carregar o resumo da trilha agora.
            </p>
          ) : null}
          {carga.tipo === "pronto" ? <Conteudo dados={carga.dados} /> : null}
        </div>
      </main>
    </div>
  );
}

function Conteudo({ dados }: { dados: ConclusaoDaTrilha }) {
  const { criatura, progresso } = useProgresso();

  if (!dados.concluida) {
    const faltam = dados.fases_total - dados.fases_feitas;
    return (
      <section className="flex flex-col items-start gap-5 border-[3px] border-edge-soft bg-panel p-8">
        <span className={`${ETIQUETA} text-ink-muted`}>
          {dados.trilha.nome}
        </span>
        <p className="m-0 font-body text-lg leading-[1.6] text-ink-body">
          {faltam === 1 ? "Falta 1 fase" : `Faltam ${faltam} fases`} para
          completar esta quest.
        </p>
        <Link
          href={`/trilhas/${dados.trilha.slug}`}
          className={`${ETIQUETA} border-2 border-brand-light bg-brand-strong px-5 py-3 text-[11px] text-ink hover:bg-brand-deep`}
        >
          Voltar para a trilha
        </Link>
      </section>
    );
  }

  const nome = criatura?.criatura.nome ?? "Seu pet";
  const nivel = progresso?.nivel.numero ?? null;
  const faixa = progresso?.xp_para_o_proximo ?? null;
  const noNivel = progresso?.xp_no_nivel ?? 0;
  const percentual = faixa ? Math.min(100, (noNivel / faixa) * 100) : 100;
  const conquistas = dados.conquistas.slice(0, CONQUISTAS_NA_TELA);

  return (
    <>
      <section
        aria-labelledby="quest-completa"
        className="flex flex-col items-center gap-7 border-[3px] border-brand bg-panel px-6 py-10 text-center shadow-[0_0_0_3px_var(--color-brand-void),8px_8px_0_#000] sm:px-10"
      >
        <span className={`${ETIQUETA} text-brand-light`}>
          Trilha concluída · {dados.trilha.nome}
        </span>
        <h1
          id="quest-completa"
          className="m-0 font-display text-[26px] leading-[1.25] text-ink [text-shadow:3px_3px_0_var(--color-brand-strong)] sm:text-[30px]"
        >
          QUEST
          <br />
          COMPLETA
        </h1>
        <span className="flex h-44 w-44 items-center justify-center border-4 border-brand-shadow bg-panel-deep shadow-[0_0_0_3px_var(--color-brand-void)]">
          {criatura?.sprite ? (
            <Image
              src={criatura.sprite}
              alt={nome}
              width={128}
              height={128}
              className="h-32 w-32 [image-rendering:pixelated]"
            />
          ) : (
            <span className={`${ETIQUETA} text-ink-muted`}>Sem pet</span>
          )}
        </span>
        <p className="m-0 max-w-[400px] font-terminal text-[21px] leading-[1.45] text-ink-body">
          {plural(dados.fases_feitas, "fase vencida", "fases vencidas")}.
          {nivel !== null ? ` ${nome} está no nível ${nivel}.` : ""}
        </p>
        {nivel !== null ? (
          <div className="flex w-full max-w-[320px] flex-col gap-2">
            <div
              className={`${ETIQUETA} flex justify-between text-[9px] text-ink-muted`}
            >
              <span>Nível {nivel}</span>
              <span>{faixa ? `${noNivel} / ${faixa} XP` : "Nível máximo"}</span>
            </div>
            <BarraSegmentada
              valor={percentual}
              segmentos={10}
              expandida
              rotulo={
                faixa ? `Progresso para o nível ${nivel + 1}` : "Nível máximo"
              }
            />
          </div>
        ) : null}
      </section>

      <dl className="m-0 grid grid-cols-2 border-2 border-edge bg-panel sm:grid-cols-4">
        {[
          ["Fases vencidas", `${dados.fases_feitas} / ${dados.fases_total}`],
          ["XP conquistado", dados.xp.toLocaleString("pt-BR")],
          [
            "De primeira",
            dados.acerto_de_primeira === null
              ? "—"
              : `${dados.acerto_de_primeira}%`,
          ],
          ["Dias de estudo", plural(dados.dias_de_estudo, "dia", "dias")],
        ].map(([rotulo, valor]) => (
          <div
            key={rotulo}
            className="flex flex-col gap-2 border-edge p-4 [&:not(:last-child)]:border-r-2"
          >
            <dt className={`${ETIQUETA} text-[9px] text-ink-muted`}>
              {rotulo}
            </dt>
            <dd className="m-0 font-display text-[14px] text-ink">{valor}</dd>
          </div>
        ))}
      </dl>

      {conquistas.length > 0 ? (
        <section
          aria-labelledby="conquistas-da-quest"
          className="flex flex-col gap-4"
        >
          <h2
            id="conquistas-da-quest"
            className="m-0 font-display text-[13px] leading-[1.6] text-ink"
          >
            Conquistas desbloqueadas
          </h2>
          <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-3">
            {conquistas.map((conquista) => (
              <li
                key={conquista.slug}
                className="flex items-center gap-3 border-2 border-brand-shadow bg-panel p-3"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-brand-shadow bg-panel-deep">
                  <IconeConquista icone={conquista.icone} className="h-6 w-6" />
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className={`${ETIQUETA} text-[9px] text-ink`}>
                    {conquista.nome}
                  </span>
                  <span className="font-terminal text-[15px] leading-[1.2] text-ink-muted">
                    {conquista.descricao}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {dados.proxima ? (
        <section
          aria-labelledby="proxima-trilha"
          className="flex flex-wrap items-center justify-between gap-4 border-2 border-brand-shadow bg-panel px-5 py-5"
        >
          <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-2">
            <span className={`${ETIQUETA} text-[9px] text-brand-light`}>
              Próxima trilha sugerida
            </span>
            <h2
              id="proxima-trilha"
              className="m-0 font-display text-[12px] leading-[1.6] text-ink"
            >
              {dados.proxima.nome}
            </h2>
            {dados.proxima.resumo ? (
              <span className="line-clamp-2 font-terminal text-[17px] leading-[1.3] text-ink-muted">
                {dados.proxima.resumo}
              </span>
            ) : null}
            <span className={`${ETIQUETA} text-[9px] text-ink-muted`}>
              {dados.proxima.dificuldade_label}
            </span>
          </div>
          <Link
            href={`/trilhas/${dados.proxima.slug}`}
            className={`${ETIQUETA} border-2 border-brand-light px-4 py-3 text-[11px] text-brand-light hover:bg-brand-void`}
          >
            Ver trilha
          </Link>
        </section>
      ) : null}

      <Link
        href="/trilhas"
        className="flex min-h-14 items-center justify-center border-[3px] border-brand-light bg-brand-strong px-6 py-4 font-display text-[12px] tracking-[1px] text-ink uppercase shadow-[0_0_0_3px_var(--color-brand-void),6px_6px_0_#000] hover:bg-brand-deep"
      >
        Voltar às trilhas
      </Link>
    </>
  );
}
