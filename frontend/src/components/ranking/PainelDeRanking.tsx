"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { IconeConquista } from "@/components/conquistas/IconeConquista";
import { api } from "@/lib/api";
import { dicaDaPosicao, nomeDoMes, rotaDoPerfil, tempoAteFechar } from "@/lib/ranking";
import type { CriaturaDoRanking, LinhaDoRanking, RankingMensal } from "@/lib/types";

type Carga =
  | { tipo: "carregando" }
  | { tipo: "erro" }
  | { tipo: "pronto"; ranking: RankingMensal };

// ouro, prata e bronze, na ordem das posições
const MEDALHA: Record<number, string> = {
  1: "text-[#facc15]",
  2: "text-[#cbd5e1]",
  3: "text-[#d97706]",
};

const DEGRAU: Record<
  number,
  { ordem: string; base: string; sprite: number; cartao: string; moldura: string; texto: string }
> = {
  1: {
    ordem: "md:order-2",
    base: "pb-16",
    sprite: 72,
    cartao: "border-[#facc15] bg-[#facc15]/10",
    moldura: "border-[#facc15]",
    texto: "text-[#facc15]",
  },
  2: {
    ordem: "md:order-1",
    base: "pb-10",
    sprite: 52,
    cartao: "border-[#cbd5e1] bg-[#cbd5e1]/5",
    moldura: "border-[#cbd5e1]/70",
    texto: "text-[#cbd5e1]",
  },
  3: {
    ordem: "md:order-3",
    base: "pb-6",
    sprite: 52,
    cartao: "border-[#d97706] bg-[#d97706]/5",
    moldura: "border-[#d97706]/70",
    texto: "text-[#d97706]",
  },
};

export function PainelDeRanking() {
  const [carga, setCarga] = useState<Carga>({ tipo: "carregando" });

  useEffect(() => {
    let ativo = true;
    api
      .rankingMensal()
      .then((ranking) => {
        if (ativo) setCarga({ tipo: "pronto", ranking });
      })
      .catch(() => {
        if (ativo) setCarga({ tipo: "erro" });
      });
    return () => {
      ativo = false;
    };
  }, []);

  const ranking = carga.tipo === "pronto" ? carga.ranking : null;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col items-center gap-4 text-center">
        <span className="font-label text-[11px] tracking-[4px] text-brand uppercase">
          {"// RANKING"}
        </span>
        <h1 className="titulo m-0 font-display text-2xl leading-[1.5] text-ink [text-shadow:3px_3px_0_var(--color-brand-dark)]">
          Ranking
        </h1>
        <p className="m-0 font-body text-lg tracking-[1px] text-ink-body">
          Os codificadores mais lendários e seus companheiros no topo.
          <span
            aria-hidden="true"
            className="ml-2 inline-block h-4 w-2.5 bg-brand-light align-middle animate-blink"
          />
        </p>
        <span className="rotulo mt-2 text-brand-light">
          {ranking ? nomeDoMes(ranking.mes.inicio) : "Mês atual"}
        </span>
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
            Não foi possível carregar o ranking agora. Recarregue a página.
          </p>
        </section>
      ) : null}

      {carga.tipo === "pronto" ? (
        <>
          {carga.ranking.topo.length === 0 ? (
            <div className="flex flex-col gap-3">
              <Contagem fechaEm={carga.ranking.mes.fecha_em} />
              <MesVazio />
            </div>
          ) : (
            <section aria-label="Top 10 do mês" className="flex flex-col gap-6">
              <Podio linhas={carga.ranking.topo.slice(0, 3)} />

              <div className="flex flex-col gap-3">
                <Contagem fechaEm={carga.ranking.mes.fecha_em} />
                {carga.ranking.topo.length > 3 ? (
                  <ol
                    start={4}
                    className="m-0 flex list-none flex-col gap-3 p-0"
                  >
                    {carga.ranking.topo.slice(3).map((linha) => (
                      <li key={linha.nickname}>
                        <Linha
                          posicao={linha.posicao}
                          nickname={linha.nickname}
                          xp={linha.xp}
                          criatura={linha.criatura}
                          destaque={linha.voce}
                        />
                      </li>
                    ))}
                  </ol>
                ) : null}
              </div>
            </section>
          )}

          <hr className="m-0 border-0 border-t-4 border-edge-soft" />

          <MinhaPosicao ranking={carga.ranking} />
        </>
      ) : null}
    </div>
  );
}

