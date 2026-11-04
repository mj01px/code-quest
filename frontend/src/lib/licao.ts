export type BlocoLicao =
  | { tipo: "secao"; id: string; texto: string }
  | { tipo: "subtitulo"; texto: string }
  | { tipo: "codigo"; linguagem: string; texto: string }
  | { tipo: "destaque"; texto: string }
  | { tipo: "tabela"; cabecalho: string[]; linhas: string[][] }
  | { tipo: "lista"; ordenada: boolean; itens: string[] }
  | { tipo: "paragrafo"; texto: string };

export type TrechoInline =
  | { tipo: "texto"; texto: string }
  | { tipo: "codigo"; texto: string }
  | { tipo: "forte"; texto: string };

export interface Secao {
  id: string;
  titulo: string;
  destaque: string | null;
}

const PALAVRAS_POR_MINUTO = 180;

export function idDaSecao(titulo: string): string {
  return titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^\d+\.\s*/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function celulas(linha: string): string[] {
  return linha
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((celula) => celula.trim());
}

export function blocosDaLicao(markdown: string): BlocoLicao[] {
  const blocos: BlocoLicao[] = [];
  const linhas = markdown.replace(/\r\n/g, "\n").split("\n");

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];

    if (linha.startsWith("```")) {
      const codigo: string[] = [];
      while (++i < linhas.length && !linhas[i].startsWith("```")) {
        codigo.push(linhas[i]);
      }
      blocos.push({
        tipo: "codigo",
        linguagem: linha.slice(3).trim(),
        texto: codigo.join("\n"),
      });
      continue;
    }

    const secao = /^##\s+(.*)$/.exec(linha);
    if (secao) {
      blocos.push({ tipo: "secao", id: idDaSecao(secao[1]), texto: secao[1] });
      continue;
    }

    const subtitulo = /^###\s+(.*)$/.exec(linha);
    if (subtitulo) {
      blocos.push({ tipo: "subtitulo", texto: subtitulo[1] });
      continue;
    }

    if (linha.startsWith(">")) {
      const partes: string[] = [];
      while (i < linhas.length && linhas[i].startsWith(">")) {
        partes.push(linhas[i].replace(/^>\s?/, ""));
        i++;
      }
      i--;
      blocos.push({ tipo: "destaque", texto: partes.join(" ").trim() });
      continue;
    }

    if (linha.trim().startsWith("|")) {
      const grupo: string[] = [];
      while (i < linhas.length && linhas[i].trim().startsWith("|")) {
        grupo.push(linhas[i]);
        i++;
      }
      i--;
      const [cabecalho, ...resto] = grupo;
      blocos.push({
        tipo: "tabela",
        cabecalho: celulas(cabecalho),
        linhas: resto
          .filter((l) => !/^\s*\|?[\s:|-]+\|?\s*$/.test(l))
          .map(celulas),
      });
      continue;
    }

    const item = /^\s*(?:[-*]|(\d+)\.)\s+(.*)$/.exec(linha);
    if (item) {
      const ordenada = item[1] !== undefined;
      const ultimo = blocos.at(-1);
      if (ultimo?.tipo === "lista" && ultimo.ordenada === ordenada) {
        ultimo.itens.push(item[2]);
      } else {
        blocos.push({ tipo: "lista", ordenada, itens: [item[2]] });
      }
      continue;
    }

    if (linha.trim() === "") continue;

    const ultimo = blocos.at(-1);
    const anterior = linhas[i - 1];
    if (
      ultimo?.tipo === "paragrafo" &&
      anterior !== undefined &&
      anterior.trim() !== ""
    ) {
      ultimo.texto += ` ${linha.trim()}`;
    } else {
      blocos.push({ tipo: "paragrafo", texto: linha.trim() });
    }
  }

  return blocos;
}

export function trechosInline(texto: string): TrechoInline[] {
  const trechos: TrechoInline[] = [];
  const padrao = /`([^`]+)`|\*\*([^*]+)\*\*/g;
  let inicio = 0;

  for (const achado of texto.matchAll(padrao)) {
    const posicao = achado.index ?? 0;
    if (posicao > inicio) {
      trechos.push({ tipo: "texto", texto: texto.slice(inicio, posicao) });
    }
    if (achado[1] !== undefined) {
      trechos.push({ tipo: "codigo", texto: achado[1] });
    } else {
      trechos.push({ tipo: "forte", texto: achado[2] });
    }
    inicio = posicao + achado[0].length;
  }

  if (inicio < texto.length) {
    trechos.push({ tipo: "texto", texto: texto.slice(inicio) });
  }
  return trechos;
}

export function secoesDaLicao(markdown: string): Secao[] {
  const secoes: Secao[] = [];
  for (const bloco of blocosDaLicao(markdown)) {
    if (bloco.tipo === "secao") {
      secoes.push({ id: bloco.id, titulo: bloco.texto, destaque: null });
    } else if (bloco.tipo === "destaque") {
      const atual = secoes.at(-1);
      if (atual && atual.destaque === null) atual.destaque = bloco.texto;
    }
  }
  return secoes;
}

export function minutosDeLeitura(markdown: string): number {
  const palavras = markdown.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(palavras / PALAVRAS_POR_MINUTO));
}

export function rotuloDaSecao(titulo: string): string {
  return titulo.replace(/^\d+\.\s*/, "");
}
