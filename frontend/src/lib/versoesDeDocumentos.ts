import type { DocumentoLegal, VersaoDeDocumento } from "@/lib/types";

export const DOCUMENTOS: { documento: DocumentoLegal; rotulo: string }[] = [
  { documento: "TERMOS", rotulo: "Termos de Uso" },
  { documento: "PRIVACIDADE", rotulo: "Política de Privacidade" },
];

export interface SituacaoDoDocumento {
  vigente: VersaoDeDocumento | null;
  agendadas: VersaoDeDocumento[];
  rascunho: VersaoDeDocumento | null;
  publicadas: VersaoDeDocumento[];
}

function chave(versao: string): number[] {
  return versao.split(".").map(Number);
}

export function compararVersoes(a: string, b: string): number {
  const [x, y] = [chave(a), chave(b)];
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const diferenca = (x[i] ?? 0) - (y[i] ?? 0);
    if (diferenca !== 0) return diferenca;
  }
  return 0;
}

export function proximaVersao(versao: string | null): string {
  if (!versao) return "1.0";
  const partes = chave(versao);
  if (partes.length === 1) partes.push(0);
  partes[partes.length - 1] += 1;
  return partes.join(".");
}

export function hojeIso(agora: Date = new Date()): string {
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function formatarDia(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

export function situacaoDoDocumento(
  versoes: VersaoDeDocumento[],
  documento: DocumentoLegal,
): SituacaoDoDocumento {
  const doDocumento = versoes.filter((v) => v.documento === documento);
  const publicadas = doDocumento
    .filter((v) => v.situacao === "PUBLICADA")
    .sort((a, b) => compararVersoes(b.versao, a.versao));
  return {
    vigente: publicadas.find((v) => v.vigente) ?? null,
    agendadas: publicadas.filter(
      (v) => !v.vigente && v.vigente_desde > hojeIso(),
    ),
    rascunho: doDocumento.find((v) => v.situacao === "RASCUNHO") ?? null,
    publicadas,
  };
}
