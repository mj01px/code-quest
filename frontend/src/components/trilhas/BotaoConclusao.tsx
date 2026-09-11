"use client";

import { useRef, useState } from "react";

import { IconeCheck } from "@/components/ui/Icone";
import { ErroApi, api } from "@/lib/api";
import { estaConcluida, useConclusoes } from "@/lib/progresso";

// Client component porque tem estado de clique e chamada autenticada. A sessão
// viaja no cookie httpOnly: nada de token no JavaScript.
//
// O estado inicial vem do servidor: o botão pede as conclusões desta trilha e
// procura o próprio slug na lista. Antes isso não existia e o botão sempre
// nascia "inicial", mesmo para quem já tinha feito a fase.

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
  const { chaves, carregando } = useConclusoes(trilhaSlug);
  const [estado, setEstado] = useState<Estado>("inicial");
  const [xpGanho, setXpGanho] = useState<number | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // O trinco é um ref, e não o estado: dois cliques no mesmo tick leem o mesmo
  // `estado` antes do re-render e os dois disparariam o POST. O ref muda na
  // hora.
  const emVoo = useRef(false);

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
      // Repetição volta como 200 com ja_concluido: true. É sucesso silencioso:
      // marca como feito e não anuncia XP que não foi creditado de novo.
      setXpGanho(resultado.ja_concluido ? null : resultado.xp_ganho);
      setEstado("concluido");
    } catch (erro) {
      // Sem retry automático: o aluno decide se tenta outra vez.
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
        // `aria-disabled` e não `disabled`: um botão desabilitado perde o foco,
        // e o leitor de tela cala justamente sobre o elemento que acabou de
        // mudar. Assim ele continua focável e o clique é recusado no handler.
        aria-disabled={bloqueado}
        aria-busy={carregando || estado === "enviando"}
        // Handler async envolvido: `onClick={concluir}` deixaria uma promessa
        // solta, sem ninguém para observar uma rejeição inesperada.
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

      {/* Região viva presente desde o primeiro render. Um `role="status"` que só
          entra no DOM junto com o texto costuma não ser anunciado: o leitor
          precisa já estar observando a região quando ela muda. XP e aviso são
          mutuamente exclusivos, então uma região basta. */}
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
