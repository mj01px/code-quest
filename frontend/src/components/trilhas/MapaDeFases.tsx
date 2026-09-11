"use client";

import { AulaCard } from "@/components/trilhas/AulaCard";
import { estaConcluida, useConclusoes } from "@/lib/progresso";
import type { TrilhaDetalhe } from "@/lib/types";

// Ilha de cliente da página da trilha. A página continua estática: ela renderiza
// esta ilha com o conteúdo já vindo do build, e só o que é da conta do aluno —
// quais fases estão feitas — é buscado aqui, depois de montar.
//
// Pede com filtro por trilha: esta tela não tem o que fazer com as conclusões
// das outras.

export function MapaDeFases({ trilha }: { trilha: TrilhaDetalhe }) {
  const { chaves } = useConclusoes(trilha.slug);

  // O pré-requisito vem como slug; o título mora na própria lista de aulas.
  // Resolver aqui evita mandar um Map do servidor, que não é serializável.
  const tituloPorSlug = new Map(
    trilha.aulas.map((aula) => [aula.slug, aula.titulo]),
  );

  return (
    <ul className="mt-4 flex flex-col gap-3">
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
