"use client";

import { CartaoDestaque, type Retomada } from "@/components/trilhas/CartaoDestaque";
import { ListaDeTrilhas } from "@/components/trilhas/ListaDeTrilhas";
import { fasesEmOrdem, plural, proximaFase } from "@/lib/derivados";
import {
  concluidasDaTrilha,
  contarPorTrilha,
  percentual,
  useConclusoes,
} from "@/lib/progresso";
import type { ExercicioConcluido, TrilhaDetalhe, TrilhaResumo } from "@/lib/types";

// A listagem é servida estática; as conclusões vêm da conta. Este componente é
// a fronteira entre os dois: o servidor entrega o catálogo, o cliente busca o
// que o aluno já fez e aplica em cima.
//
// Pede a lista inteira, sem filtro de trilha: a tela agrega por trilha, então
// um pedido só sai mais barato que um por card.

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
  const { concluidos } = useConclusoes();

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

      <ListaDeTrilhas trilhas={trilhas} progressoPorSlug={progressoPorSlug} />
    </>
  );
}
