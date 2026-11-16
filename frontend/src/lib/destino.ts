// Para onde mandar o aluno depois do login ou da renovação de sessão. O valor
// chega pela URL (?volta=), então só caminho interno é aceito: nada de outro
// domínio (//x, /\x, https://) nem as próprias telas de login e de sessão.

const PADRAO = "/trilhas";
const SEM_VOLTA = new Set(["/entrar", "/sessao"]);

export function destinoInterno(bruto: string | null | undefined): string | null {
  if (!bruto || !bruto.startsWith("/")) return null;
  if (bruto.startsWith("//") || bruto.startsWith("/\\")) return null;
  const caminho = bruto.split(/[?#]/)[0];
  if (SEM_VOLTA.has(caminho)) return null;
  return bruto;
}

export function destinoSeguro(bruto: string | null | undefined): string {
  return destinoInterno(bruto) ?? PADRAO;
}
