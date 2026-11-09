"use client";

import { AulaCard } from "@/components/trilhas/AulaCard";
import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { usePassosDaTrilha } from "@/components/progresso/usePassosDaTrilha";
import { chaveDaEtapa, estaConcluida } from "@/lib/progresso";
import type { TrilhaDetalhe } from "@/lib/types";

// Ilha client da trilha: conteúdo vem do build, conclusões do Context.
// Chave já junta trilha+fase, então não precisa filtrar por trilha.

export function MapaDeFases({ trilha }: { trilha: TrilhaDetalhe }) {
  const { chaves, chavesDeEtapas } = useProgresso();
  const { estado } = usePassosDaTrilha(trilha.slug);

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
          estadoDe={estado}
          leituraFeita={chavesDeEtapas.has(
            chaveDaEtapa(trilha.slug, aula.slug, "LEITURA"),
          )}
          quizFeito={chavesDeEtapas.has(
            chaveDaEtapa(trilha.slug, aula.slug, "QUIZ"),
          )}
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
