import Link from "next/link";

import { AlternarSidebar, ID_DO_MENU } from "@/components/layout/AlternarSidebar";
import { IdentidadeDoAluno } from "@/components/layout/IdentidadeDoAluno";
import { MenuLateral } from "@/components/layout/MenuLateral";

export interface Perfil {
  nome: string;
  nivel: number;
  xp: number;
  xpDoProximoNivel: number;
}

// Perfil vem da gamificação por prop; sem dados, mostra o estado neutro.
const PERFIL_PADRAO: Perfil = {
  nome: "Visitante",
  nivel: 1,
  xp: 0,
  xpDoProximoNivel: 1000,
};

export function Sidebar({ perfil = PERFIL_PADRAO }: { perfil?: Perfil }) {
  return (
    <aside
      id={ID_DO_MENU}
      className="painel-lateral border-b border-edge bg-panel lg:sticky lg:top-0 lg:h-dvh lg:w-72 lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-b-0"
    >
      <div className="p-5 lg:p-6">
        <Link
          href="/trilhas"
          className="marca block text-center text-2xl tracking-[0.08em] text-ink-soft lg:text-[1.75rem]"
        >
          CODEQUEST
        </Link>

        {/* A barra de XP mora na ilha junto com a identidade: os dois números
            vêm da mesma chamada autenticada, e esta Sidebar é Server Component.
            Aqui ela só repassa o estado neutro de quem não tem sessão. */}
        <IdentidadeDoAluno
          nome={perfil.nome}
          nivel={perfil.nivel}
          xp={perfil.xp}
          xpDoProximoNivel={perfil.xpDoProximoNivel}
        />

        <MenuLateral />

        <AlternarSidebar
          modo="recolher"
          comRotulo
          className="mt-6 flex w-full items-center gap-3 border-edge bg-panel-soft px-3 py-2.5 text-ink-muted hover:border-brand hover:text-brand"
        />
      </div>
    </aside>
  );
}
