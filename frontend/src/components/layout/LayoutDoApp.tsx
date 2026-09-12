import type { ReactNode } from "react";

import { BarraDeMenu } from "@/components/layout/BarraDeMenu";
import { Sidebar } from "@/components/layout/Sidebar";

// Moldura das telas de dentro do app: sidebar, barra de menu e área de
// conteúdo. Vive num componente, e não no layout de /trilhas, porque agora
// mais de uma rota usa a mesma moldura e duplicá-la faria as duas divergirem.
//
// O script que restaura a sidebar recolhida NÃO mora aqui: mora no layout
// raiz. Aqui ele só rodava em carregamento completo de /trilhas, e quem
// chegava por router.push vindo do login perdia a preferência.

export function LayoutDoApp({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <BarraDeMenu />
        <main className="mx-auto w-full max-w-5xl min-w-0 flex-1 px-5 py-8 sm:px-8 sm:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
