import type { NextConfig } from "next";

const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:8000";

// A Content-Security-Policy sai do src/proxy.ts, com nonce por request.

const nextConfig: NextConfig = {
  devIndicators: false,
  // Sem isto o Next devolve 308 tirando a barra final antes de repassar, e
  // todo POST para a API morre no redirecionamento.
  skipTrailingSlashRedirect: true,
  // ponytail: o prerender busca o catalogo na API, e o runserver aceita so 10
  // conexoes na fila. O padrao (um worker por nucleo, 8 paginas cada) passa
  // disso, e no Windows o excedente volta como sem_conexao. 4 x 2 = 8 paginas
  // em voo. Se o build rodar contra um servidor de producao, pode subir.
  experimental: { cpus: 4, staticGenerationMaxConcurrency: 2 },
  async rewrites() {
    // A barra volta no destino porque o Next normaliza o caminho de entrada e
    // toda rota do DRF termina em barra. Sem ela, o APPEND_SLASH do Django
    // estoura em POST, que ele nao consegue redirecionar sem perder o corpo.
    return [{ source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*/` }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Os links de e-mail levam token na query (/redefinir-senha?token=):
          // um link externo dessas páginas não pode carregar o caminho completo.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
