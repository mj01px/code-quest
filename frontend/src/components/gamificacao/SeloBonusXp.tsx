"use client";

import { useEffect, useState } from "react";

import { api, temSessao } from "@/lib/api";
import { bonusDaTrilha, formatarMultiplicador } from "@/lib/bonus";
import type { BonusXp } from "@/lib/types";

// A página da trilha é estática e igual para todo mundo; o bônus é de quem
// está logado. Por isso ele entra pelo cliente, depois da hidratação, e some
// por completo para visitante, para quem ainda não escolheu criatura e para
// trilha sem afinidade. Falha de rede também some: é um adorno, não conteúdo.

export function SeloBonusXp({ trilhaSlug }: { trilhaSlug: string }) {
  const [bonus, setBonus] = useState<BonusXp | null>(null);

  useEffect(() => {
    if (!temSessao()) return;

    let ativo = true;
    (async () => {
      try {
        const lista = await api.meusBonus();
        if (ativo) setBonus(bonusDaTrilha(lista, trilhaSlug));
      } catch {
        /* sem bônus na tela é o mesmo que sem bônus */
      }
    })();

    return () => {
      ativo = false;
    };
  }, [trilhaSlug]);

  if (!bonus) return null;

  const multiplicador = formatarMultiplicador(bonus.multiplicador);

  return (
    <span
      className="rotulo animate-pulso inline-flex items-center gap-2 border border-brand bg-brand-shadow/30 px-2.5 py-1 text-brand-light"
      title={`${bonus.criatura_nome} tem afinidade com esta trilha.`}
    >
      <span aria-hidden="true" className="h-2 w-2 shrink-0 bg-brand" />
      <span>
        {multiplicador}x XP nesta trilha
        <span className="sr-only"> com {bonus.criatura_nome}</span>
      </span>
    </span>
  );
}
