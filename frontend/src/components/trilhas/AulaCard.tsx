import Link from "next/link";

import { BadgeDificuldade } from "@/components/ui/Badge";
import { IconeCheck } from "@/components/ui/Icone";
import { plural, resumoDoModulo, xpDoModulo } from "@/lib/derivados";
import type { Aula } from "@/lib/types";

const VAZIO: ReadonlySet<string> = Object.freeze(new Set<string>());

export function AulaCard({
  aula,
  trilhaSlug,
  posicao,
  // A API devolve o pré-requisito como slug; a lista traduz para o título.
  preRequisitoTitulo,
  // Slugs das fases deste módulo que o aluno já concluiu. Vem vazio no render
  // do servidor e no de quem não tem sessão: o card só ganha a marca depois.
  fasesConcluidas = VAZIO,
}: {
  aula: Aula;
  trilhaSlug: string;
  posicao: number;
  preRequisitoTitulo?: string;
  fasesConcluidas?: ReadonlySet<string>;
}) {
  const numero = String(posicao).padStart(2, "0");
  const resumo = resumoDoModulo(aula);
  const temFases = aula.exercicios.length > 0;
  const feitas = aula.exercicios.filter((e) =>
    fasesConcluidas.has(e.slug),
  ).length;
  const moduloCompleto = temFases && feitas === aula.exercicios.length;

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
          {feitas > 0 ? (
            <span className={moduloCompleto ? "text-success" : "text-ink-muted"}>
              {feitas}/{aula.exercicios.length} ·{" "}
            </span>
          ) : null}
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
                <span className="flex min-w-0 items-center gap-2 text-xs text-ink-soft">
                  {fasesConcluidas.has(exercicio.slug) ? (
                    <>
                      <IconeCheck className="h-3 w-3 shrink-0 text-success" />
                      <span className="sr-only">Fase concluída: </span>
                    </>
                  ) : null}
                  {exercicio.titulo}
                </span>
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
