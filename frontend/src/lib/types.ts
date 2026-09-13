export type Dominio =
  "FUNDAMENTOS" | "SCRIPTING" | "COMPILADAS" | "WEB" | "DADOS";

export type Estagio = 1 | 2 | 3;

export type Papel = "ALUNO" | "AUTOR" | "ADMIN";

export interface EstagioCriatura {
  estagio: Estagio;
  rotulo: string;
  nivel_minimo: number;
  sprite: string;
  sprite_dialogo: string | null;
}

export interface Criatura {
  slug: string;
  nome: string;
  especie: string;
  dominio: Dominio;
  dominio_rotulo: string;
  chamada: string;
  tipo: string;
  descricao: string;
  atributo_nome: string;
  atributo_valor: number;
  cor_base: string;
  cor_contorno: string;
  cor_acento: string;
  disponivel: boolean;
  ordem: number;
  estagios: EstagioCriatura[];
}

export interface MinhaCriatura {
  id: number;
  criatura: Criatura;
  estagio_atual: Estagio;
  inicial: boolean;
  ativa: boolean;
  adquirida_em: string;
  evoluiu_em: string | null;
  sprite: string | null;
  /** Estágio seguinte ao atual; null na forma final. */
  proximo_estagio: Estagio | null;
  /** Nível que o próximo estágio exige; null na forma final. */
  nivel_para_evoluir: number | null;
  /** O nível desta criatura já alcança o próximo estágio. */
  pode_evoluir: boolean;
  /** Nível desta criatura. O XP é por criatura: reserva nova começa em 1. */
  nivel: number;
}

export interface Evolucao {
  /** Falso quando outro pedido evoluiu primeiro: não há transição a mostrar. */
  evoluiu: boolean;
  estagio_anterior: Estagio;
  criatura: MinhaCriatura;
}

export interface Usuario {
  id: string;
  email: string;
  nickname: string;
  papel: Papel;
  papel_rotulo: string;
  permissoes: string[];
  criado_em: string;
}

export type DocumentoLegal = "TERMOS" | "PRIVACIDADE";

export interface DocumentoVigente {
  documento: DocumentoLegal;
  rotulo: string;
  versao: string;
  vigente_desde: string;
  caminho: string;
}

export interface DocumentosLegais {
  termos: DocumentoVigente;
  privacidade: DocumentoVigente;
}

export type Dificuldade = "INICIANTE" | "INTERMEDIARIO" | "AVANCADO";
export type TipoExercicio = "CODIGO" | "TEORICO";

export interface ExercicioResumo {
  id: number;
  titulo: string;
  slug: string;
  tipo: TipoExercicio;
  tipo_label: string;
  dificuldade: Dificuldade;
  dificuldade_label: string;
  ordem: number;
}

export interface Aula {
  id: number;
  titulo: string;
  slug: string;
  conteudo: string;
  ordem: number;
  pre_requisito: string | null;
  exercicios: ExercicioResumo[];
}

export interface TrilhaResumo {
  id: number;
  nome: string;
  slug: string;
  descricao: string;
  ordem: number;
  total_aulas: number;
  total_exercicios: number;
}

export interface TrilhaDetalhe {
  id: number;
  nome: string;
  slug: string;
  /** Linha do card na listagem. Curta, truncada em tela pequena. */
  descricao: string;
  /** Parágrafo do topo da página da trilha. Vazio cai na descrição. */
  resumo: string;
  /** Seção "Sobre a trilha", em parágrafos. Vazio cai no resumo. */
  sobre: string;
  ordem: number;
  aulas: Aula[];
}

export interface ExercicioDetalhe {
  id: number;
  titulo: string;
  slug: string;
  enunciado: string;
  tipo: TipoExercicio;
  tipo_label: string;
  dificuldade: Dificuldade;
  dificuldade_label: string;
  ordem: number;
  aula_titulo: string;
  aula_slug: string;
  trilha_nome: string;
  trilha_slug: string;
}

export interface BonusXp {
  criatura: string;
  criatura_nome: string;
  trilha: string;
  trilha_nome: string;
  multiplicador: number;
}

export interface NivelResumo {
  numero: number;
  titulo: string;
  xp_necessario: number;
}

export interface ProgressoAtual {
  criatura: MinhaCriatura;
  xp_total: number;
  nivel: NivelResumo;
  proximo_nivel: NivelResumo | null;
  xp_no_nivel: number;
  xp_para_o_proximo: number | null;
  atualizado_em: string;
}

interface ConclusaoBase {
  subiu_de_nivel: boolean;
  /** A criatura alcançou o nível do próximo estágio, mas ainda não evoluiu. */
  pode_evoluir: boolean;
  progresso: ProgressoAtual;
}

// Repetir a conclusão devolve 200, não 409: `ja_concluido` é o que separa
// crédito novo de repetição. A união trava `xp_ganho: 0` no ramo da repetição,
// que é a garantia do serviço. O ramo do crédito novo segue `number`: o que
// impede um "+0 XP" ali é o multiplicador mínimo no banco, não o tipo.
export type ResultadoConclusao =
  | (ConclusaoBase & { ja_concluido: false; xp_ganho: number })
  | (ConclusaoBase & { ja_concluido: true; xp_ganho: 0 });

// Uma conclusão de exercício, como o backend a devolve em
// /eu/exercicios-concluidos/. O slug do exercício só é único dentro da trilha,
// por isso os dois vêm juntos.
export interface ExercicioConcluido {
  trilha_slug: string;
  exercicio_slug: string;
  xp: number;
  criado_em: string;
}
