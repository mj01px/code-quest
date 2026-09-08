"use client";

import { useSyncExternalStore } from "react";

import { CartaoDestaque, type Retomada } from "@/components/trilhas/CartaoDestaque";
import { ListaDeTrilhas } from "@/components/trilhas/ListaDeTrilhas";
import { fasesEmOrdem, plural, proximaFase } from "@/lib/derivados";
import {
  assinar,
  concluidas,
  instantaneo,
  instantaneoNoServidor,
  percentual,
  type Progresso,
} from "@/lib/progresso";
import type { TrilhaDetalhe, TrilhaResumo } from "@/lib/types";

// A listagem é servida estática; o progresso é do navegador. Este componente é
// a fronteira entre os dois: o servidor entrega o catálogo, o cliente aplica em
// cima dele o que o aluno já fez.

function montarRetomada(
  destaque: TrilhaDetalhe,
  feitas: readonly string[],
  progresso: number,
): Retomada | null {
  if (progresso <= 0) return null;

  const fases = fasesEmOrdem(destaque);
  const proxima = proximaFase(fases, feitas);

  if (proxima === null) {
    return {
      progresso: 100,
      posicao: `${plural(fases.length, "fase concluída", "fases concluídas")}`,
    };
  }

  return {
    progresso,
    posicao: `Módulo ${proxima.moduloPosicao} · ${proxima.titulo}`,
    href: `/trilhas/${destaque.slug}/exercicios/${proxima.slug}`,
  };
}

function calcularProgresso(
  trilhas: TrilhaResumo[],
  progresso: Progresso,
): Record<string, number> {
  const porSlug: Record<string, number> = {};
  for (const trilha of trilhas) {
    porSlug[trilha.slug] = percentual(
      concluidas(progresso, trilha.slug).length,
      trilha.total_exercicios,
    );
  }
  return porSlug;
}

export function PainelDeTrilhas({
  trilhas,
  // Detalhe da trilha em destaque, para saber em que fase o aluno parou.
  destaque = null,
}: {
  trilhas: TrilhaResumo[];
  destaque?: TrilhaDetalhe | null;
}) {
  const progresso = useSyncExternalStore(
    assinar,
    instantaneo,
    instantaneoNoServidor,
  );

  const progressoPorSlug = calcularProgresso(trilhas, progresso);
  const [primeira] = trilhas;

  return (
    <>
      {primeira ? (
        <CartaoDestaque
          trilha={primeira}
          retomada={
            destaque
              ? montarRetomada(
                  destaque,
                  concluidas(progresso, primeira.slug),
                  progressoPorSlug[primeira.slug] ?? 0,
                )
              : null
          }
        />
      ) : null}

      <ListaDeTrilhas trilhas={trilhas} progressoPorSlug={progressoPorSlug} />
    </>
  );
}
