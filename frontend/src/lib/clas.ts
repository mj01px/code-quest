import type { Bandeira, Cargo, MembroDoCla } from "./types";

export const NIVEL_MINIMO_GLOBAL = 5;
export const NIVEL_MAXIMO = 30;
export const LIMITE_MEMBROS = 50;
export const NOME_MIN = 3;
export const NOME_MAX = 24;
export const DESCRICAO_MAX = 200;

export interface BandeiraInfo {
  slug: Bandeira;
  src: string;
  rotulo: string;
}

export const BANDEIRAS: readonly BandeiraInfo[] = [
  { slug: "guilda_1", src: "/clas/guilda_1.png", rotulo: "Bandeira 1" },
  { slug: "guilda_2", src: "/clas/guilda_2.png", rotulo: "Bandeira 2" },
  { slug: "guilda_3", src: "/clas/guilda_3.png", rotulo: "Bandeira 3" },
  { slug: "guilda_4", src: "/clas/guilda_4.png", rotulo: "Bandeira 4" },
];

const POR_SLUG = new Map(BANDEIRAS.map((b) => [b.slug, b]));

export function bandeira(slug: Bandeira): BandeiraInfo {
  return POR_SLUG.get(slug) ?? BANDEIRAS[0];
}

export function iniciais(nome: string): string {
  const limpo = nome.trim();
  return limpo ? limpo.slice(0, 2).toUpperCase() : "??";
}

export function formatarData(iso: string): string {
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? "" : data.toLocaleDateString("pt-BR");
}

export type AcaoDeMembro = "promover" | "rebaixar" | "transferir" | "expulsar";

export function acoesDeMembro(
  meuCargo: Cargo,
  alvo: MembroDoCla,
  souEu: boolean,
): AcaoDeMembro[] {
  if (souEu || alvo.cargo === "LIDER") return [];

  if (meuCargo === "LIDER") {
    const acoes: AcaoDeMembro[] = [];
    if (alvo.cargo === "MEMBRO") acoes.push("promover");
    if (alvo.cargo === "COLIDER") acoes.push("rebaixar");
    acoes.push("transferir", "expulsar");
    return acoes;
  }

  if (meuCargo === "COLIDER" && alvo.cargo === "MEMBRO") {
    return ["promover", "expulsar"];
  }

  return [];
}

export function ehGestor(cargo: Cargo): boolean {
  return cargo !== "MEMBRO";
}
