"use client";

import { useEffect, useState } from "react";

import { segundosAteVirada } from "@/lib/desafios";
import { TIPO } from "@/lib/tipografia";

function relogio(segundos: number): string {
  return [
    Math.floor(segundos / 3600),
    Math.floor((segundos % 3600) / 60),
    segundos % 60,
  ]
    .map((parte) => String(parte).padStart(2, "0"))
    .join(":");
}

export function ContadorExpiracao({
  rotulo = "PRÓXIMO EM",
}: {
  rotulo?: string;
}) {
  const [restante, setRestante] = useState<number | null>(null);

  useEffect(() => {
    const atualizar = () => setRestante(segundosAteVirada());
    atualizar();
    const intervalo = setInterval(atualizar, 1000);
    return () => clearInterval(intervalo);
  }, []);

  return (
    <div className="flex items-center gap-3.5">
      <span aria-hidden="true" className={`${TIPO.etiqueta} text-ink-muted`}>
        {rotulo}
      </span>
      <span
        role="timer"
        aria-label="Tempo até o próximo desafio"
        className="font-display text-[16px] leading-[1.5] tracking-[2px] text-brand-light"
      >
        {restante === null ? "--:--:--" : relogio(restante)}
      </span>
    </div>
  );
}
