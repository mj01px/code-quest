"use client";

import { useState } from "react";

import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { ErroApi, api } from "@/lib/api";
import { estaConcluida } from "@/lib/progresso";
import type { AlternativaExercicio } from "@/lib/types";

interface Props {
  trilhaSlug: string;
  exercicioSlug: string;
  alternativas: AlternativaExercicio[];
}

export function PainelDeAlternativas({
  trilhaSlug,
  exercicioSlug,
  alternativas,
}: Props) {
  const { chaves, recarregar } = useProgresso();
  const [escolha, setEscolha] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [explicacao, setExplicacao] = useState<string | null>(null);
  const [acertou, setAcertou] = useState(false);
  const [corretaId, setCorretaId] = useState<number | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ganho, setGanho] = useState<string | null>(null);
  const concluido = acertou || estaConcluida(chaves, trilhaSlug, exercicioSlug);

  async function conferir(alternativaId: number) {
    if (enviando || concluido) return;
    setEscolha(alternativaId);
    setEnviando(true);
    setAviso(null);
    setExplicacao(null);
    setCorretaId(null);
    try {
      const resultado = await api.concluirAlternativa(
        trilhaSlug,
        exercicioSlug,
        alternativaId,
      );
      setExplicacao(resultado.explicacao);
      setAcertou(resultado.aprovado);
      setCorretaId(
        resultado.aprovado ? alternativaId : resultado.alternativa_correta_id,
      );
      if (resultado.aprovado) {
        setGanho(
          resultado.ja_concluido
            ? null
            : `+${resultado.xp_ganho} XP${resultado.sequencia.aumentou ? " · +1 dia" : ""}`,
        );
        recarregar();
      }
    } catch (erro) {
      setAviso(
        erro instanceof ErroApi
          ? erro.message
          : "Não foi possível conferir a resposta.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="mt-6 border-2 border-edge bg-panel p-5 shadow-pixel-lg">
      <fieldset className="flex flex-col gap-3" disabled={enviando || concluido}>
        <legend className="mb-4 font-display text-sm text-ink">
          Escolha uma alternativa
        </legend>
        {alternativas.map((alternativa) => {
          const correta = corretaId === alternativa.id;
          const errada = explicacao !== null && !acertou && escolha === alternativa.id;
          const selecionada = escolha === alternativa.id;
          const borda = correta
            ? "border-success bg-success/10 text-success"
            : errada
              ? "border-danger bg-danger/10 text-danger"
              : selecionada
                ? "border-brand bg-brand-void text-ink"
                : "border-edge bg-panel-soft text-ink-body hover:border-edge-soft";

          return (
            <label
              key={alternativa.id}
              className={`flex min-h-16 items-center gap-4 border-2 px-4 py-3 font-body text-base transition-colors focus-within:outline-2 focus-within:outline-brand-light ${borda} ${
                enviando || concluido ? "cursor-default" : "cursor-pointer"
              }`}
            >
              <input
                type="radio"
                name="alternativa"
                value={alternativa.id}
                aria-label={alternativa.texto}
                checked={selecionada}
                onChange={() => void conferir(alternativa.id)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`flex h-5 w-5 shrink-0 items-center justify-center border-2 ${
                  correta
                    ? "border-success"
                    : errada
                      ? "border-danger"
                      : "border-brand-light"
                }`}
              >
                {selecionada && (
                  <span
                    className={`h-2 w-2 ${
                      correta
                        ? "bg-success"
                        : errada
                          ? "bg-danger"
                          : "bg-brand-light"
                    }`}
                  />
                )}
              </span>
              <span className="flex-1">{alternativa.texto}</span>
              {(correta || errada) && (
                <span className="font-label text-[10px] tracking-[1px]">
                  {correta ? "CORRETA" : "INCORRETA"}
                </span>
              )}
            </label>
          );
        })}
      </fieldset>
      <p role="status" aria-live="polite" className="mt-5 font-body text-ink">
        {aviso ??
          (explicacao
            ? `${acertou ? "Resposta correta." : "Resposta incorreta."} ${explicacao}`
            : concluido
              ? "Exercício concluído."
              : "")}
        {ganho ? ` ${ganho}` : ""}
      </p>
    </section>
  );
}
