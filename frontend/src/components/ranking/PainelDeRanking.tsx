"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { IconeConquista } from "@/components/conquistas/IconeConquista";
import { api } from "@/lib/api";
import { dicaDaPosicao, nomeDoMes, tempoAteFechar } from "@/lib/ranking";
import type { CriaturaDoRanking, RankingMensal } from "@/lib/types";

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

const CARTAO_DO_PODIO: Record<number, string> = {
  1: "border-[#facc15] text-[#facc15]",
  2: "border-[#cbd5e1] text-[#cbd5e1]",
  3: "border-[#d97706] text-[#d97706]",
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
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-3">
          <span className="rotulo text-brand-light">
            {ranking ? nomeDoMes(ranking.mes.inicio) : "Mês atual"}
          </span>
          <h1 className="titulo m-0 font-display text-xl leading-[1.7] text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)]">
            Ranking
          </h1>
        </div>
        {ranking ? <Contagem fechaEm={ranking.mes.fecha_em} /> : null}
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
            <MesVazio />
          ) : (
            <section aria-label="Top 10 do mês" className="flex flex-col gap-6">
              <ol className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-3">
                {carga.ranking.topo.slice(0, 3).map((linha) => (
                  <li
                    key={linha.nickname}
                    className={`flex flex-col items-center gap-3 border-4 p-5 shadow-[0_6px_0_#000] ${
                      CARTAO_DO_PODIO[linha.posicao]
                    } ${linha.voce ? "bg-brand-void" : "bg-panel"}`}
                  >
                    <span className="font-display text-lg leading-none">
                      {linha.posicao}º
                    </span>
                    <span className="flex h-16 w-16 items-center justify-center border-2 border-brand-shadow bg-panel-deep">
                      {linha.criatura?.sprite ? (
                        <Image
                          src={linha.criatura.sprite}
                          alt=""
                          width={52}
                          height={52}
                          className="block"
                        />
                      ) : null}
                    </span>
                    <span className="titulo max-w-full truncate font-display text-[12px] leading-[1.5] text-ink">
                      {linha.nickname}
                    </span>
                    <span className="font-body text-lg tracking-[1px] text-ink-body">
                      {linha.xp} XP
                    </span>
                  </li>
                ))}
              </ol>

              {carga.ranking.topo.length > 3 ? (
                <ol start={4} className="m-0 flex list-none flex-col gap-3 p-0">
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
            </section>
          )}

          <hr className="m-0 border-0 border-t-4 border-edge-soft" />

          <MinhaPosicao ranking={carga.ranking} />
        </>
      ) : null}
    </div>
  );
}

function Contagem({ fechaEm }: { fechaEm: string }) {
  const [agora, setAgora] = useState(() => new Date());

  useEffect(() => {
    const relogio = setInterval(() => setAgora(new Date()), 60_000);
    return () => clearInterval(relogio);
  }, []);

  return (
    <div className="flex items-center gap-3 border-[3px] border-edge-soft bg-panel px-4 py-3 shadow-[6px_6px_0_#000]">
      <span className="font-label text-[11px] tracking-[2px] text-ink-muted uppercase">
        Fecha em
      </span>
      <span className="font-display text-[13px] leading-none text-ink">
        {tempoAteFechar(fechaEm, agora)}
      </span>
    </div>
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
      <span className="min-w-0 flex-1 truncate font-label text-[12px] tracking-[1px] text-ink uppercase">
        {nickname}
      </span>
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
