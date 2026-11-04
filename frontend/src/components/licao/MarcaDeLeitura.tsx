"use client";

import { useEffect, useRef, useState } from "react";

import { useProgresso } from "@/components/progresso/ProvedorProgresso";
import { IconeCheck } from "@/components/ui/Icone";
import { api, temSessao } from "@/lib/api";
import { chaveDaEtapa } from "@/lib/progresso";

export function MarcaDeLeitura({
  trilhaSlug,
  aulaSlug,
}: {
  trilhaSlug: string;
  aulaSlug: string;
}) {
  const { chavesDeEtapas, recarregar } = useProgresso();
  const alvo = useRef<HTMLDivElement>(null);
  const enviada = useRef(false);
  const [falhou, setFalhou] = useState(false);
  const lida = chavesDeEtapas.has(chaveDaEtapa(trilhaSlug, aulaSlug, "LEITURA"));

  useEffect(() => {
    const elemento = alvo.current;
    if (lida || elemento === null || typeof IntersectionObserver === "undefined") return;

    const observador = new IntersectionObserver((entradas) => {
      if (!entradas.some((entrada) => entrada.isIntersecting)) return;
      if (enviada.current || !temSessao()) return;
      enviada.current = true;
      observador.disconnect();
      api
        .concluirLeitura(trilhaSlug, aulaSlug)
        .then(() => recarregar())
        .catch(() => {
          enviada.current = false;
          setFalhou(true);
        });
    });
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [lida, trilhaSlug, aulaSlug, recarregar]);

  return (
    <div ref={alvo} className="mt-4 min-h-6">
      {lida ? (
        <p
          role="status"
          className="m-0 flex items-center gap-2 font-label text-[11px] tracking-[2px] text-success uppercase"
        >
          <IconeCheck className="h-3.5 w-3.5" />
          Leitura concluída
        </p>
      ) : falhou ? (
        <p role="alert" className="m-0 font-body text-base text-danger">
          Não foi possível registrar a leitura agora. Recarregue a página para tentar de novo.
        </p>
      ) : null}
    </div>
  );
}
