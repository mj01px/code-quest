import type { Aula, Dificuldade, TrilhaDetalhe } from "@/lib/types";

// Números das telas derivados do conteúdo real da trilha.
// Vocabulário das telas: módulo = Aula, fase = Exercício.

/** Estima a duração da trilha: uma hora por fase. */
export function duracaoEmHoras(totalDeFases: number): number {
  return totalDeFases;
}

const XP_POR_DIFICULDADE: Record<Dificuldade, number> = {
  INICIANTE: 100,
  INTERMEDIARIO: 125,
  AVANCADO: 150,
};

export function xpDoModulo(aula: Aula): number {
  const bruto = aula.exercicios.reduce(
    (soma, exercicio) => soma + XP_POR_DIFICULDADE[exercicio.dificuldade],
    0,
  );
  return Math.round(bruto / 50) * 50;
}

const ORDEM_DIFICULDADE: Dificuldade[] = [
  "INICIANTE",
  "INTERMEDIARIO",
  "AVANCADO",
];

const ROTULO_DIFICULDADE: Record<Dificuldade, string> = {
  INICIANTE: "Iniciante",
  INTERMEDIARIO: "Intermediário",
  AVANCADO: "Avançado",
};

/** Resolve o nível pela dificuldade mais frequente, empate para cima. */
export function nivelDaTrilha(trilha: TrilhaDetalhe): string | null {
  const contagem: Record<Dificuldade, number> = {
    INICIANTE: 0,
    INTERMEDIARIO: 0,
    AVANCADO: 0,
  };

  for (const aula of trilha.aulas) {
    for (const exercicio of aula.exercicios) {
      contagem[exercicio.dificuldade] += 1;
    }
  }

  let escolhida: Dificuldade | null = null;
  for (const dificuldade of ORDEM_DIFICULDADE) {
    if (contagem[dificuldade] === 0) continue;
    if (escolhida === null || contagem[dificuldade] >= contagem[escolhida]) {
      escolhida = dificuldade;
    }
  }

  return escolhida ? ROTULO_DIFICULDADE[escolhida] : null;
}

/** Conta as fases que pedem código. */
export function totalDeProjetos(trilha: TrilhaDetalhe): number {
  return trilha.aulas.reduce(
    (soma, aula) =>
      soma + aula.exercicios.filter((e) => e.tipo === "CODIGO").length,
    0,
  );
}

export function totalDeFases(trilha: TrilhaDetalhe): number {
  return trilha.aulas.reduce((soma, aula) => soma + aula.exercicios.length, 0);
}

/** Lista as competências da trilha, uma por módulo. */
export function competencias(trilha: TrilhaDetalhe): string[] {
  return trilha.aulas.map((aula) => aula.titulo);
}

export function plural(
  quantidade: number,
  singular: string,
  plural: string,
): string {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`;
}

/** Monta o subtítulo do módulo com os títulos das primeiras fases. */
export function resumoDoModulo(aula: Aula, maximo = 3): string {
  const titulos = aula.exercicios.slice(0, maximo).map((e) => e.titulo);
  if (titulos.length === 0) return "";
  if (titulos.length === 1) return titulos[0]!;
  return `${titulos.slice(0, -1).join(", ")} e ${titulos.at(-1)}`;
}

export interface FaseDaTrilha {
  slug: string;
  titulo: string;
  moduloTitulo: string;
  moduloPosicao: number;
}

/** Achata a trilha na ordem em que o aluno percorre as fases. */
export function fasesEmOrdem(trilha: TrilhaDetalhe): FaseDaTrilha[] {
  return trilha.aulas.flatMap((aula, indice) =>
    aula.exercicios.map((exercicio) => ({
      slug: exercicio.slug,
      titulo: exercicio.titulo,
      moduloTitulo: aula.titulo,
      moduloPosicao: indice + 1,
    })),
  );
}

/** A primeira fase ainda não concluída, que é onde o aluno retoma. */
export function proximaFase(
  fases: readonly FaseDaTrilha[],
  concluidas: readonly string[],
): FaseDaTrilha | null {
  return fases.find((fase) => !concluidas.includes(fase.slug)) ?? null;
}
