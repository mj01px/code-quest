import type { Metadata } from "next";
import { Suspense } from "react";

import { RetomadaDeSessao } from "@/components/auth/RetomadaDeSessao";

export const metadata: Metadata = {
  title: "Retomando a sessão",
  robots: { index: false },
};

// O servidor manda para cá quando a página pede login e o token de acesso
// venceu (ver lib/sessaoNoServidor). A renovação só acontece no navegador.
export default function PaginaSessao() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-void p-6">
      <Suspense fallback={null}>
        <RetomadaDeSessao />
      </Suspense>
    </main>
  );
}
