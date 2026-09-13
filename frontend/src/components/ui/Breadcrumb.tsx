import Link from "next/link";

import { Fragment } from "react";

export interface Passo {
  rotulo: string;
  href?: string;
}

export function Breadcrumb({ passos }: { passos: Passo[] }) {
  return (
    <nav aria-label="Trilha de navegação">
      <ol className="rotulo flex flex-wrap items-center gap-2 text-ink-muted">
        <li aria-hidden="true">&lsaquo;</li>
        {passos.map((passo, indice) => (
          <Fragment key={passo.rotulo}>
            {indice > 0 ? (
              <li aria-hidden="true" className="text-brand-shadow">
                /
              </li>
            ) : null}
            <li>
              {passo.href ? (
                <Link href={passo.href} className="hover:text-brand">
                  {passo.rotulo}
                </Link>
              ) : (
                // O passo atual em roxo claro: é ele que diz onde o aluno está.
                <span aria-current="page" className="text-brand-light">
                  {passo.rotulo}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
