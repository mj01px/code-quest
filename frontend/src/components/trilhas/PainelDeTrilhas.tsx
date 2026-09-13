"use client";

import {
  CartaoDestaque,
  type Retomada,
} from "@/components/trilhas/CartaoDestaque";
import { ListaDeTrilhas } from "@/components/trilhas/ListaDeTrilhas";
import { fasesEmOrdem, plural, proximaFase } from "@/lib/derivados";
import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import {
  concluidasDaTrilha,
  contarPorTrilha,
  percentual,
} from "@/lib/progresso";
import type {
  ExercicioConcluido,
  TrilhaDetalhe,
  TrilhaResumo,
} from "@/lib/types";

// Fronteira estático/cliente: catálogo vem do servidor, conclusões do Context.
// Agregação por trilha é feita aqui.

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
  concluidos: readonly ExercicioConcluido[],
): Record<string, number> {
  const contagem = contarPorTrilha(concluidos);
  const porSlug: Record<string, number> = {};
  for (const trilha of trilhas) {
    porSlug[trilha.slug] = percentual(
      contagem.get(trilha.slug) ?? 0,
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
  const { concluidos, trilhasIniciadas } = useProgresso();

  const progressoPorSlug = calcularProgresso(trilhas, concluidos);
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
                  concluidasDaTrilha(concluidos, primeira.slug),
                  progressoPorSlug[primeira.slug] ?? 0,
                )
              : null
          }
        />
      ) : null}

      <ListaDeTrilhas
        trilhas={trilhas}
        progressoPorSlug={progressoPorSlug}
        iniciadas={trilhasIniciadas}
      />
    </>
  );
}
