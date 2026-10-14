"use client";

import Link from "next/link";

import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { estaConcluida } from "@/lib/progresso";

// Próximo passo depois de concluir. Sempre na tela; só vira link quando o
// Context confirma a conclusão (inclusive quem volta a um exercício já feito).
// No último exercício vira "Voltar para a trilha", repetindo de propósito o
// link do fim da página: aqui é o próximo passo, lá é navegação fixa.

const BASE = "rotulo inline-flex items-center gap-3 border px-6 py-3";

export function BotaoProximoExercicio({
  trilhaSlug,
  exercicioSlug,
  proximoSlug,
}: {
  trilhaSlug: string;
  exercicioSlug: string;
  proximoSlug: string | null;
}) {
  const { chaves } = useProgresso();

  if (!estaConcluida(chaves, trilhaSlug, exercicioSlug)) {
    return (
      // Sem destino ainda. button com aria-disabled segue focável por teclado,
      // então quem não usa mouse descobre por que o avanço está bloqueado.
      <button
        type="button"
        aria-disabled="true"
        className={`${BASE} cursor-default border-edge-soft text-ink-dim`}
      >
        Conclua para avançar
      </button>
    );
  }

  const href =
    proximoSlug === null
      ? `/trilhas/${trilhaSlug}`
      : `/trilhas/${trilhaSlug}/exercicios/${proximoSlug}`;

  return (
    <Link
      href={href}
      className={`${BASE} border-brand text-brand transition-colors hover:bg-brand hover:text-ink-soft`}
    >
      {proximoSlug === null ? "Voltar para a trilha" : "Próximo exercício"}
      <span aria-hidden="true">→</span>
    </Link>
  );
}
