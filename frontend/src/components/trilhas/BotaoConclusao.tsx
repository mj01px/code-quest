"use client";

import { useRef, useState } from "react";

import { IconeCheck } from "@/components/ui/Icone";
import { ErroApi, api } from "@/lib/api";
import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { estaConcluida } from "@/lib/progresso";

// Botão de concluir fase. Sessão via cookie httpOnly.
// Estado inicial vem do Context; após POST chama recarregar() pra atualizar XP e conclusões.

type Estado = "inicial" | "enviando" | "concluido";

function mensagemNeutra(erro: unknown): string {
  if (!(erro instanceof ErroApi)) {
    return "Não foi possível registrar agora. Tente de novo.";
  }
  if (erro.status === 401) return "Entre na sua conta para registrar o progresso.";
  if (erro.naoEncontrado) return "Este exercício não está disponível para conclusão.";
  return erro.message;
}

export function BotaoConclusao({
  trilhaSlug,
  faseSlug,
}: {
  trilhaSlug: string;
  faseSlug: string;
}) {
  const { chaves, carregando, recarregar } = useProgresso();
  const [estado, setEstado] = useState<Estado>("inicial");
  const [xpGanho, setXpGanho] = useState<number | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const emVoo = useRef(false); // ref pra evitar POST duplo no mesmo tick

  const concluido =
    estado === "concluido" || estaConcluida(chaves, trilhaSlug, faseSlug);
  const bloqueado = carregando || estado === "enviando" || concluido;

  async function concluir() {
    if (emVoo.current || bloqueado) return;
    emVoo.current = true;

    setEstado("enviando");
    setAviso(null);

    try {
      const resultado = await api.concluirExercicio(trilhaSlug, faseSlug);
      // Repetição volta ja_concluido: true — marca feito sem anunciar XP de novo.
      setXpGanho(resultado.ja_concluido ? null : resultado.xp_ganho);
      setEstado("concluido");
      // Atualiza XP, nível e conclusões de uma vez.
      recarregar();
    } catch (erro) {
      // Sem retry — aluno decide se tenta de novo.
      setEstado("inicial");
      setAviso(mensagemNeutra(erro));
    } finally {
      emVoo.current = false;
    }
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-4">
      <button
        type="button"
        aria-pressed={concluido}
        // aria-disabled mantém foco pro leitor de tela (disabled perde).
        aria-disabled={bloqueado}
        aria-busy={carregando || estado === "enviando"}
        // void pra não deixar promessa solta.
        onClick={() => {
          void concluir();
        }}
        className={`rotulo inline-flex items-center gap-3 border px-6 py-3 transition-colors ${
          concluido
            ? "cursor-default border-success text-success"
            : bloqueado
              ? "cursor-default border-brand-strong bg-brand-strong text-ink-soft opacity-70"
              : "cursor-pointer border-brand-strong bg-brand-strong text-ink-soft hover:bg-brand"
        }`}
      >
        <IconeCheck className="h-3.5 w-3.5" />
        {concluido
          ? "Concluído"
          : estado === "enviando"
            ? "Registrando…"
            : "Marcar como concluído"}
      </button>

      {/* Região viva sempre presente — leitor de tela precisa já estar observando. */}
      <p
        role="status"
        aria-live="polite"
        className={`rotulo empty:hidden ${
          aviso ? "text-ink-muted" : "text-success"
        }`}
      >
        {aviso ?? (xpGanho !== null ? `+${xpGanho} XP` : "")}
      </p>
    </div>
  );
}
