import type {
  Aula,
  ExercicioDetalhe,
  ExercicioResumo,
  TrilhaResumo,
} from "@/lib/types";

export function exercicioResumo(
  extra: Partial<ExercicioResumo> = {},
): ExercicioResumo {
  return {
    id: 1,
    titulo: "Média de duas notas",
    slug: "media-de-duas-notas",
    tipo: "CODIGO",
    tipo_label: "Código",
    dificuldade: "INICIANTE",
    dificuldade_label: "Iniciante",
    ordem: 1,
    ...extra,
  };
}

export function aula(extra: Partial<Aula> = {}): Aula {
  return {
    id: 10,
    titulo: "Variáveis e tipos",
    slug: "variaveis-e-tipos",
    conteudo: "## Guardar um valor",
    ordem: 1,
    pre_requisito: null,
    exercicios: [exercicioResumo()],
    ...extra,
  };
}

export function trilhaResumo(extra: Partial<TrilhaResumo> = {}): TrilhaResumo {
  return {
    id: 100,
    nome: "Lógica de Programação",
    slug: "logica-de-programacao",
    descricao: "O ponto de partida: variáveis, condicionais e repetição.",
    ordem: 1,
    total_aulas: 3,
    total_exercicios: 9,
    ...extra,
  };
}

export function exercicioDetalhe(
  extra: Partial<ExercicioDetalhe> = {},
): ExercicioDetalhe {
  return {
    ...exercicioResumo(),
    enunciado: "Escreva uma função media(nota1, nota2).",
    aula_titulo: "Variáveis e tipos",
    aula_slug: "variaveis-e-tipos",
    trilha_nome: "Lógica de Programação",
    trilha_slug: "logica-de-programacao",
    ...extra,
  };
}