function Podio({ linhas }: { linhas: LinhaDoRanking[] }) {
  return (
    <ol className="m-0 grid list-none grid-cols-1 items-end gap-4 p-0 md:grid-cols-[1fr_1.15fr_1fr]">
      {linhas.map((linha) => {
        const lider = linha.posicao === 1;
        const degrau = DEGRAU[linha.posicao];
        return (
          <li
            key={linha.nickname}
            className={`flex flex-col items-center gap-3 border-4 px-5 pt-6 shadow-[6px_6px_0_#000] ${degrau.ordem} ${degrau.base} ${degrau.cartao}`}
          >
            <span
              className={`flex items-center justify-center border-2 bg-panel-deep ${degrau.moldura} ${
                lider ? "h-28 w-28" : "h-20 w-20"
              }`}
            >
              {linha.criatura?.sprite ? (
                <Image
                  src={linha.criatura.sprite}
                  alt=""
                  width={degrau.sprite}
                  height={degrau.sprite}
                  className="block"
                />
              ) : null}
            </span>
            {lider ? (
              <span className="bg-[#facc15] px-3 py-1 font-label text-[10px] tracking-[2px] text-panel-deep uppercase">
                MVP do mês
              </span>
            ) : null}
            <span
              className={`font-display leading-none [text-shadow:2px_2px_0_#000] ${degrau.texto} ${
                lider ? "text-xl" : "text-base"
              }`}
            >
              #{linha.posicao}
            </span>
            <Link
              href={rotaDoPerfil(linha.nickname)}
              className="max-w-full truncate font-label text-[12px] tracking-[3px] text-ink uppercase hover:text-brand-light hover:underline focus-visible:text-brand-light focus-visible:underline"
            >
              {linha.nickname}
            </Link>
            <span
              className={`font-label text-[10px] tracking-[2px] uppercase ${degrau.texto}`}
            >
              {linha.criatura ? `${linha.criatura.nome} · ` : ""}
              {linha.xp} XP
            </span>
            {linha.voce ? (
              <span className="border-2 border-brand-light px-2 py-0.5 font-label text-[10px] tracking-[2px] text-brand-light uppercase">
                Você
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function Contagem({ fechaEm }: { fechaEm: string }) {
  const [agora, setAgora] = useState(() => new Date());

  useEffect(() => {
    const relogio = setInterval(() => setAgora(new Date()), 60_000);
    return () => clearInterval(relogio);
  }, []);

  return (
    <p className="m-0 self-end font-label text-[10px] tracking-[2px] text-ink-muted uppercase">
      Fecha em{" "}
      <span className="text-brand-light">{tempoAteFechar(fechaEm, agora)}</span>
    </p>
  );
}

function MesVazio() {
  return (
    <section className="flex flex-col items-center gap-4 border-2 border-dashed border-edge-soft bg-panel p-10 text-center">
      <IconeConquista icone="podio" className="h-12 w-12 text-brand" />
      <p className="m-0 font-body text-lg text-ink-body">
        Ninguém pontuou neste mês ainda.
      </p>
      <p className="m-0 font-body text-base text-ink-muted">
        Conclua um exercício e seja o primeiro do ranking.
      </p>
    </section>
  );
}

function Linha({
  posicao,
  nickname,
  xp,
  criatura,
  destaque = false,
}: {
  posicao: number | null;
  nickname: string;
  xp: number;
  criatura: CriaturaDoRanking | null;
  destaque?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-4 border-4 px-4 py-3 shadow-[0_4px_0_#000] ${
        destaque ? "border-brand-light bg-brand-void" : "border-edge-soft bg-panel"
      }`}
    >
      <span
        className={`w-12 shrink-0 font-display text-[14px] ${
          (posicao !== null && MEDALHA[posicao]) || "text-ink-muted"
        }`}
      >
        {posicao === null ? "-" : `${posicao}º`}
      </span>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-brand-shadow bg-panel-deep">
        {criatura?.sprite ? (
          <Image src={criatura.sprite} alt="" width={32} height={32} className="block" />
        ) : null}
      </span>
      <Link
        href={rotaDoPerfil(nickname)}
        className="min-w-0 flex-1 truncate font-label text-[12px] tracking-[1px] text-ink uppercase hover:text-brand-light hover:underline focus-visible:text-brand-light focus-visible:underline"
      >
        {nickname}
      </Link>
      <span className="shrink-0 font-body text-lg text-ink-body">{xp} XP</span>
    </div>
  );
}

function MinhaPosicao({ ranking }: { ranking: RankingMensal }) {
  const { voce } = ranking;

  return (
    <section aria-labelledby="titulo-minha-posicao" className="flex flex-col gap-3">
      <h2
        id="titulo-minha-posicao"
        className="m-0 font-label text-[12px] tracking-[2px] text-brand-light uppercase"
      >
        Sua posição
      </h2>
      <Linha
        posicao={voce.posicao}
        nickname={voce.nickname}
        xp={voce.xp}
        criatura={voce.criatura}
        destaque
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 font-body text-base text-ink-muted">{dicaDaPosicao(voce)}</p>
        {voce.podios > 0 ? (
          <span
            className="flex items-center gap-2 font-label text-[11px] tracking-[1px] text-ink-muted uppercase"
            aria-label={`${voce.podios} no pódio, ${voce.vitorias} em 1º`}
          >
            <IconeConquista icone="podio" className="h-4 w-4 text-[#facc15]" />
            {voce.podios} pódio{voce.podios > 1 ? "s" : ""}
            {voce.vitorias > 0 ? (
              <>
                <IconeConquista icone="coroa" className="h-4 w-4 text-[#facc15]" />
                {voce.vitorias}
              </>
            ) : null}
          </span>
        ) : null}
      </div>
    </section>
  );
}
