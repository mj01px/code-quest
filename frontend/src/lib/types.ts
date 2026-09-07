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

export const MATERIAS_DOMINIO: Record<Dominio, string> = {
  FUNDAMENTOS: "Lógica de programação",
  SCRIPTING: "Python",
  COMPILADAS: "Java, C#",
  WEB: "JavaScript, React",
  DADOS: "Banco de dados",
};
