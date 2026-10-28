"use client";

import { useState } from "react";

import type { Alternativa, Questao } from "@/lib/types";

const LETRAS: Alternativa[] = ["A", "B", "C", "D"];

// Quiz de revisão: um clique escolhe e trava as alternativas. A certa fica
// verde, a escolhida errada fica vermelha, e o texto repete o resultado para
// quem não distingue as cores. Não dá XP.
export function QuizQuestao({ questao }: { questao: Questao }) {
  const [escolhida, setEscolhida] = useState<Alternativa | null>(null);
  const acertou = escolhida === questao.resposta_correta;

  function cor(letra: Alternativa): string {
    if (escolhida === null) {
      return "cursor-pointer border-edge-soft bg-panel hover:border-brand hover:bg-panel-soft";
    }
    if (letra === questao.resposta_correta) return "border-success bg-panel-soft text-success";
    if (letra === escolhida) return "border-danger bg-panel-soft text-danger";
    return "border-edge bg-panel opacity-60";
  }

  return (
    <div className="flex flex-col gap-4 border-2 border-edge bg-panel-deep p-5">
      <p className="m-0 font-body text-base leading-[1.6] tracking-[1px] whitespace-pre-wrap text-ink">
        {questao.enunciado}
      </p>
      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
        {LETRAS.map((letra, i) => (
          <li key={letra}>
            <button
              type="button"
              disabled={escolhida !== null}
              aria-pressed={escolhida === letra}
              onClick={() => setEscolhida(letra)}
              className={`flex min-h-11 w-full items-center gap-3 border-2 px-4 py-3 text-left font-body text-base text-ink-body transition-colors duration-150 disabled:cursor-default ${cor(letra)}`}
            >
              <span className="font-label text-[12px] tracking-[2px]">{letra}</span>
              {questao.opcoes[i]}
            </button>
          </li>
        ))}
      </ul>
      {escolhida !== null ? (
        <p
          role="status"
          className={`m-0 font-label text-[12px] tracking-[2px] ${acertou ? "text-success" : "text-danger"}`}
        >
          {acertou ? "> CORRETO!" : `> ERRADO. A CERTA É ${questao.resposta_correta}.`}
        </p>
      ) : null}
    </div>
  );
}
