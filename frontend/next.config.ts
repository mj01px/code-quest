import type { NextConfig } from "next";

const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:8000";

// O Monaco vem da CDN em runtime (@monaco-editor/loader): loader.js e CSS. A
// fonte dos ícones vem embutida no CSS como data:, e o worker nasce de um blob:
// que importa da CDN (coberto pelo script-src).
const CDN = "https://cdn.jsdelivr.net";
// O React em dev avalia código para montar a pilha de erro; o build não.
const EVAL_EM_DEV = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";

const CSP = [
  "default-src 'self'",
  // ponytail: 'unsafe-inline' porque o Next injeta <script> inline e a página
  // estática não tem nonce, logo esta CSP não barra script inline injetado.
  // Tirar exige nonce no proxy.ts e render dinâmico; aí fixar a CDN no
  // caminho do monaco-editor, senão o jsdelivr inteiro vira o desvio.
  `script-src 'self' 'unsafe-inline' ${CDN}${EVAL_EM_DEV}`,
  `style-src 'self' 'unsafe-inline' ${CDN}`,
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

const nextConfig: NextConfig = {
  devIndicators: false,
  // Sem isto o Next devolve 308 tirando a barra final antes de repassar, e
  // todo POST para a API morre no redirecionamento.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    // A barra volta no destino porque o Next normaliza o caminho de entrada e
    // toda rota do DRF termina em barra. Sem ela, o APPEND_SLASH do Django
    // estoura em POST, que ele nao consegue redirecionar sem perder o corpo.
    return [{ source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*/` }];
  },
  async headers() {
    return [
      { source: "/:path*", headers: [{ key: "Content-Security-Policy", value: CSP }] },
    ];
  },
};

export default nextConfig;
