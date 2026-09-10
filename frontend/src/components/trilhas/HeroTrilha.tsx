import type { ReactNode } from "react";

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
  descricao,
  totalDeModulos,
  totalDeFases,
  // Nota e alcance vêm do módulo de avaliações; sem eles o bloco não aparece.
  avaliacao = null,
  // Selo de bônus de XP, que só existe para quem está logado com criatura.
  selo = null,
}: {
  nome: string;
  descricao: string;
  totalDeModulos: number;
  totalDeFases: number;
  avaliacao?: { nota: number; total: number; emJornada: number } | null;
  selo?: ReactNode;
}) {
  return (
    <section className="halo-brand animate-surgir mt-6 grid gap-6 border-2 border-brand bg-panel p-6 sm:p-8 lg:grid-cols-[1fr_18rem]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rotulo bg-brand-strong px-2.5 py-1 text-ink-soft">
            Grátis
          </span>
          <span className="rotulo text-ink-muted">
            Trilha · {plural(totalDeFases, "fase", "fases")}
          </span>
          {selo}
        </div>

        <h1 className="titulo mt-5 text-3xl text-ink-soft sm:text-4xl">{nome}</h1>

        <p className="mt-4 max-w-prose text-xs leading-relaxed text-ink-muted">
          {descricao}
        </p>

        {avaliacao ? (
          <p className="mt-5 flex flex-wrap items-center gap-3">
            <span className="titulo text-lg text-ink-soft">
              {avaliacao.nota.toFixed(1)}
            </span>
            <BarraSegmentada
              valor={(avaliacao.nota / 5) * 100}
              segmentos={5}
              compacta
              semMoldura
            />
            <span className="rotulo text-ink-muted">
              {avaliacao.total.toLocaleString("pt-BR")} avaliações
            </span>
          </p>
        ) : null}

        <p className="mt-6">
          <a
            href="#mapa-de-fases"
            className="rotulo inline-block cursor-pointer bg-brand-strong px-8 py-3.5 text-ink-soft transition duration-150 hover:translate-x-0.5 hover:bg-brand"
          >
            Iniciar trilha
          </a>
        </p>

        {avaliacao ? (
          <p className="rotulo mt-4 text-ink-muted">
            {avaliacao.emJornada.toLocaleString("pt-BR")} devs em jornada
          </p>
        ) : (
          <p className="rotulo mt-4 text-ink-muted">
            {plural(totalDeModulos, "módulo", "módulos")} de conteúdo próprio
          </p>
        )}
      </div>

      <div className="border border-brand-shadow p-5">
        <h2 className="titulo text-sm text-ink-soft">Esta trilha inclui</h2>
        <ul className="mt-4 divide-y divide-edge">
          {INCLUI.map((item) => (
            <li key={item} className="flex items-start gap-3 py-3 first:pt-0">
              <span
                aria-hidden="true"
                className="mt-1 h-2 w-2 shrink-0 bg-brand"
              />
              <span className="text-[0.6875rem] leading-relaxed text-ink-muted">
                {item}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
