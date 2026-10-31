"use client";

import { useState } from "react";

import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { ErroApi, api } from "@/lib/api";

interface Props {
  trilhaSlug: string;
  exercicioSlug: string;
}

export function PainelFlashcard({ trilhaSlug, exercicioSlug }: Props) {
  const { recarregar } = useProgresso();
  const [resposta, setResposta] = useState<string | null>(null);
  const [ganho, setGanho] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [revelando, setRevelando] = useState(false);

  async function revelar() {
    if (revelando || resposta !== null) return;
    setRevelando(true);
    setAviso(null);
    try {
      const resultado = await api.revelarFlashcard(trilhaSlug, exercicioSlug);
      setResposta(resultado.resposta);
      if (!resultado.ja_concluido) {
        setGanho(
          `+${resultado.xp_ganho} XP${resultado.sequencia.aumentou ? " · +1 dia" : ""}`,
        );
      }
      recarregar();
    } catch (erro) {
      setAviso(
        erro instanceof ErroApi
          ? erro.message
          : "Não foi possível revelar a resposta.",
      );
    } finally {
      setRevelando(false);
    }
  }

  return (
    <section className="mt-6 border-2 border-edge bg-panel p-5 shadow-pixel-lg">
      <p className="font-body text-ink">
        Explique sua resposta em voz alta antes de revelar o cartão.
      </p>
      <button
        type="button"
        disabled={revelando || resposta !== null}
        onClick={() => void revelar()}
        className="rotulo mt-4 border border-brand-strong bg-brand-strong px-6 py-3 text-ink-soft disabled:opacity-50"
      >
        {revelando
          ? "Revelando…"
          : resposta === null
            ? "Revelar resposta"
            : "Resposta revelada"}
      </button>
      <p role="status" aria-live="polite" className="mt-4 font-body text-ink">
        {aviso ?? (resposta === null ? "" : `${resposta}${ganho ? ` ${ganho}` : ""}`)}
      </p>
    </section>
  );
}
