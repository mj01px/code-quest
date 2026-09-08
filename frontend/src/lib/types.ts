export type Dominio =
  | "FUNDAMENTOS"
  | "SCRIPTING"
  | "COMPILADAS"
  | "WEB"
  | "DADOS";

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
  adquirida_em: string;
  evoluiu_em: string | null;
  sprite: string | null;
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

export interface Sessao {
  access: string;
  refresh: string;
}

export type DocumentoLegal = "TERMOS" | "PRIVACIDADE";

export interface DocumentoVigente {
  documento: DocumentoLegal;
  rotulo: string;
  versao: string;
  /** ISO 8601, só a data. */
  vigente_desde: string;
  caminho: string;
}

/**
 * Versões vigentes que o cadastro exibe e devolve no aceite. O servidor recusa
 * o registro se a versão enviada não for a que está no ar, então este objeto
 * precisa vir da API e não de constante compilada no bundle.
 */
export interface DocumentosLegais {
  termos: DocumentoVigente;
  privacidade: DocumentoVigente;
}

export const MATERIAS_DOMINIO: Record<Dominio, string> = {
  FUNDAMENTOS: "Lógica de programação",
  SCRIPTING: "Python",
  COMPILADAS: "Java",
  WEB: "JavaScript, React",
  DADOS: "Banco de dados",
};

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
  descricao: string;
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
