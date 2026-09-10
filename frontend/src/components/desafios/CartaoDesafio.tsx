import Link from "next/link";

import { SeloBonusXp } from "@/components/gamificacao/SeloBonusXp";
import { BadgeDificuldade } from "@/components/ui/Badge";
import { IconeCheck } from "@/components/ui/Icone";
import type { Desafio } from "@/lib/desafios";

export function CartaoDesafio({
  desafio,
  posicao,
  concluido,
}: {
  desafio: Desafio;
  posicao: number;
  concluido: boolean;
}) {
  return (
    <li
      className="animate-surgir"
      style={{ animationDelay: `${(posicao - 1) * 90}ms` }}
    >
      <div
        className={`group flex flex-col gap-4 border bg-panel p-5 transition-[border-color,transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-pixel sm:p-6 ${
          concluido ? "border-success/60" : "border-edge hover:border-brand"
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span
            aria-hidden="true"
            className="titulo flex h-10 w-10 shrink-0 items-center justify-center border border-brand-shadow text-xs text-brand transition-colors group-hover:border-brand"
          >
            {String(posicao).padStart(2, "0")}
          </span>
          <span className="rotulo text-ink-muted">
            {desafio.trilhaNome} · {desafio.moduloTitulo}
          </span>
          {concluido ? (
            <span className="rotulo ml-auto inline-flex items-center gap-2 text-success">
              <IconeCheck className="h-3.5 w-3.5" />
              Concluído
            </span>
          ) : null}
        </div>

        <div>
          <h3 className="titulo text-sm text-ink-soft">
            <span className="sr-only">Desafio {posicao}: </span>
            {desafio.titulo}
          </h3>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <BadgeDificuldade
              dificuldade={desafio.dificuldade}
              rotulo={desafio.dificuldadeLabel}
            />
            <span className="rotulo text-ink-muted">{desafio.tipoLabel}</span>
            <span className="rotulo text-brand">+{desafio.xp} XP</span>
            <SeloBonusXp trilhaSlug={desafio.trilhaSlug} />
          </div>
        </div>

        <Link
          href={desafio.href}
          className="rotulo inline-flex w-fit items-center gap-2 border border-brand-strong bg-brand-strong px-6 py-3 text-ink-soft transition-[background-color,transform] duration-150 hover:translate-x-0.5 hover:bg-brand"
        >
          {concluido ? "Revisar fase" : "Encarar desafio"}
          <span aria-hidden="true">&rsaquo;</span>
        </Link>
      </div>
    </li>
  );
}
