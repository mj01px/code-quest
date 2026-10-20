"use client";

import { useEffect, useState } from "react";

import { segundosAteVirada } from "@/lib/desafios";
import { TIPO } from "@/lib/tipografia";

function relogio(segundos: number): string {
  return [Math.floor(segundos / 3600), Math.floor((segundos % 3600) / 60), segundos % 60]
    .map((parte) => String(parte).padStart(2, "0"))
    .join(":");
}

// A página fica em cache e o servidor não sabe a que horas ela vai ser lida:
// o tempo só aparece depois de montar, e até lá um marcador do mesmo tamanho
// segura o espaço sem divergir na hidratação.
export function ContadorExpiracao() {
  const [restante, setRestante] = useState<number | null>(null);

  useEffect(() => {
    const atualizar = () => setRestante(segundosAteVirada());
    atualizar();
    const intervalo = setInterval(atualizar, 1000);
    return () => clearInterval(intervalo);
  }, []);

  return (
    <div className="flex flex-col gap-2 border-2 border-brand-shadow bg-panel-deep px-5 py-3 shadow-pixel">
      <span aria-hidden="true" className={`${TIPO.etiqueta} text-ink-muted`}>
        EXPIRA EM
      </span>
      <span
        role="timer"
        aria-label="Tempo até os desafios de hoje trocarem"
        className="font-display text-[18px] leading-[1.5] text-brand-light"
      >
        {restante === null ? "--:--:--" : relogio(restante)}
      </span>
    </div>
  );
}
