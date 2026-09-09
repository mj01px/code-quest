import type { NextConfig } from "next";

const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:8000";

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
};

export default nextConfig;
