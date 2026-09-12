import type { ReactNode } from "react";

import { BotaoIniciarTrilha } from "@/components/trilhas/BotaoIniciarTrilha";
import { BarraSegmentada } from "@/components/ui/BarraSegmentada";
import { plural } from "@/lib/derivados";

// Itens iguais para toda trilha: descrevem a plataforma, não o conteúdo.
const INCLUI = [
  "Exercícios referentes à trilha escolhida",
  "Terminal integrado com feedback na hora",
  "Projetos práticos a cada módulo",
  "XP e evolução do seu pet",
];

export function HeroTrilha({
  nome,
  slug,
  descricao,
  totalDeModulos,
  totalDeFases,
  // Sem fase publicada o botão some: a trilha ainda não tem por onde começar.
  primeiraFaseSlug = null,
  // Nota e alcance vêm do módulo de avaliações; sem eles o bloco não aparece.
  avaliacao = null,
  // Selo de bônus de XP, que só existe para quem está logado com criatura.
  selo = null,
}: {
  nome: string;
  slug: string;
  descricao: string;
  totalDeModulos: number;
  totalDeFases: number;
  primeiraFaseSlug?: string | null;
  avaliacao?: { nota: number; total: number; emJornada: number } | null;
  selo?: ReactNode;
}) {
  return (
    <section className="animate-surgir mt-6 grid gap-6 border-[3px] border-brand bg-panel p-6 shadow-frame sm:p-8 lg:grid-cols-[1fr_18rem]">
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
          />
          <span className="font-body text-base tracking-[1px] text-ink-muted">
            {avaliacao
              ? `${avaliacao.emJornada.toLocaleString("pt-BR")} devs em jornada`
              : `${plural(totalDeModulos, "módulo", "módulos")} de conteúdo próprio`}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-2 border-brand-shadow bg-panel-deep p-5">
        <h2 className="m-0 font-display text-[12px] leading-[1.7] tracking-[1px] text-ink">
          Esta trilha inclui
        </h2>
        <ul className="m-0 flex list-none flex-col p-0">
          {INCLUI.map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 border-t-2 border-edge py-3 first:border-t-0 first:pt-0"
            >
              <span
                aria-hidden="true"
                className="mt-1.5 h-2.5 w-2.5 shrink-0 bg-brand"
              />
              <span className="font-body text-base leading-[1.5] tracking-[1px] text-ink-body">
                {item}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
