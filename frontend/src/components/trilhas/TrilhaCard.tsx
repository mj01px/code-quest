import Link from "next/link";

import { BarraSegmentada } from "@/components/ui/BarraSegmentada";
import { duracaoEmHoras } from "@/lib/derivados";
import type { TrilhaResumo } from "@/lib/types";

function sigla(nome: string): string {
  const letras = nome.replace(/[^A-Za-zÀ-ÿ]/g, "");
  return (letras.slice(0, 1).toUpperCase() + letras.slice(1, 2).toLowerCase()) || "??";
}

export function TrilhaCard({
  trilha,
  // Sem progresso da gamificação, a trilha conta como não iniciada.
  progresso = null,
}: {
  trilha: TrilhaResumo;
  progresso?: number | null;
}) {
  const valor = progresso ?? 0;
  const horas = duracaoEmHoras(trilha.total_exercicios);

  // A coluna da direita é estreita no Figma: "Em andamento" não cabe, então o
  // percentual faz o papel dela na tela e a palavra fica para o leitor de tela.
  let situacao: string;
  let compacto: string;
  if (trilha.total_exercicios === 0) {
    situacao = "Em breve";
    compacto = situacao;
  } else if (valor >= 100) {
    situacao = "Concluída";
    compacto = situacao;
  } else if (valor <= 0) {
    situacao = "Iniciar";
    compacto = situacao;
  } else {
    situacao = "Em andamento";
    compacto = `${Math.round(valor)}%`;
  }

  return (
    <li>
      <Link
        href={`/trilhas/${trilha.slug}`}
        className="group flex cursor-pointer items-center gap-4 border border-edge bg-panel p-4 transition duration-150 hover:-translate-y-0.5 hover:border-brand hover:bg-panel-soft hover:shadow-pixel sm:gap-6 sm:p-5"
      >
        <span
          aria-hidden="true"
          className="titulo flex h-11 w-11 shrink-0 items-center justify-center border border-brand-shadow text-sm text-brand transition duration-150 group-hover:scale-105 group-hover:border-brand"
        >
          {sigla(trilha.nome)}
        </span>

        <span className="min-w-0 flex-1">
          <span className="titulo block truncate text-sm text-ink-soft">
            {trilha.nome}
          </span>
          <span className="mt-1.5 block truncate text-[0.6875rem] text-ink-muted">
            {trilha.descricao}
            {trilha.total_exercicios > 0 ? ` · ${horas} h` : ""}
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-4">
          <span className="hidden sm:inline-flex">
            <BarraSegmentada
              valor={valor}
              segmentos={8}
              compacta
              rotulo={`Progresso em ${trilha.nome}`}
            />
          </span>
          <span
            className={`rotulo w-[4.5rem] text-right ${
              valor >= 100 && trilha.total_exercicios > 0
                ? "text-success"
                : "text-ink-muted"
            }`}
          >
            <span aria-hidden="true">{compacto}</span>
            <span className="sr-only">{situacao}</span>
          </span>
        </span>
      </Link>
    </li>
  );
}
