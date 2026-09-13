export interface Companheiro {
  readonly slug: string;
  readonly nome: string;
  readonly alt: string;
}

export const COMPANHEIROS: readonly Companheiro[] = [
  { slug: "blaze", nome: "Blaze", alt: "Blaze, o dragão de JavaScript" },
  {
    slug: "shellby",
    nome: "Shellby",
    alt: "Shellby, a tartaruga dos fundamentos",
  },
  { slug: "slyth", nome: "Slyth", alt: "Slyth, a cobra de Python" },
] as const;

export const sprite = (slug: string, estagio: 1 | 2 | 3): string =>
  `/criaturas/${slug}_stage_${estagio}.png`;

export interface Passo {
  readonly numero: string;
  readonly titulo: string;
  readonly texto: string;
}

export const PASSOS: readonly Passo[] = [
  {
    numero: "01",
    titulo: "Escolha sua quest",
    texto:
      "Quests de programação já prontas, organizadas por trilha. Escolha uma e comece a fase na hora.",
  },
  {
    numero: "02",
    titulo: "Resolva na CLI",
    texto:
      "Escreva a solução no terminal integrado e veja o resultado dos testes na hora com feedback claro.",
  },
  {
    numero: "03",
    titulo: "Evolua o pet",
    texto:
      "Cada desafio vencido rende XP. Seu companheiro cresce junto e desbloqueia novas formas.",
  },
] as const;

export interface Conquista {
  readonly icone: "monitor" | "chama" | "terminal";
  readonly titulo: string;
  readonly texto: string;
}

export const CONQUISTAS: readonly Conquista[] = [
  {
    icone: "monitor",
    titulo: "MESTRE DO PYTHON",
    texto: "50 scripts complexos concluídos",
  },
  {
    icone: "chama",
    titulo: "COMMITTER DIÁRIO",
    texto: "30 dias seguidos de submissões",
  },
  {
    icone: "terminal",
    titulo: "CLI NINJA",
    texto: "Operações avançadas sem um erro",
  },
] as const;

export interface LinkNav {
  readonly href: string;
  readonly rotulo: string;
}

export const LINKS_NAV: readonly LinkNav[] = [
  { href: "#como", rotulo: "COMO_FUNCIONA" },
  { href: "#cli", rotulo: "CLI" },
  { href: "#pets", rotulo: "PETS" },
  { href: "#conquistas", rotulo: "CONQUISTAS" },
] as const;
