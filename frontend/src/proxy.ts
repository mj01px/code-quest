import { NextResponse, type NextRequest } from "next/server";

// O Monaco vem da CDN em runtime (@monaco-editor/loader): loader.js e CSS. A
// fonte dos ícones vem embutida no CSS como data:, e o worker nasce de um blob:
// que importa da CDN (coberto pelo script-src). Só o caminho da versão que o
// loader pede é liberado, não o jsdelivr inteiro; subir o @monaco-editor/loader
// pode trocar essa versão (ver node_modules/@monaco-editor/loader, config).
const MONACO_CDN = "https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/";

/**
 * CSP com nonce por request (RNF11): o script inline que o Next injeta só roda
 * com o nonce desta resposta, então um <script> injetado por XSS é barrado.
 * O Next lê o nonce do cabeçalho da request e o aplica sozinho aos próprios
 * scripts; para isso a página precisa de render dinâmico (layout raiz).
 */
export function cspCom(nonce: string, dev: boolean): string {
  // O React em dev avalia código para montar a pilha de erro; o build não.
  const evalEmDev = dev ? " 'unsafe-eval'" : "";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' ${MONACO_CDN}${evalEmDev}`,
    // ponytail: estilos seguem com 'unsafe-inline' porque o Monaco e o Next
    // injetam <style> e atributos style sem nonce; o RNF11 trata de script.
    `style-src 'self' 'unsafe-inline' ${MONACO_CDN}`,
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    // Sprites seguem SPRITE_BASE_URL do backend (/criaturas/); se virar outra
    // origem, ela entra aqui. data: é o QR code do 2FA.
    "img-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = cspCom(nonce, process.env.NODE_ENV === "development");

  const cabecalhos = new Headers(request.headers);
  cabecalhos.set("Content-Security-Policy", csp);
  const resposta = NextResponse.next({ request: { headers: cabecalhos } });
  resposta.headers.set("Content-Security-Policy", csp);
  return resposta;
}

export const config = {
  matcher: [
    {
      // Fora: a API (JSON, repassada ao Django), os estáticos do build e todo
      // arquivo com extensão (sprites, fontes, ícones), que não executam script.
      source: "/((?!api|_next/static|_next/image|.*\\..*).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
