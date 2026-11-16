// Só no servidor: carrega trilha e aula com a sessão do aluno. As rotas e o
// número do módulo ficam em lib/aulas.ts, que também roda no navegador.

import { notFound } from "next/navigation";

import { ErroApi } from "@/lib/api";
import { buscarTrilhaDoAluno } from "@/lib/sessaoNoServidor";
import type { Aula, TrilhaDetalhe } from "@/lib/types";

export interface AulaNaTrilha {
  trilha: TrilhaDetalhe;
  aula: Aula;
  posicao: number;
  proxima: Aula | null;
}

export async function carregarTrilha(slug: string): Promise<TrilhaDetalhe> {
  try {
    return await buscarTrilhaDoAluno(slug);
  } catch (erro) {
    if (erro instanceof ErroApi && erro.naoEncontrado) notFound();
    throw erro;
  }
}

export async function carregarAula(
  trilhaSlug: string,
  aulaSlug: string,
): Promise<AulaNaTrilha> {
  const trilha = await carregarTrilha(trilhaSlug);
  const indice = trilha.aulas.findIndex((aula) => aula.slug === aulaSlug);
  if (indice === -1) notFound();
  return {
    trilha,
    aula: trilha.aulas[indice],
    posicao: indice + 1,
    proxima: trilha.aulas[indice + 1] ?? null,
  };
}
