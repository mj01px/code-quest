import Link from "next/link";

import { Badge, BadgeDificuldade } from "@/components/ui/Badge";
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
        className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-brand-shadow bg-panel-deep font-display text-[12px] text-brand-light"
      >
        {numero}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate font-label text-[12px] tracking-[2px] text-ink uppercase">
          <span className="sr-only">Módulo {posicao}: </span>
          {aula.titulo}
        </span>
        <span className="mt-1.5 block truncate font-body text-base tracking-[1px] text-ink-muted">
          {resumo ? `${resumo} · ` : ""}
          {plural(aula.exercicios.length, "fase", "fases")}
          {aula.pre_requisito
            ? ` · requer ${preRequisitoTitulo ?? aula.pre_requisito}`
            : ""}
        </span>
      </span>

      {temFases ? (
        <span className="shrink-0 font-label text-[11px] tracking-[2px] text-brand-light uppercase">
          {feitas > 0 ? (
            <span
              className={moduloCompleto ? "text-success" : "text-ink-muted"}
            >
              {feitas}/{aula.exercicios.length} ·{" "}
            </span>
          ) : null}
          +{xpDoModulo(aula)} XP
        </span>
      ) : (
        <span className="shrink-0 font-label text-[11px] tracking-[2px] text-ink-dim uppercase">
          Em breve
        </span>
      )}
    </>
  );

  if (!temFases) {
    return (
      <li className="flex items-center gap-5 border-2 border-edge bg-panel p-5 sm:px-6">
        {cabecalho}
      </li>
    );
  }

  return (
    <li className="border-2 border-edge bg-panel transition duration-150 hover:border-brand-shadow">
      <details>
        <summary className="flex cursor-pointer list-none items-center gap-5 p-5 transition-colors hover:bg-panel-soft sm:px-6 [&::-webkit-details-marker]:hidden">
          {cabecalho}
        </summary>

        <ul className="m-0 list-none divide-y-2 divide-edge border-t-2 border-edge p-0">
          {aula.exercicios.map((exercicio, posicaoDaFase) => {
            const feita = fasesConcluidas.has(exercicio.slug);

            return (
              <li key={exercicio.id}>
                <Link
                  href={`/trilhas/${trilhaSlug}/exercicios/${exercicio.slug}`}
                  className="group flex cursor-pointer flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-panel-soft sm:px-6"
                >
                  {/* O mesmo quadro numerado do módulo, um tamanho abaixo: é
                      ele que diz que a fase está feita, sem gastar uma coluna
                      só para isso. */}
                  <span
                    aria-hidden="true"
                    className={`flex h-8 w-8 shrink-0 items-center justify-center border-2 font-display text-[10px] ${
                      feita
                        ? "border-success bg-panel-deep text-success"
                        : "border-edge-soft bg-panel-deep text-ink-muted group-hover:border-brand group-hover:text-brand-light"
                    }`}
                  >
                    {feita ? (
                      <IconeCheck className="h-3.5 w-3.5" />
                    ) : (
                      String(posicaoDaFase + 1).padStart(2, "0")
                    )}
                  </span>

                  <span className="min-w-0 flex-1 font-body text-base tracking-[1px] text-ink-body">
                    <span className="sr-only">
                      Fase {posicaoDaFase + 1}
                      {feita ? ", concluída" : ""}:{" "}
                    </span>
                    {exercicio.titulo}
                  </span>

                  <span className="flex shrink-0 items-center gap-2">
                    <BadgeDificuldade
                      dificuldade={exercicio.dificuldade}
                      rotulo={exercicio.dificuldade_label}
                    />
                    <Badge>{exercicio.tipo_label}</Badge>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </details>
    </li>
  );
}
