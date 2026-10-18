import type { Conquista } from "./types";

export const EVENTO_CONQUISTAS = "cq:conquistas";

export function avisarConquistas(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENTO_CONQUISTAS));
}

export function chaveDaConquista(conquista: Conquista, indice: number): string {
  return conquista.slug ?? `oculta-${indice}`;
}

export function novasConquistas(lista: readonly Conquista[]): Conquista[] {
  return lista.filter((c) => c.desbloqueada && !c.vista);
}

export interface Resumo {
  total: number;
  desbloqueadas: number;
  percentual: number;
}

export function resumir(lista: readonly Conquista[]): Resumo {
  const total = lista.length;
  const desbloqueadas = lista.filter((c) => c.desbloqueada).length;
  return {
    total,
    desbloqueadas,
    percentual: total > 0 ? Math.round((desbloqueadas / total) * 100) : 0,
  };
}

export function fracaoDoProgresso(conquista: Conquista): number | null {
  if (conquista.desbloqueada) return 1;
  if (conquista.progresso === null || conquista.meta === null) return null;
  if (conquista.meta <= 1) return null;
  return Math.min(1, conquista.progresso / conquista.meta);
}

export function rotuloDeRaridade(raridade: number): string {
  const valor = raridade.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  });
  return `${valor}% dos alunos`;
}

export function formatarDataDaConquista(iso: string | null): string {
  if (iso === null) return "";
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? "" : data.toLocaleDateString("pt-BR");
}

export const ALTURA_DA_LINHA = 220;
export const TOPO_DO_MAPA = 64;
const FOLGA_DO_ROTULO = 120;
const PASSOS_NA_LINHA = [0.3, 0.433, 0.567, 0.7];
const PASSOS_NA_CURVA = [0.52, 0.64, 0.76];

export interface PosicaoNoMapa {
  esquerda: number;
  topo: number;
}

export interface PontoDoCaminho {
  esquerda: number;
  topo: number;
  aceso: boolean;
}

export interface Mapa {
  posicoes: PosicaoNoMapa[];
  pontos: PontoDoCaminho[];
  altura: number;
}

export function colunasDoMapa(largura: number): number {
  if (largura >= 880) return 4;
  if (largura >= 560) return 3;
  return 2;
}

export function montarMapa(lista: readonly Conquista[], colunas: number): Mapa {
  const posicoes = lista.map((_, indice) => {
    const linha = Math.floor(indice / colunas);
    const passo = indice % colunas;
    const coluna = linha % 2 === 0 ? passo : colunas - 1 - passo;
    return {
      esquerda: ((coluna + 0.5) / colunas) * 100,
      topo: TOPO_DO_MAPA + linha * ALTURA_DA_LINHA,
    };
  });

  const pontos: PontoDoCaminho[] = [];
  for (let i = 0; i < posicoes.length - 1; i++) {
    const a = posicoes[i];
    const b = posicoes[i + 1];
    const aceso = lista[i].desbloqueada && lista[i + 1].desbloqueada;
    const passos = a.topo === b.topo ? PASSOS_NA_LINHA : PASSOS_NA_CURVA;
    for (const t of passos) {
      pontos.push({
        esquerda: a.esquerda + (b.esquerda - a.esquerda) * t,
        topo: a.topo + (b.topo - a.topo) * t,
        aceso,
      });
    }
  }

  const linhas = Math.max(1, Math.ceil(lista.length / colunas));
  return {
    posicoes,
    pontos,
    altura: TOPO_DO_MAPA + (linhas - 1) * ALTURA_DA_LINHA + FOLGA_DO_ROTULO,
  };
}

export function rotuloDoEstado(conquista: Conquista): string {
  if (conquista.desbloqueada) return "CONQUISTA DESBLOQUEADA";
  if (conquista.oculta) return "CONQUISTA OCULTA";
  return "BLOQUEADA";
}
