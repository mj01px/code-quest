"use client";

import type { ReactNode } from "react";

import { BarraDeFoco } from "@/components/layout/BarraDeFoco";
import { LinkDeAcao } from "@/components/licao/LinkDeAcao";
import { usePassosDaTrilha } from "@/components/progresso/usePassosDaTrilha";
import { IconeCadeado } from "@/components/ui/Icone";
import { chaveDoPasso, rotaDoPasso } from "@/lib/passos";
import type { PassoDaTrilha } from "@/lib/types";

export function GuardaDeEtapa({
  trilhaSlug,
  tipo,
  aulaSlug,
  exercicioSlug = null,
  children,
}: {
  trilhaSlug: string;
  tipo: PassoDaTrilha["tipo"];
  aulaSlug: string;
  exercicioSlug?: string | null;
  children: ReactNode;
}) {
  const { estado, proximo, carregado } = usePassosDaTrilha(trilhaSlug);
  const bloqueado =
    carregado &&
    estado(chaveDoPasso(tipo, aulaSlug, exercicioSlug)) === "bloqueado";

  if (!bloqueado) return <>{children}</>;

  return (
    <div className="flex min-h-dvh flex-col">
      <BarraDeFoco sairHref={`/trilhas/${trilhaSlug}`} />
      <main className="flex flex-1 items-center justify-center px-4 py-14">
        <section
          aria-label="Etapa bloqueada"
          className="flex w-full max-w-xl flex-col items-start gap-5 border-[3px] border-edge-soft bg-panel p-8"
        >
          <span className="flex items-center gap-3 font-label text-[12px] tracking-[3px] text-ink-muted uppercase">
            <IconeCadeado className="h-4 w-4" />
            Etapa bloqueada
          </span>
          <p className="m-0 font-body text-xl leading-[1.6] text-ink-soft">
            {proximo
              ? `Conclua “${proximo.titulo}” para liberar esta etapa.`
              : "Conclua a etapa anterior para liberar esta."}
          </p>
          <div className="flex flex-wrap gap-3">
            {proximo ? (
              <LinkDeAcao href={rotaDoPasso(trilhaSlug, proximo)}>
                Ir para a etapa liberada
              </LinkDeAcao>
            ) : null}
            <LinkDeAcao href={`/trilhas/${trilhaSlug}`} variante="secundario">
              Voltar para a trilha
            </LinkDeAcao>
          </div>
        </section>
      </main>
    </div>
  );
}
