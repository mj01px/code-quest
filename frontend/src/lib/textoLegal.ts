import { blocosDaLicao, type BlocoLicao } from "@/lib/licao";

export type TrechoLegal =
  | { tipo: "texto"; texto: string }
  | { tipo: "forte"; texto: string }
  | { tipo: "link"; texto: string; href: string; interno: boolean };

export interface SecaoLegal {
  numero: number;
  titulo: string;
  blocos: BlocoLicao[];
}

export interface DocumentoEstruturado {
  introducao: BlocoLicao[];
  secoes: SecaoLegal[];
}

export function linkSeguro(href: string): { href: string; interno: boolean } | null {
  if (/^\/(?![/\\])[^\s\\]*$/.test(href)) return { href, interno: true };
  if (/^mailto:[^\s@]+@[^\s@]+$/.test(href)) return { href, interno: false };
  if (/^https:\/\/[^\s]+$/.test(href)) return { href, interno: false };
  return null;
}

export function trechosLegais(texto: string): TrechoLegal[] {
  const trechos: TrechoLegal[] = [];
  const padrao = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let inicio = 0;

  for (const achado of texto.matchAll(padrao)) {
    const posicao = achado.index ?? 0;
    if (posicao > inicio) {
      trechos.push({ tipo: "texto", texto: texto.slice(inicio, posicao) });
    }
    if (achado[1] !== undefined) {
      trechos.push({ tipo: "forte", texto: achado[1] });
    } else {
      const seguro = linkSeguro(achado[3]);
      trechos.push(
        seguro
          ? { tipo: "link", texto: achado[2], ...seguro }
          : { tipo: "texto", texto: achado[2] },
      );
    }
    inicio = posicao + achado[0].length;
  }

  if (inicio < texto.length) {
    trechos.push({ tipo: "texto", texto: texto.slice(inicio) });
  }
  return trechos;
}

export function estruturarDocumento(markdown: string): DocumentoEstruturado {
  const introducao: BlocoLicao[] = [];
  const secoes: SecaoLegal[] = [];

  for (const bloco of blocosDaLicao(markdown)) {
    if (bloco.tipo === "secao") {
      secoes.push({
        numero: secoes.length + 1,
        titulo: bloco.texto.replace(/^\d+[.)]\s+/, ""),
        blocos: [],
      });
    } else {
      (secoes.at(-1)?.blocos ?? introducao).push(bloco);
    }
  }

  return { introducao, secoes };
}
