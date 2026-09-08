import Link from "next/link";

import { BarraSegmentada } from "@/components/ui/BarraSegmentada";
import { plural } from "@/lib/derivados";
import type { TrilhaResumo } from "@/lib/types";

export interface Retomada {
  /** 0 a 100. */
  progresso: number;
  /** Onde o aluno parou, já formatado. */
  posicao: string;
  /** Fase em que ele retoma; sem ela, o botão leva ao mapa da trilha. */
  href?: string;
}

export function CartaoDestaque({
  trilha,
  retomada = null,
}: {
  trilha: TrilhaResumo;
  retomada?: Retomada | null;
}) {
  const concluida = retomada !== null && retomada.progresso >= 100;

  let rotulo = "Comece por aqui";
  let acao = "Começar";
  if (concluida) {
    rotulo = "Trilha concluída";
    acao = "Revisar";
  } else if (retomada) {
    rotulo = "Continuar de onde parou";
    acao = "Retomar";
  }

  const legenda =
    retomada?.posicao ??
    `${plural(trilha.total_aulas, "módulo", "módulos")} · ${plural(
      trilha.total_exercicios,
      "fase",
      "fases",
    )}`;

  return (
    <section
      aria-labelledby="destaque"
      className="halo-brand border-2 border-brand bg-panel p-6 sm:p-8"
    >
      <p className="rotulo text-ink-muted">{rotulo}</p>

      <h2 id="destaque" className="titulo mt-4 text-2xl text-ink-soft sm:text-3xl">
        {trilha.nome}
      </h2>

      <p className="mt-3 text-xs text-ink-muted">{legenda}</p>

      <div className="mt-5">
        <BarraSegmentada
          valor={retomada?.progresso ?? 0}
          segmentos={12}
          rotulo={`Progresso em ${trilha.nome}`}
        />
      </div>

      <Link
        href={retomada?.href ?? `/trilhas/${trilha.slug}`}
        className="rotulo mt-6 inline-block cursor-pointer bg-brand-strong px-8 py-3.5 text-ink-soft transition-colors hover:bg-brand"
      >
        {acao}
      </Link>
    </section>
  );
}
