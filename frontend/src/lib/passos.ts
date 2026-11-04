import type { EstadoDoPasso, PassoDaTrilha } from "@/lib/types";

export function chaveDoPasso(
  tipo: PassoDaTrilha["tipo"],
  aulaSlug: string,
  exercicioSlug: string | null = null,
): string {
  return `${aulaSlug}#${tipo}#${exercicioSlug ?? ""}`;
}

export function rotaDoPasso(trilhaSlug: string, passo: PassoDaTrilha): string {
  if (passo.tipo === "EXERCICIO" && passo.exercicio_slug) {
    return `/trilhas/${trilhaSlug}/exercicios/${passo.exercicio_slug}`;
  }
  const aula = `/trilhas/${trilhaSlug}/aulas/${passo.aula_slug}`;
  return passo.tipo === "QUIZ" ? `${aula}/quiz` : aula;
}

export interface MapaDePassos {
  estado: (chave: string) => EstadoDoPasso;
  proximo: PassoDaTrilha | null;
  total: number;
  concluidos: number;
}

export function mapaDePassos(
  passos: readonly PassoDaTrilha[] | null,
): MapaDePassos {
  const porChave = new Map(
    (passos ?? []).map((passo) => [
      chaveDoPasso(passo.tipo, passo.aula_slug, passo.exercicio_slug),
      passo.estado,
    ]),
  );
  return {
    estado: (chave) => porChave.get(chave) ?? "liberado",
    proximo:
      (passos ?? []).find((passo) => passo.estado === "liberado") ?? null,
    total: passos?.length ?? 0,
    concluidos: (passos ?? []).filter((passo) => passo.estado === "concluido")
      .length,
  };
}
