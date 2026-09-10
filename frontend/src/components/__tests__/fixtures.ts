import type {
  Aula,
  BonusXp,
  Criatura,
  ExercicioDetalhe,
  ExercicioResumo,
  MinhaCriatura,
  TrilhaDetalhe,
  TrilhaResumo,
  Usuario,
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

export function trilhaDetalhe(extra: Partial<TrilhaDetalhe> = {}): TrilhaDetalhe {
  return {
    id: 100,
    nome: "Lógica de Programação",
    slug: "logica-de-programacao",
    descricao: "O ponto de partida: variáveis, condicionais e repetição.",
    ordem: 1,
    aulas: [aula()],
    ...extra,
  };
}

export function bonusXp(extra: Partial<BonusXp> = {}): BonusXp {
  return {
    criatura: "shellby",
    criatura_nome: "Shellby",
    trilha: "logica-de-programacao",
    trilha_nome: "Lógica de Programação",
    multiplicador: 2,
    ...extra,
  };
}

export function minhaCriatura(extra: Partial<MinhaCriatura> = {}): MinhaCriatura {
  return {
    id: 1,
    criatura: criatura(),
    estagio_atual: 1,
    inicial: true,
    ativa: true,
    adquirida_em: "2026-09-01T12:00:00Z",
    evoluiu_em: null,
    sprite: "/criaturas/shellby_stage_1.png",
    ...extra,
  };
}

export function criatura(extra: Partial<Criatura> = {}): Criatura {
  return {
    slug: "shellby",
    nome: "Shellby",
    especie: "Tartaruga",
    dominio: "FUNDAMENTOS",
    dominio_rotulo: "Fundamentos",
    chamada: "Começa devagar e não para mais.",
    tipo: "Iniciante / Terra",
    descricao: "Anda no seu ritmo e não deixa passar nada.",
    atributo_nome: "Defesa",
    atributo_valor: 4,
    cor_base: "#4FC98A",
    cor_contorno: "#1E5E42",
    cor_acento: "#2E7D5B",
    disponivel: true,
    ordem: 1,
    estagios: [
      {
        estagio: 1,
        rotulo: "Filhote",
        nivel_minimo: 1,
        sprite: "/criaturas/shellby_stage_1.png",
        sprite_dialogo: null,
      },
    ],
    ...extra,
  };
}

export function usuario(extra: Partial<Usuario> = {}): Usuario {
  return {
    id: "0199a0f0-0000-7000-8000-000000000000",
    email: "aluno@example.com",
    nickname: "aluno_teste",
    papel: "ALUNO",
    papel_rotulo: "Aluno",
    permissoes: ["trilhas.view"],
    criado_em: "2026-09-01T12:00:00Z",
    ...extra,
  };
}
