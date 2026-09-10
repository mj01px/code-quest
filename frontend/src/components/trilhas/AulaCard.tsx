import Link from "next/link";

import { BadgeDificuldade } from "@/components/ui/Badge";
import { plural, resumoDoModulo, xpDoModulo } from "@/lib/derivados";
import type { Aula } from "@/lib/types";

export function AulaCard({
  aula,
  trilhaSlug,
  posicao,
  // A API devolve o pré-requisito como slug; a lista traduz para o título.
  preRequisitoTitulo,
}: {
  aula: Aula;
  trilhaSlug: string;
  posicao: number;
  preRequisitoTitulo?: string;
}) {
  const numero = String(posicao).padStart(2, "0");
  const resumo = resumoDoModulo(aula);
  const temFases = aula.exercicios.length > 0;

  const cabecalho = (
    <>
      <span
        aria-hidden="true"
        className="titulo flex h-10 w-10 shrink-0 items-center justify-center border border-brand-shadow text-xs text-brand"
      >
        {numero}
      </span>

      <span className="min-w-0 flex-1">
        <span className="rotulo block truncate text-ink-soft">
          <span className="sr-only">Módulo {posicao}: </span>
          {aula.titulo}
        </span>
        <span className="mt-1.5 block truncate text-[0.6875rem] text-ink-muted">
          {resumo ? `${resumo} · ` : ""}
          {plural(aula.exercicios.length, "fase", "fases")}
          {aula.pre_requisito
            ? ` · requer ${preRequisitoTitulo ?? aula.pre_requisito}`
            : ""}
        </span>
      </span>

      {temFases ? (
        <span className="rotulo shrink-0 text-brand">
          +{xpDoModulo(aula)} XP
        </span>
      ) : (
        <span className="rotulo shrink-0 text-ink-muted">Em breve</span>
      )}
    </>
  );

  if (!temFases) {
    return (
      <li className="flex items-center gap-4 border border-edge bg-panel p-4 sm:p-5">
        {cabecalho}
      </li>
    );
  }

  return (
    <li className="border border-edge bg-panel transition duration-150 hover:border-brand-shadow">
      <details>
        <summary className="flex cursor-pointer list-none items-center gap-4 p-4 transition-colors hover:bg-panel-soft sm:p-5 [&::-webkit-details-marker]:hidden">
          {cabecalho}
        </summary>

        <ul className="divide-y divide-edge border-t border-edge">
          {aula.exercicios.map((exercicio) => (
            <li key={exercicio.id}>
              <Link
                href={`/trilhas/${trilhaSlug}/exercicios/${exercicio.slug}`}
                className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-panel-soft sm:px-5"
              >
                <span className="text-xs text-ink-soft">{exercicio.titulo}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <BadgeDificuldade
                    dificuldade={exercicio.dificuldade}
                    rotulo={exercicio.dificuldade_label}
                  />
                  <span className="rotulo text-ink-muted">
                    {exercicio.tipo_label}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}
