"use client";

import { AulaCard } from "@/components/trilhas/AulaCard";
import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { estaConcluida } from "@/lib/progresso";
import type { TrilhaDetalhe } from "@/lib/types";

// Ilha client da trilha: conteúdo vem do build, conclusões do Context.
// Chave já junta trilha+fase, então não precisa filtrar por trilha.

export function MapaDeFases({ trilha }: { trilha: TrilhaDetalhe }) {
  const { chaves } = useProgresso();

  // Resolve slug → título pra exibir pré-requisito (Map não é serializável do servidor).
  const tituloPorSlug = new Map(
    trilha.aulas.map((aula) => [aula.slug, aula.titulo]),
  );

  return (
    <ul className="m-0 mt-6 flex list-none flex-col gap-2 p-0">
      {trilha.aulas.map((aula, indice) => (
        <AulaCard
          key={aula.id}
          aula={aula}
          trilhaSlug={trilha.slug}
          posicao={indice + 1}
          preRequisitoTitulo={
            aula.pre_requisito
              ? tituloPorSlug.get(aula.pre_requisito)
              : undefined
          }
          fasesConcluidas={
            new Set(
              aula.exercicios
                .filter((exercicio) =>
                  estaConcluida(chaves, trilha.slug, exercicio.slug),
                )
                .map((exercicio) => exercicio.slug),
            )
          }
        />
      ))}
    </ul>
  );
}
