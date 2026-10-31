"use client";

import { useState } from "react";

import type { Flashcard } from "@/lib/types";

// Card de frente e verso do protótipo de flashcards: borda roxa na pergunta,
// verde na resposta, e o card inteiro é o botão de virar.
export function CartaoFlashcard({ card }: { card: Flashcard }) {
  const [virado, setVirado] = useState(false);

  return (
    <button
      type="button"
      aria-pressed={virado}
      onClick={() => setVirado((v) => !v)}
      className={`flex min-h-[180px] w-full cursor-pointer flex-col justify-center gap-4 border-[3px] p-6 text-left transition-colors duration-150 ${
        virado
          ? "border-success bg-panel-soft shadow-[0_0_0_3px_var(--color-brand-void),8px_8px_0_rgba(0,0,0,0.7)]"
          : "border-brand bg-panel shadow-[0_0_0_3px_var(--color-brand-void),0_0_0_6px_rgba(168,85,247,0.18),8px_8px_0_rgba(0,0,0,0.7)] hover:border-brand-pale"
      }`}
    >
      <span
        className={`flex items-center gap-3 font-label text-[12px] tracking-[3px] ${
          virado ? "text-success" : "text-brand-light"
        }`}
      >
        <span
          aria-hidden="true"
          className={`h-3 w-3 ${virado ? "bg-success" : "bg-brand"}`}
        />
        {virado ? "RESPOSTA" : "PERGUNTA"}
      </span>
      <span className="font-display text-[13px] leading-[1.8] tracking-[1px] break-words whitespace-pre-wrap text-ink [text-shadow:3px_3px_0_var(--color-brand-dark)]">
        {virado ? card.resposta : card.pergunta}
      </span>
      <span className="flex items-center gap-2 font-terminal text-xl tracking-[1px] text-ink-muted">
        {virado ? "> VER PERGUNTA" : "> VIRAR CARD"}
        <span
          aria-hidden="true"
          className="inline-block h-4 w-2.5 bg-brand motion-safe:animate-blink"
        />
      </span>
    </button>
  );
}

export function BaralhoFlashcards({ cards }: { cards: Flashcard[] }) {
  if (cards.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      <span className="font-label text-[11px] tracking-[2px] text-brand-light uppercase">
        Flashcards · {cards.length}
      </span>
      <ul className="m-0 grid list-none gap-5 p-0 sm:grid-cols-2">
        {cards.map((card) => (
          <li key={card.id}>
            <CartaoFlashcard card={card} />
          </li>
        ))}
      </ul>
    </div>
  );
}
