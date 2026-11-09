import { notFound } from "next/navigation";

import { ErroApi, buscarTrilha } from "@/lib/api";
import type { Aula, TrilhaDetalhe } from "@/lib/types";

export interface AulaNaTrilha {
  trilha: TrilhaDetalhe;
  aula: Aula;
  posicao: number;
  proxima: Aula | null;
}

export async function carregarTrilha(slug: string): Promise<TrilhaDetalhe> {
  try {
    return await buscarTrilha(slug);
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

export function rotaDaAula(trilhaSlug: string, aulaSlug: string): string {
  return `/trilhas/${trilhaSlug}/aulas/${aulaSlug}`;
}

export function rotaDoExercicio(trilhaSlug: string, exercicioSlug: string): string {
  return `/trilhas/${trilhaSlug}/exercicios/${exercicioSlug}`;
}

export function numeroDoModulo(posicao: number): string {
  return String(posicao).padStart(2, "0");
}
