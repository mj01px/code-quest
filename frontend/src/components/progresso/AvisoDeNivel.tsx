"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useProgresso } from "@/components/progresso/ProvedorProgresso";

const TEMPO_NA_TELA = 3500;
const TEMPO_COM_EVOLUCAO = 7000;
const TEMPO_DA_SAIDA = 400;

interface Aviso {
  nivel: number;
  titulo: string;
  podeEvoluir: boolean;
}

export function AvisoDeNivel() {
  const { progresso } = useProgresso();
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [visivel, setVisivel] = useState(false);

  const anterior = useRef<{ criatura: number; nivel: number } | null>(null);

  useEffect(() => {
    if (progresso === null) return;

    const atual = {
      criatura: progresso.criatura.id,
      nivel: progresso.nivel.numero,
    };
    const antes = anterior.current;
    anterior.current = atual;

    if (antes === null) return;
    if (antes.criatura !== atual.criatura) return;
    if (atual.nivel <= antes.nivel) return;

    setAviso({
      nivel: atual.nivel,
      titulo: progresso.nivel.titulo,
      podeEvoluir: progresso.criatura.pode_evoluir,
    });
  }, [progresso]);

  useEffect(() => {
    if (aviso === null) return;

    const duracao = aviso.podeEvoluir ? TEMPO_COM_EVOLUCAO : TEMPO_NA_TELA;
    const entrada = requestAnimationFrame(() => setVisivel(true));
    const saida = setTimeout(() => setVisivel(false), duracao);
    const fim = setTimeout(() => setAviso(null), duracao + TEMPO_DA_SAIDA);

    return () => {
      cancelAnimationFrame(entrada);
      clearTimeout(saida);
      clearTimeout(fim);
    };
  }, [aviso]);

  if (aviso === null) return null;

  const sprite = progresso?.criatura.sprite ?? null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed right-0 bottom-0 z-50 flex justify-end px-4 sm:px-6"
    >
      <div
        className={`pointer-events-auto mb-6 flex items-center gap-4 border-2 border-brand bg-panel-deep px-5 py-4 shadow-[0_8px_0_0_var(--color-void),0_0_24px_rgba(0,0,0,0.6)] transition-all duration-300 motion-reduce:transition-none ${
          visivel ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
        }`}
      >
        {sprite ? (
          <Image
            src={sprite}
            alt=""
            width={44}
            height={44}
            className="animate-bob block h-[44px] w-[44px] shrink-0"
          />
        ) : null}

        <div className="flex flex-col gap-1.5">
          <span className="font-label text-[9px] tracking-[3px] text-ink-muted">
            SUBIU DE NÍVEL
          </span>
          <span className="font-display text-[15px] leading-none text-brand-light">
            NÍVEL {aviso.nivel}
            {aviso.titulo ? (
              <span className="text-success"> · {aviso.titulo}</span>
            ) : null}
          </span>
          {aviso.podeEvoluir ? (
            <Link
              href="/configuracoes"
              className="font-body text-base tracking-[1px] text-success underline-offset-4 hover:underline"
            >
              › pronto para evoluir
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}