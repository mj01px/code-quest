import Link from "next/link";

import { BarraSegmentada } from "@/components/ui/BarraSegmentada";
import { duracaoEmHoras } from "@/lib/derivados";
import type { TrilhaResumo } from "@/lib/types";

function sigla(nome: string): string {
  const letras = nome.replace(/[^A-Za-zÀ-ÿ]/g, "");
  return (
    letras.slice(0, 1).toUpperCase() + letras.slice(1, 2).toLowerCase() || "??"
  );
}

export function TrilhaCard({
  trilha,
  // Sem progresso da gamificação, a trilha conta como não iniciada.
  progresso = null,
  // Iniciada sem fase concluída é um estado real: zero por cento, mas dentro.
  // Não dá para deduzir isso do progresso, porque ali também é zero.
  iniciada = false,
}: {
  trilha: TrilhaResumo;
  progresso?: number | null;
  iniciada?: boolean;
}) {
  const valor = progresso ?? 0;
  const horas = duracaoEmHoras(trilha.total_exercicios);

  // Em andamento, o número é a informação e a palavra é redundante: a coluna
  // mostra só o percentual, e "Em andamento" fica para o leitor de tela. Nos
  // outros estados não há número que sirva, então vale a palavra.
  let situacao: string;
  let percentual: string | null = null;
  if (trilha.total_exercicios === 0) {
    situacao = "Em breve";
  } else if (valor >= 100) {
    situacao = "Concluída";
  } else if (valor <= 0) {
    situacao = iniciada ? "Em andamento" : "Iniciar";
    percentual = iniciada ? "0%" : null;
  } else {
    situacao = "Em andamento";
    percentual = `${Math.round(valor)}%`;
  }

  // Três estados, três cores: feito em verde, em andamento no roxo da marca,
  // o resto apagado. Sem isso a lista inteira lê como uma coisa só.
  const corDaSituacao =
    trilha.total_exercicios === 0
      ? "text-ink-dim"
      : valor >= 100
        ? "text-success"
        : valor > 0 || iniciada
          ? "text-brand-light"
          : "text-ink-muted";

  return (
    <li>
      <Link
        href={`/trilhas/${trilha.slug}`}
        className="group flex cursor-pointer items-center gap-4 border-2 border-edge bg-panel p-4 shadow-pixel transition duration-150 hover:translate-x-0.5 hover:translate-y-0.5 hover:border-brand hover:shadow-pixel-sm sm:gap-5 sm:p-5"
      >
        <span
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-brand-shadow bg-panel-deep font-display text-[12px] text-brand-light"
        >
          {sigla(trilha.nome)}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-[11px] leading-[1.7] tracking-[1px] text-ink">
            {trilha.nome}
          </span>
          <span className="mt-2 block truncate font-body text-base leading-[1.4] tracking-[1px] text-ink-muted">
            {trilha.descricao}
            {trilha.total_exercicios > 0 ? ` · ${horas} h` : ""}
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-8">
          <span className="hidden w-36 sm:block">
            <BarraSegmentada
              valor={valor}
              segmentos={8}
              expandida
              alta
              rotulo={`Progresso em ${trilha.nome}`}
            />
          </span>
          <span
            className={`w-[6.5rem] text-right font-label text-[11px] leading-[1.3] tracking-[1px] uppercase ${corDaSituacao}`}
          >
            {percentual ? (
              <>
                <span aria-hidden="true">{percentual}</span>
                <span className="sr-only">{situacao}</span>
              </>
            ) : (
              situacao
            )}
          </span>
        </span>
      </Link>
    </li>
  );
}
