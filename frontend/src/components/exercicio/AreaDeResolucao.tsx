"use client";

import { useEffect, useState } from "react";

import { PainelDeCodigo } from "@/components/exercicio/PainelDeCodigo";
import { BotaoConclusao } from "@/components/trilhas/BotaoConclusao";
import { api } from "@/lib/api";
import type { EspecificacaoDeCodigo } from "@/lib/types";

// exercício com espec ganha o editor, o resto segue com o botao de concluir
export function AreaDeResolucao({
  trilhaSlug,
  exercicioSlug,
}: {
  trilhaSlug: string;
  exercicioSlug: string;
}) {
  const [especificacao, setEspecificacao] =
    useState<EspecificacaoDeCodigo | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let vivo = true;

    api
      .especificacaoDeCodigo(trilhaSlug, exercicioSlug)
      .then((dados) => {
        if (vivo) setEspecificacao(dados);
      })
      .catch(() => {
        if (vivo) setEspecificacao(null);
      })
      .finally(() => {
        if (vivo) setCarregando(false);
      });

    return () => {
      vivo = false;
    };
  }, [trilhaSlug, exercicioSlug]);

  if (carregando) {
    return (
      <p className="mt-6 font-label text-xs text-ink-muted">carregando...</p>
    );
  }

  if (especificacao) {
    return (
      <PainelDeCodigo
        trilhaSlug={trilhaSlug}
        exercicioSlug={exercicioSlug}
        especificacao={especificacao}
      />
    );
  }

  return (
    <>
      <BotaoConclusao trilhaSlug={trilhaSlug} faseSlug={exercicioSlug} />
      <p className="mt-6 border border-edge bg-panel p-4 text-xs leading-relaxed text-ink-muted">
        O terminal integrado para resolver e submeter este exercício chega em
        uma próxima entrega.
      </p>
    </>
  );
}