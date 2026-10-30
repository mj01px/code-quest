"use client";

import { useEffect, useState } from "react";

import { PainelDeCodigo } from "@/components/exercicio/PainelDeCodigo";
import { PainelDeAlternativas } from "@/components/exercicio/PainelDeAlternativas";
import { PainelFlashcard } from "@/components/exercicio/PainelFlashcard";
import { BotaoConclusao } from "@/components/trilhas/BotaoConclusao";
import { ErroApi, api } from "@/lib/api";
import type {
  AlternativaExercicio,
  EspecificacaoDeCodigo,
  TipoExercicio,
} from "@/lib/types";

function notaDaFalha(status: number | null): string {
  if (status === 404) {
    return "O terminal integrado para resolver e submeter este exercício chega em uma próxima entrega.";
  }
  if (status === 403) {
    return "Seu nível de acesso não inclui resolver exercícios com código. Fale com um administrador.";
  }
  return "Não foi possível carregar o editor agora. Recarregue a página.";
}

export function AreaDeResolucao({
  trilhaSlug,
  exercicioSlug,
  tipo,
  alternativas = [],
}: {
  trilhaSlug: string;
  exercicioSlug: string;
  tipo?: TipoExercicio;
  alternativas?: AlternativaExercicio[];
}) {
  const [especificacao, setEspecificacao] =
    useState<EspecificacaoDeCodigo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [falha, setFalha] = useState<number | null>(null);

  useEffect(() => {
    if (tipo && tipo !== "CODIGO") return;
    let vivo = true;

    api
      .especificacaoDeCodigo(trilhaSlug, exercicioSlug)
      .then((dados) => {
        if (vivo) setEspecificacao(dados);
      })
      .catch((erro: unknown) => {
        if (!vivo) return;
        setEspecificacao(null);
        setFalha(erro instanceof ErroApi ? erro.status : null);
      })
      .finally(() => {
        if (vivo) setCarregando(false);
      });

    return () => {
      vivo = false;
    };
  }, [trilhaSlug, exercicioSlug, tipo]);

  if (tipo === "ALTERNATIVA") {
    return (
      <PainelDeAlternativas
        trilhaSlug={trilhaSlug}
        exercicioSlug={exercicioSlug}
        alternativas={alternativas}
      />
    );
  }
  if (tipo === "FLASHCARD") {
    return (
      <PainelFlashcard trilhaSlug={trilhaSlug} exercicioSlug={exercicioSlug} />
    );
  }
  if (tipo === "TEORICO") {
    return <BotaoConclusao trilhaSlug={trilhaSlug} faseSlug={exercicioSlug} />;
  }

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
        {notaDaFalha(falha)}
      </p>
    </>
  );
}
