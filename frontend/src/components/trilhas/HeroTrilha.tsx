import type { ReactNode } from "react";

import { BotaoIniciarTrilha } from "@/components/trilhas/BotaoIniciarTrilha";
import { BarraSegmentada } from "@/components/ui/BarraSegmentada";
import { plural } from "@/lib/derivados";

export function HeroTrilha({
  nome,
  slug,
  descricao,
  totalDeFases,
  // Sem fase publicada o botão some: a trilha ainda não tem por onde começar.
  primeiraFaseSlug = null,
  primeiraAulaSlug = null,
  // Conteúdo semeado não tem autor: a linha some.
  criadoPor = null,
  // Nota e alcance vêm do módulo de avaliações; sem eles o bloco não aparece.
  avaliacao = null,
  // Selo de bônus de XP, que só existe para quem está logado com criatura.
  selo = null,
}: {
  nome: string;
  slug: string;
  descricao: string;
  totalDeFases: number;
  primeiraFaseSlug?: string | null;
  primeiraAulaSlug?: string | null;
  criadoPor?: string | null;
  avaliacao?: { nota: number; total: number; emJornada: number } | null;
  selo?: ReactNode;
}) {
  return (
    <section className="animate-surgir mt-6 grid gap-6 border-[3px] border-brand bg-panel p-6 shadow-frame sm:p-8">
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="bg-brand px-3 py-1.5 font-label text-[11px] tracking-[2px] text-void uppercase">
            Grátis
          </span>
          <span className="font-label text-[11px] tracking-[2px] text-ink-muted uppercase">
            Trilha · {plural(totalDeFases, "fase", "fases")}
          </span>
          {selo}
        </div>

        <h1 className="m-0 font-display text-[17px] leading-[1.7] tracking-[1px] text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)] sm:text-[22px]">
          {nome}
        </h1>

        {criadoPor ? (
          <p className="m-0 font-label text-[11px] tracking-[2px] text-brand-light uppercase">
            Trilha criada por {criadoPor}
          </p>
        ) : null}

        <p className="m-0 max-w-prose font-body text-lg leading-[1.7] tracking-[1px] text-ink-body text-pretty">
          {descricao}
        </p>

        {avaliacao ? (
          <p className="m-0 flex flex-wrap items-center gap-3">
            <span className="font-display text-xs text-ink">
              {avaliacao.nota.toFixed(1)}
            </span>
            <BarraSegmentada
              valor={(avaliacao.nota / 5) * 100}
              segmentos={5}
              compacta
              semMoldura
            />
            <span className="font-body text-base tracking-[1px] text-ink-muted">
              {avaliacao.total.toLocaleString("pt-BR")} avaliações
            </span>
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-5">
          <BotaoIniciarTrilha
            trilhaSlug={slug}
            primeiraFaseSlug={primeiraFaseSlug}
            primeiraAulaSlug={primeiraAulaSlug}
          />
          {avaliacao ? (
            <span className="font-body text-base tracking-[1px] text-ink-muted">
              {avaliacao.emJornada.toLocaleString("pt-BR")} devs em jornada
            </span>
          ) : null}
        </div>
      </div>

    </section>
  );
}
