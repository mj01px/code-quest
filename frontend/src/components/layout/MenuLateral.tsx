"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Item sem href fica explicitamente inativo, em vez de virar link quebrado.
export const ITENS = [
  { rotulo: "Trilhas", href: "/trilhas" },
  { rotulo: "Desafio do dia", href: "/desafios" },
  { rotulo: "Conquistas", href: null },
  { rotulo: "Configurações", href: null },
  { rotulo: "Adicionar conteúdo", href: null },
] as const;

/** O item da rota aberta, incluindo as rotas filhas dela. */
function estaAtivo(href: string, caminho: string | null): boolean {
  if (caminho === null) return false;
  return caminho === href || caminho.startsWith(`${href}/`);
}

export function MenuLateral() {
  // Fora do roteador (nos testes) vem null, e nenhum item fica marcado.
  const caminho = usePathname();

  return (
    <nav aria-label="Navegação principal" className="mt-6">
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-col">
        {ITENS.map((item) => {
          const ativo = item.href !== null && estaAtivo(item.href, caminho);

          const conteudo = (
            <>
              <span
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 transition-transform ${
                  item.href ? "bg-ink-soft" : "bg-brand"
                } ${ativo ? "scale-125" : ""}`}
              />
              <span className="rotulo truncate">{item.rotulo}</span>
            </>
          );

          return (
            <li key={item.rotulo}>
              {item.href ? (
                <Link
                  href={item.href}
                  aria-current={ativo ? "page" : undefined}
                  className={`flex items-center gap-3 border px-3 py-2.5 text-ink-soft transition-[background-color,transform] duration-150 hover:translate-x-0.5 hover:bg-brand ${
                    ativo
                      ? "border-brand-strong bg-brand-strong"
                      : "border-edge bg-panel-soft"
                  }`}
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
  );
}
