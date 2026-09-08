import Link from "next/link";

import { AlternarSidebar, ID_DO_MENU } from "@/components/layout/AlternarSidebar";
import { AvatarPixel } from "@/components/ui/AvatarPixel";
import { BarraSegmentada } from "@/components/ui/BarraSegmentada";

// Só "Trilhas" tem rota nesta entrega; os demais itens ficam desabilitados.
const ITENS = [
  { rotulo: "Trilhas", href: "/trilhas" },
  { rotulo: "Desafio do dia", href: null },
  { rotulo: "Conquistas", href: null },
  { rotulo: "Configurações", href: null },
  { rotulo: "Adicionar conteúdo", href: null },
] as const;

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
  const progressoXp =
    perfil.xpDoProximoNivel > 0
      ? (perfil.xp / perfil.xpDoProximoNivel) * 100
      : 0;

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

        <div className="mt-6 flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-brand bg-panel-soft p-1">
            <AvatarPixel className="h-full w-full" />
          </span>
          <div className="min-w-0">
            <p className="titulo truncate text-sm text-ink-soft">{perfil.nome}</p>
            <p className="rotulo mt-1 text-brand">Nível {perfil.nivel}</p>
          </div>
        </div>

        <div className="mt-4">
          <BarraSegmentada
            valor={progressoXp}
            segmentos={12}
            expandida
            rotulo={`Progresso para o nível ${perfil.nivel + 1}`}
          />
          <p className="rotulo mt-2 text-ink-muted">
            {perfil.xp} / {perfil.xpDoProximoNivel} XP
          </p>
        </div>

        <nav aria-label="Navegação principal" className="mt-6">
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-col">
            {ITENS.map((item) => {
              const conteudo = (
                <>
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 shrink-0 ${
                      item.href ? "bg-ink-soft" : "bg-brand"
                    }`}
                  />
                  <span className="rotulo truncate">{item.rotulo}</span>
                </>
              );

              return (
                <li key={item.rotulo}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      aria-current="page"
                      className="flex items-center gap-3 border border-brand-strong bg-brand-strong px-3 py-2.5 text-ink-soft transition-colors hover:bg-brand"
                    >
                      {conteudo}
                    </Link>
                  ) : (
                    <span
                      aria-disabled="true"
                      title="Disponível em uma próxima entrega"
                      className="flex cursor-not-allowed items-center gap-3 border border-edge bg-panel-soft px-3 py-2.5 text-ink-muted/60"
                    >
                      {conteudo}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <AlternarSidebar
          modo="recolher"
          comRotulo
          className="mt-6 flex w-full items-center gap-3 border-edge bg-panel-soft px-3 py-2.5 text-ink-muted hover:border-brand hover:text-brand"
        />
      </div>
    </aside>
  );
}
