"use client";

// Funções puras de progresso. Dados vêm do servidor (não usa localStorage).
// Quem busca é o ProvedorProgresso; aqui só agrega.

import type { ExercicioConcluido } from "@/lib/types";

const VAZIO: readonly ExercicioConcluido[] = Object.freeze([]);

/** O slug do exercício só é único dentro da trilha; a chave junta os dois. */
export function chaveDaFase(trilhaSlug: string, faseSlug: string): string {
  return `${trilhaSlug}/${faseSlug}`;
}

/** Descarta linhas sem slugs válidos — a API é fronteira, não fonte confiável de tipo. */
export function normalizar(bruto: unknown): readonly ExercicioConcluido[] {
  if (!Array.isArray(bruto)) return VAZIO;

  const limpo: ExercicioConcluido[] = [];
  for (const linha of bruto) {
    if (typeof linha !== "object" || linha === null) continue;
    const { trilha_slug, exercicio_slug, xp, criado_em } =
      linha as Partial<ExercicioConcluido>;
    if (typeof trilha_slug !== "string" || trilha_slug === "") continue;
    if (typeof exercicio_slug !== "string" || exercicio_slug === "") continue;
    limpo.push({
      trilha_slug,
      exercicio_slug,
      xp: typeof xp === "number" ? xp : 0,
      criado_em: typeof criado_em === "string" ? criado_em : "",
    });
  }

  return Object.freeze(limpo);
}

export function chavesConcluidas(
  concluidos: readonly ExercicioConcluido[],
): ReadonlySet<string> {
  return new Set(
    concluidos.map((item) =>
      chaveDaFase(item.trilha_slug, item.exercicio_slug),
    ),
  );
}

export function estaConcluida(
  chaves: ReadonlySet<string>,
  trilhaSlug: string,
  faseSlug: string,
): boolean {
  return chaves.has(chaveDaFase(trilhaSlug, faseSlug));
}

/** Quantas fases o aluno concluiu em cada trilha. */
export function contarPorTrilha(
  concluidos: readonly ExercicioConcluido[],
): ReadonlyMap<string, number> {
  const contagem = new Map<string, number>();
  for (const item of concluidos) {
    contagem.set(item.trilha_slug, (contagem.get(item.trilha_slug) ?? 0) + 1);
  }
  return contagem;
}

/** Slugs concluídos de uma trilha, na ordem em que a API devolveu. */
export function concluidasDaTrilha(
  concluidos: readonly ExercicioConcluido[],
  trilhaSlug: string,
): readonly string[] {
  return concluidos
    .filter((item) => item.trilha_slug === trilhaSlug)
    .map((item) => item.exercicio_slug);
}

/** Percentual 0–100. Limitado a 100 pra fase despublicada não estourar a barra. */
export function percentual(feitas: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, (feitas / total) * 100);
}
