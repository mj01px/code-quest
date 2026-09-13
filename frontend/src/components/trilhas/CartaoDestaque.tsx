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
      className="animate-surgir border-[3px] border-brand bg-panel p-6 shadow-frame sm:p-8"
    >
      <div className="flex flex-col gap-4">
        <p className="font-label text-[11px] tracking-[2px] text-brand-light uppercase">
          {rotulo}
        </p>

        <h2
          id="destaque"
          className="m-0 font-display text-[15px] leading-[1.7] tracking-[1px] text-ink [text-shadow:2px_2px_0_var(--color-brand-dark)] sm:text-[20px]"
        >
          {trilha.nome}
        </h2>

        <p className="m-0 flex items-center gap-2 font-body text-lg leading-[1.6] tracking-[1px] text-ink-body">
          <span>{legenda}</span>
          {/* Cursor de terminal: a tela inteira imita um console, e é ele que
              diz que a linha está viva. Decorativo. */}
          <span
            aria-hidden="true"
            className="animate-blink inline-block h-4 w-2 shrink-0 bg-brand"
          />
        </p>

        <div className="max-w-[24rem]">
          <BarraSegmentada
            valor={retomada?.progresso ?? 0}
            segmentos={10}
            expandida
            alta
            rotulo={`Progresso em ${trilha.nome}`}
          />
        </div>

        <Link
          href={retomada?.href ?? `/trilhas/${trilha.slug}`}
          className="mt-2 cursor-pointer self-start border-[3px] border-brand-light bg-brand-deep px-6 py-4 font-display text-xs leading-[1.7] tracking-[1px] text-ink uppercase shadow-[0_0_0_3px_var(--color-brand-void),4px_4px_0_rgba(0,0,0,0.7)] transition duration-150 hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-brand-strong hover:shadow-[0_0_0_3px_var(--color-brand-void),2px_2px_0_rgba(0,0,0,0.7)]"
        >
          {acao}
        </Link>
      </div>
    </section>
  );
}
